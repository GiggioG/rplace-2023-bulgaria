'use strict';
// ==UserScript==
// @name         r/bulgaria Template for r/place
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @version      0.4.1
// @description  Help bulgaria with r/place.
// @author       Gigo_G - repurposed from wokstym, who repurposed it from other subreddits
// @match        https://*.reddit.com/*
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==
const host = "r-place-2022-bulgaria.herokuapp.com";
let templates = {};

function createImage() {
    const img = document.createElement("img");
    img.style = "position: absolute; image-rendering: pixelated; z-index: 9999;";

    document.getElementsByTagName("mona-lisa-embed")[0].shadowRoot.children[0]
        .getElementsByTagName("mona-lisa-canvas")[0].shadowRoot.children[0].appendChild(img);

    return img;
}

function newTemplate(temp, tempName) {
    temp.el = createImage();
    templates[tempName] = temp;
}

async function update(){
    let resp = await fetch(`https://${host}/index.json`);
    let json = await resp.json();

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

        const nonce = String((new Date()).getTime());
        templates[e].el.src = `https://${host}/img?imgname=${e}&nonce=${nonce}`;
        templates[e].el.addEventListener("load", ()=>{
            templates[e].el.style.width = `${templates[e].el.naturalWidth/3}px`;
            templates[e].el.style.height = `${templates[e].el.naturalHeight/3}px`;
            templates[e].el.style.top = `${templates[e].y}px`;
            templates[e].el.style.left = `${templates[e].x}px`;
        });
    });
}

function main() {
    update();
    setInterval(update, 10000);
}

if (window.top !== window.self) {
    window.addEventListener('load', () => {
        main();
    }, false);
}