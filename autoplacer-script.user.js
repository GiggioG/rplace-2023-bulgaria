'use strict';
// ==UserScript==
// @name         r/bulgaria Auto-placer for r/place
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @version      1.0.4
// @description  Help bulgaria with r/place.
// @author       Gigo_G
// @match        https://garlic-bread.reddit.com/embed?*
// @require	     https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/autoplacer-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/autoplacer-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant	     GM.xmlHttpRequest
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

const host = "r-place-2022-bulgaria.herokuapp.com";
let canvas, ctx;

async function getColorData(url) {
    var img = await loadImage(url);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    let data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data;
    let arr = [];
    for (let i = 0; i < data.length; i += 4) {
        arr.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
    return {
        data: arr,
        w: img.naturalWidth,
        h: img.naturalHeight
    };
}

function getCanvasData(x, y, w, h) {
    let data = ctx.getImageData(x, y, w, h).data;
    let arr = [];
    for (let i = 0; i < data.length; i += 4) {
        arr.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
    return {
        data: arr,
        w, h
    };
}

let colorDict = {};
let reverseColorDict = {};
let reverseColorNameDict = {};

function colorId(rgba) {
    let key = `${rgba[0]},${rgba[1]},${rgba[2]}`;
    return colorDict[key];
}

async function getTemplateConflicts(temp, x, y) {
    let imageData = await getColorData(`https://${host}/thumb?imgname=${temp}`);
    const { w, h } = imageData;
    let canvasData = getCanvasData(x, y, w, h);

    let conflicts = [];
    for (let i = 0; i < w * h; i++) {
        if (imageData.data[i][3] == 0) { continue; }
        if (imageData.data[i][0] != canvasData.data[i][0] ||
            imageData.data[i][1] != canvasData.data[i][1] ||
            imageData.data[i][2] != canvasData.data[i][2]) {
            let cx = (i % w) + x;
            let cy = Math.floor(i / w) + y;

            let colId = colorId(imageData.data[i]);
            conflicts.push({
                x: cx,
                y: cy,
                col: colId,
                temp
            });
        }
    }
    return conflicts;
}

function makeRequest(url) {
    return new Promise(function (resolve, reject) {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "json",
            onload: (response) => {
                resolve(JSON.parse(response.responseText));
            },
            onerror: reject
        });
    });
}

function makeRequestText(url) {
    return new Promise(function (resolve, reject) {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "text",
            onload: (response) => {
                resolve(response.responseText);
            },
            onerror: reject
        });
    });
}

function loadImage(url) {
    return new Promise(function (resolve, reject) {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "blob",
            onload: async response => {
                var img = new Image();
                img.onload = function () {
                    resolve(img);
                }

                let reader = new FileReader();
                reader.readAsDataURL(response.response);
                await new Promise(resolve => reader.onload = function () { resolve() });
                img.src = reader.result;
            },
            onerror: reject
        });
    });
}

async function getAccessToken() {
    const usingOldReddit = window.location.href.includes('new.reddit.com');
    const url = usingOldReddit ? 'https://new.reddit.com/r/place/' : 'https://www.reddit.com/r/place/';

    const resp = await makeRequestText(url);
    return resp.match(/"accessToken"\s*:\s*"([\w-\.]+)"/)[1];
}

let token;

function getCanvasIndex(x, y){
    let canvasIndex;
    if(y < 500){
        y += 500;
        canvasIndex = 1;
    }else if(y >= 500){
        y -= 500;
        canvasIndex = 4;
    }
    if(x >= 500){
        canvasIndex += 1;
        x -= 500;
    }
    return {x, y, canvasIndex};
}

function place(conflict, token) {
    const {x, y, col} = conflict;

    toast(`Постави на (${x - 500}, ${y - 500}) с цвят ${reverseColorNameDict[col]}(#${col}) (от ${conflict.temp})`, reverseColorDict[col]);
    log(`placing (${x - 500}, ${y - 500}) with color #${col} %c▉ %c(from ${conflict.temp})`, `color: ${reverseColorDict[col]};`, `color:unset;`);

    const {x:rX, y:rY, canvasIndex} = getCanvasIndex(x, y);

    return fetch('https://gql-realtime-2.reddit.com/query', {
        method: 'POST',
        body: JSON.stringify({
            'operationName': 'setPixel',
            'variables': {
                'input': {
                    'actionName': 'r/replace:set_pixel',
                    'PixelMessageData': {
                        'coordinate': {
                            "x": rX,
                            "y": rY
                        },
                        'colorIndex': col,
                        "canvasIndex": canvasIndex
                    }
                }
            },
            'query': 'mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
        }),
        headers: {
            'origin': 'https://hot-potato.reddit.com',
            'referer': 'https://hot-potato.reddit.com/',
            'apollographql-client-name': 'mona-lisa',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': navigator.userAgent
        }
    });
}

