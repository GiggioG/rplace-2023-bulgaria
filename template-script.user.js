'use strict';
// ==UserScript==
// @name         r/bulgaria Template for r/place
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @version      0.5.0
// @description  Help bulgaria with r/place.
// @author       Gigo_G - repurposed from wokstym, who repurposed it from other subreddits
// @match        https://garlic-bread.reddit.com/embed?*
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant	     GM.xmlHttpRequest
// ==/UserScript==
const host = "r-place-2022-bulgaria.herokuapp.com";
let templates = {};
let container;

function createImage() {
    const img = document.createElement("img");
    img.style = "position: absolute; image-rendering: pixelated; z-index: 9999;";

    container.appendChild(img);

    return img;
}

function newTemplate(temp, tempName) {
    temp.el = createImage();
    templates[tempName] = temp;
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

async function update() {
    let json = await makeRequest(`https://${host}/index.json`);
    let topLeft = json.topLeft;
    json = json.templates;

    let oldT = Object.keys(templates);
    let newT = Object.keys(json);
    oldT.filter(e => !newT.includes(e)).forEach(e => {
        templates[e].el.remove();
        delete templates[e];
    });

    newT.filter(e => !oldT.includes(e)).forEach(e => {
        newTemplate(json[e], e);
    });

    newT.forEach(e => {
        templates[e].x = json[e].x;
        templates[e].y = json[e].y;

        const topPx = templates[e].y - topLeft.y;
        const leftPx = templates[e].x - topLeft.x;

        const nonce = String((new Date()).getTime());
        templates[e].el.src = `https://${host}/img?imgname=${e}&nonce=${nonce}`;
        templates[e].el.addEventListener("load", ()=>{
            templates[e].el.style.width = `${templates[e].el.naturalWidth/3}px`;
            templates[e].el.style.height = `${templates[e].el.naturalHeight/3}px`;
            templates[e].el.style.top = `${topPx}px`;
        templates[e].el.style.left = `${leftPx}px`;
        });
    });
}

function main() {
    container = document.querySelector("garlic-bread-embed").shadowRoot.querySelector("garlic-bread-camera")
        .querySelector("garlic-bread-canvas").shadowRoot.querySelector("div.container");
    update();
    setInterval(update, 30 * 1000);
}

if (window.top !== window.self) {
    window.addEventListener('load', () => {
        main();
    }, false);
}