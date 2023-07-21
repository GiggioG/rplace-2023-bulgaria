'use strict';
// ==UserScript==
// @name         r/bulgaria Auto-placer for r/place
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @version      1.0.0
// @description  Help bulgaria with r/place.
// @author       Gigo_G
// @match        https://garlic-bread.reddit.com/embed?*
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/bot-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/bot-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant	     GM.xmlHttpRequest
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
    return {x, y, canvasIndex};
}

function place(conflict, token) {
    const {x, y, col} = conflict;

    console.log(`placing (${x - 500}, ${y - 500}) with color #${col}. (from ${conflict.temp})`);

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
    });
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
    let availStamp = data.data.act.data[0].data.nextAvailablePixelTimestamp;
    let timeLeft = availStamp - (new Date()).getTime();
    return timeLeft;
}

function getRandomInBounds(min, max){
    return Math.random() * (max-min) + min;
}

async function main() {
    token = await getAccessToken();
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