async function update() {
    getColorDict();
    let json = await makeRequest(`https://${host}/index.json`);
    let names = Object.keys(json);

    let conflicts = [];
    for (let i = 0; i < names.length; i++) {
        const t = names[i];
        let tConflicts = await getTemplateConflicts(t, json[t].x, json[t].y);
        conflicts = conflicts.concat(tConflicts);
    }

    let conflictNo = Math.floor(Math.random() * conflicts.length);
    let conflict = conflicts[conflictNo];

    await place(conflict, token);

    setTimeout(update, await getTimeLeft() + getRandomInBounds(1000, 5000));
}

function getColorDict() {
    let buttons = document.querySelector("garlic-bread-embed").shadowRoot
        .querySelector("garlic-bread-color-picker").shadowRoot.querySelectorAll("button.color");
    buttons.forEach(b => {
        let color = b.querySelector("div").style.backgroundColor;
        color = color.replace("rgb(", "").replace(")", "").split(",").map(e => Number(e));
        let id = b.getAttribute("data-color");

        let key = color.join(',');
        colorDict[key] = id;
        reverseColorDict[`${id}`] = b.querySelector("div").style.backgroundColor;
        reverseColorNameDict[`${id}`] = b.parentElement.querySelector("div.color-name").innerText;
    });
}

let availStamp, timeLeftInfoToast, coordsInfoToast;

function formatTime(time){
    let seconds = Math.floor(time/1000);
    if(seconds < 0){return `00:00`;}

    let minStr = String(Math.floor(seconds/60)).padStart(2, '0');
    let secStr = String(seconds%60).padStart(2, '0');
    return `${minStr}:${secStr}`;
}

function updateInfoToast(){
    coords = document.querySelector("garlic-bread-embed").shadowRoot.querySelector("garlic-bread-status-pill").shadowRoot.querySelector("garlic-bread-coordinates").shadowRoot.innerHTML;
    coords = coords.replaceAll(/<!--\?lit\$[0-9]+\$-->/g, "");
    coords = coords.match(/\([0-9\-]+,[0-9\-]+\)/)[0];

    time = (availStamp - (new Date()).getTime());
    time = formatTime(time);

    timeLeftInfoToast.innerHTML = time;
    coordsInfoToast.innerHTML = coords;


    document.querySelector("garlic-bread-embed").shadowRoot.querySelector("garlic-bread-color-picker").removeAttribute("is-visible");
}

async function getTimeLeft() {
    let resp = await fetch('https://gql-realtime-2.reddit.com/query', {
		method: 'POST',
		body: "{\"operationName\":\"getUserCooldown\",\"variables\":{\"input\":{\"actionName\":\"r/replace:get_user_cooldown\"}},\"query\":\"mutation getUserCooldown($input: ActInput!) {\\n  act(input: $input) {\\n    data {\\n      ... on BasicMessage {\\n        id\\n        data {\\n          ... on GetUserCooldownResponseMessageData {\\n            nextAvailablePixelTimestamp\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}",
		headers: {
			'origin': 'https://hot-potato.reddit.com',
			'referer': 'https://hot-potato.reddit.com/',
			'apollographql-client-name': 'mona-lisa',
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
            'User-Agent': navigator.userAgent
		}
	});
    let data = await resp.json();
    availStamp = data.data.act.data[0].data.nextAvailablePixelTimestamp;
    let timeLeft = availStamp - (new Date()).getTime();
    return timeLeft;
}

function getRandomInBounds(min, max){
    return Math.random() * (max-min) + min;
}

function setupInfoToast(){
    document.querySelector("garlic-bread-embed").shadowRoot.querySelector("div.bottom-controls").style.display = "none";

    let infoToast = document.createElement("div");

    timeLeftInfoToast = document.createElement("h1");
    timeLeftInfoToast.style.fontSize = "x-large";
    timeLeftInfoToast.style.margin = "0px";
    infoToast.appendChild(timeLeftInfoToast);

    coordsInfoToast = document.createElement("p");
    coordsInfoToast.style.margin = "0px";
    infoToast.appendChild(coordsInfoToast);

    Toastify({
        node: infoToast,
        duration: -1,
        gravity: "bottom",
        position: "center",
        style: {
            background: '#C6C6C6',
        },
    }).showToast();
    setInterval(updateInfoToast, 250);
}

async function main() {
    GM_addStyle(GM_getResourceText('TOASTIFY_CSS'));
    token = await getAccessToken();
    toast(`accessToken е получен.`);
    log(`accessToken granted.`);

    setupInfoToast();
    
    canvas = document.querySelector("garlic-bread-embed").shadowRoot.querySelector("garlic-bread-camera")
        .querySelector("garlic-bread-canvas").shadowRoot.querySelector("div.container > canvas");
    ctx = canvas.getContext("2d");

    setTimeout(update, await getTimeLeft() + getRandomInBounds(1000, 5000));
}

if (window.top !== window.self) {
    window.addEventListener('load', () => {
        main();
    }, false);
}

function toast(msg, col="black"){
    Toastify({
        text: `Autoplacer: ${msg}`,
        duration: 10*1000,
        gravity: "top",
        style: {
            background: '#C6C6C6',
            color: col
        },
    }).showToast();
}

function log(){
    let args = arguments;
    args[0] = `Autoplacer: ${args[0]}`;
    console.log(...args)
}