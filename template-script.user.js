'use strict';
// ==UserScript==
// @name         r/bulgaria Template for r/place
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @namespace    https://github.com/GiggioG/rplace-2023-bulgaria/
// @version      0.3.2
// @description  Help bulgaria with r/place.
// @author       Gigo_G - repurposed from wokstym, who repurposed it from other subreddits
// @match        https://hot-potato.reddit.com/embed*
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==
const host = "r-place-2022-bulgaria.herokuapp.com";
let templates = {};

function createImage() {
    const img = document.createElement("img");
    img.style = "position: absolute; image-rendering: pixelated;";

    document.getElementsByTagName("mona-lisa-embed")[0].shadowRoot.children[0]
        .getElementsByTagName("mona-lisa-canvas")[0].shadowRoot.children[0].appendChild(img);

    return img;
}

function newTemplate(temp, tempName) {
    temp.el = createImage();
    templates[tempName] = temp;
}

function main() {
    setInterval(async () => {
        let resp = await fetch(`http://${host}/index.json`);
        let json = await resp.json();

        let oldT = Object.keys(templates);
        let newT = Object.keys(json);
        oldT.filter(e => !newT.includes(e)).forEach(e => {
            templates[e].el.remove();
            delete templates[e];
        });

        newT.filter(e => !oldT.includes(e)).forEach(e => {
            newTemplate(newT[e], e);
        });

        newT.forEach(e => {
            templates[e].x = newT[e].x;
            templates[e].y = newT[e].y;
            
            const nonce = String((new Date()).getTime());
            templates[e].el.src = `http://${host}/img?imgname=${e}&nonce=${nonce}`;
            templates[e].el.style.top = `${templates[e].y}px`;
            templates[e].el.style.left = `${templates[e].x}px`;
        });
    }, 10000);
}
if (window.top !== window.self) {
    window.addEventListener('load', () => {
        main();
        main();
    }, false);
}