#!/usr/bin/env /usr/local/bin/node
"use strict";

const axios = require("axios");
const xmlParser = require("fast-xml-parser");
const bitbar = require("bitbar");
const fs = require("fs");
const path = require("path");

const cookieFilePath = path.join(__dirname, "meta", "cookie.txt");

if (!fs.existsSync(cookieFilePath)) {
  fs.mkdirSync("meta");
}

var retryCounter = 0;

function getOptions(type = "init", cookies) {
  if (type === "main") {
    return {
      url: "http://192.168.1.1/api/monitoring/status",
      method: "get",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11",
        Cookie: `${cookies}`,
        Connection: "keep-alive",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "http://192.168.1.1/html/home.html",
        Host: "192.168.1.1",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      },
    };
  }

  return {
    url: "http://192.168.1.1/html/home.html",
    method: "get",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11",
      Connection: "keep-alive",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "http://192.168.1.1/html/home.html",
      Host: "192.168.1.1",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    },
  };
}

async function fetchCookies() {
  try {
    const response = await axios(getOptions("init"));
    //console.log("response",response)
    if (response.headers["set-cookie"]) {
      let setCookies = response.headers["set-cookie"];
      fs.writeFile(cookieFilePath, setCookies, function (err) {
        if (err) throw err;
      });
      return setCookies;
    }
  } catch (error) {
    console.debug(error);
    process.exit(10);
  }
}

async function loadCookies() {
  let fileExists;
  try {
    fileExists = fs.existsSync(cookieFilePath);
  } catch (error) {
    fileExists = false;
  }
  if (fileExists) {
    let cookies = fs.readFileSync(cookieFilePath, { encoding: "utf8" });
    if (cookies) {
      return cookies;
    }
  }
  let newCookies = await fetchCookies();
  return newCookies;
}

async function main(cookies) {
  try {
    const response = await axios(getOptions("main", cookies));
    let jsonRes = xmlParser.parse(response.data);
    if (jsonRes.response) {
      retryCounter = 0;
      console.clear();
      bitbar([
        {
          text: `🔋${jsonRes.response.BatteryLevel} 📶${
            jsonRes.response.SignalIcon
          } ${jsonRes.response.CurrentNetworkType === 19 ? "🚀" : "🐢"}`,
          color: bitbar.darkMode ? "white" : "black",
        },
      ]);
    } else {
      if (retryCounter < 5) {
        retryCounter++;
        let newCookies = await fetchCookies();
        if (newCookies) {
          main(newCookies);
        }
      } else {
        console.debug("Failed to fetch data");
        process.exit(10);
      }
    }
  } catch (error) {
    console.debug(error);
  }
}

async function init() {
  let cookies = await loadCookies();
  if (cookies) {
    main(cookies);
    return;
  }
}
init();
