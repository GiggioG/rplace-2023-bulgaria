'use strict';
// ==UserScript==
// @name         r/bulgaria Template for r/place
// @namespace    https://github.com/GiggioG/rplace-23-bg/
// @version      0.3.2
// @description  Help bulgaria with r/place.
// @author       Gigo_G - repurposed from wokstym, who repurposed it from other subreddits
// @match        https://hot-potato.reddit.com/embed*
// @updateURL    https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @downloadURL  https://github.com/GiggioG/rplace-2023-bulgaria/raw/main/template-script.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==
if (window.top !== window.self) {
    window.addEventListener('load', () => {
        let img;
        let src = "https://r-place-2022-bulgaria.herokuapp.com/template.png";
        //let src = "https://raw.githubusercontent.com/Wokstym/place/master/map.png";
        document.getElementsByTagName("mona-lisa-embed")[0].shadowRoot.children[0].getElementsByTagName("mona-lisa-canvas")[0].shadowRoot.children[0].appendChild(
            (function () {
                const i = document.createElement("img");
                i.src = src + "?" + String((new Date()).getTime());
                i.style = "position: absolute; left: 0; top: 0; image-rendering: pixelated; width: 2000px; height: 2000px;"
                img = i;
                return i;
            })());
        setInterval(()=>{
            img.src = src + "?" + String((new Date()).getTime())
        }, 10000)
    }, false);
}