//vars
let sdcolor = "#990000"; //server drop color
let wpcolor = "#990000"; //high wishlist/ print message color
let udcolor = "#186321"; //user drop color
let wlcolor = "#8a33cc"; //wishlist color

let stopScroll = true; //stop scroll on server/user drop
let msLockTime = 10000; //scroll lock time in ms


const botImg = 'https://cdn.discordapp.com/avatars/646937666251915264/0e54d87446f106d1fd58385295ae9deb.webp?size=128'; //url of karuta bot image used to identify the bot

//
//wishlist data
const wlJsonURL = chrome.runtime.getURL('assets/wldata.json');
let wlData;
fetchData();

async function fetchData(){
    await fetch(wlJsonURL)
    .then((response) => response.json()).then((json) =>{
        wlData = json;
    }); 
}

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
const config = { childList: true };
let scrollLock = false;
let released = true;

//worker 
const nameChars = " 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const titleChars = " '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!/"
const printChars = "-0123456789";

async function createWorker(scheduler, type) {
    const worker = await Tesseract.createWorker("eng", 1, {
        corePath: chrome.runtime.getURL("js/"),
        workerPath: chrome.runtime.getURL("js/worker.min.js"),
        langPath: chrome.runtime.getURL("lang/"),
    });
    if(type === "name"){
        await worker.setParameters({
            tessedit_char_whitelist: nameChars,
          });
    }else if(type === "title"){
        await worker.setParameters({
            tessedit_char_whitelist: titleChars,
          });
    }else{
        await worker.setParameters({
            tessedit_char_whitelist: printChars,
          });
    }
	scheduler.addWorker(worker);
}

function getAbsoluteHeight(el) {
    // Get the DOM Node if you pass in a string
    el = (typeof el === 'string') ? document.querySelector(el) : el; 
  
    var styles = window.getComputedStyle(el);
    var margin = parseFloat(styles['margin-top']) +
                 parseFloat(styles['margin-bottom']);
  
    return Math.ceil(el.offsetHeight + margin);
}

function getData(image, target){
    getMeta(image.substring(0, image.indexOf('?')), async (err, img) => {
        var count = img.naturalWidth===1110?4:3;
        var pieces = [];
        //get name
        var namePieces = [];
        let width = 192;
        let height = 45;
        for(var x = 0; x < count; ++x) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');

            context.drawImage(img, 48 + x * width + x * 82, 62, width, height, 0, 0, canvas.width, canvas.height);
            namePieces.push(canvas.toDataURL());
        }
        pieces.push({array: namePieces, type: "name"});

        //get title
        var namePieces = [];
        width = 192;
        height = 52;
        for(var x = 0; x < count; ++x) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');

            context.drawImage(img, 48 + x * width + x * 82, 311, width, height, 0, 0, canvas.width, canvas.height);
            namePieces.push(canvas.toDataURL());
        }
        pieces.push({array: namePieces, type: "title"});

        //get print
        var printPieces = [];
        width = 77;
        height = 15;
        for(var x = 0; x < count; ++x) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');

            context.drawImage(img, 149 + x * width + x * 197, 370, width, height, 0, 0, canvas.width, canvas.height);
            printPieces.push(canvas.toDataURL());
        }
        pieces.push({array: printPieces, type: "print"});
        
        const time = Date.now();
        const results = await Promise.all(pieces.map(async(p)=>{
            return await recognize(p.array, p.type);
        }))
        console.log("[Karuta Helper] Image Recognition took: ", Date.now() - time, "ms");


        const nameNode = document.createElement("div");
        nameNode.style.backgroundColor = wpcolor;

        for(var i = 0 ; i < results[0].length ; i++ ){
            var div = document.createElement("div");
            var container = document.createElement("span");
            container.style.color = "white";
            const index = "- " + (1+i);
            
            const highWl = getWishlist(results[0][i], results[1][i]);
            const print = getPrint(results[2][i]);
            const edition = getEdition(results[2][i]);

            console.log("[Karuta Helper] Recognized Card - Name:", results[0][i],", Anime: ", results[1][i],", Print + Edition: ", results[2][i]," - WL: ", highWl,", Print: ", print,", Edition: ", edition);

            let wlText = '';
            let printText = '';
            if(highWl){
                wlText = " - HIGH WL: " + highWl.wl + ", " + highWl.name + ", from: "+ highWl.anime;
            }
            if(print<10){
                printText = " - SINGLE PRINT: "+ print + ", Edition: "+ edition;
            }else if(print<100){
                printText = " - LOW PRINT: "+ print + ", Edition: "+ edition;
            }else if(print<1000){
                printText = " - MIDDLE PRINT: "+ print + ", Edition: "+ edition;
            }else if(print<10000){
                printText = " - HIGH PRINT: "+ print + ", Edition: "+ edition;
            }
            const text = wlText + printText;
            if(text !== ""){
                var textNode = document.createTextNode(index + "." + text);
                container.appendChild(textNode);
            }
            div.appendChild(container);
            nameNode.appendChild(div);
        }

        target.parentElement.parentElement.parentElement.appendChild(nameNode);
    });
    //scrollElement.scrollBy({top:nameNode.offsetHeight, behavior:"instant"});
}

function getWishlist(name, title){
    let res = null;
    let bestMatch = -1;
    let bestIndex = -1;

    wlData.forEach((entry, index) =>{
        const newMatch = similarity(name, entry.name);
        if(newMatch>bestMatch){
            bestMatch = newMatch;
            bestIndex = index;
        }
    });
    
    if(bestMatch > 0.85){
        console.log("[Karuta Helper] Found Match of: ",name,"to: ",wlData[bestIndex].name,"from: ",wlData[bestIndex].anime,'- similarity of:',bestMatch);
        res = wlData[bestIndex];
    }
    return res;
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

function getPrint(num){
    if(num.lastIndexOf('-')===num.length-1){
        num = num.substring(0,num.lastIndexOf('-'));
    }
    num = num.substring(0,num.lastIndexOf('-'));
    num = num.substring(num.lastIndexOf('-') + 1);
    return parseInt(num);
}

function getEdition(num){
    if(num.lastIndexOf('-')===num.length-1){
        num = num.substring(0,num.lastIndexOf('-'));
    }
    num = num.substring(num.lastIndexOf('-') + 1);
    return parseInt(num);
}

const getMeta = (url, cb) => {
    const img = new Image();
    img.onload = () => cb(null, img);
    img.onerror = (err) => cb(err);
    img.src = url;
    img.crossOrigin="anonymous"
  };
  
async function recognize(arr, type){
    const scheduler = Tesseract.createScheduler();
    const resArr= Array(arr.length);
    for (let i=0; i<arr.length; i++) {
        resArr[i] = await createWorker(scheduler, type);
    }
    await Promise.all(resArr);
    
    const results = await Promise.all(arr.map(async(img,i) => (
        scheduler.addJob('recognize', img).then((x) => x.data.text.replaceAll("\n"," ").trim())
    )));
    await scheduler.terminate();
    return results;
}


async function getImage(message){
    const imgCol = message.firstChild.childNodes[1].firstChild.firstChild.firstChild.firstChild.firstChild.firstChild.childNodes[1];
    if(imgCol.getElementsByTagName('img').length < 1){
        const innerObserver = new MutationObserver(function(innerMutations, innerObserver) {
                                getData(innerMutations[0].target.firstChild.currentSrc, innerMutations[0].target);
                                innerObserver.disconnect();
                            });
        innerObserver.observe(imgCol, config);
    }else{
        getData(imgCol.getElementsByTagName('img')[0].currentSrc);
    }
}

function markMessage(message, addedMessage){
    const text = message.getElementsByTagName("span");
    
    const innerText = Array.prototype.map.call(text, t => t.innerHTML).join('').split('\n');
    let res = false;
    innerText.forEach((it, i) => {
        if(it.includes("expired") || it.includes("wait") || it.includes("you are in position")){
            return;
        }
        if(it.includes("dropping")){
            if(it.includes("wishlist")){
                message.style.backgroundColor = wlcolor;
                return;
            }
            if(it.includes("cards")){
                getImage(addedMessage);
            }
            if(it.includes("server")){
                addedMessage.style.backgroundColor = sdcolor;
                console.log("[Karuta Helper] Serverdrop ", new Date().toString());
                res = true;
            }else{
                const iname = it.split(' ')[0].substring(1);
                userNames.find(name =>{
                    if(name === iname){
                        addedMessage.style.backgroundColor = udcolor;
                        console.log("[Karuta Helper] Userdrop: ", new Date().toString());
                        res = true;
                        return;
                    }
                })
            }
        }
    });

    return res;
}

const observer = new MutationObserver(function(mutations, observer) {  
    console.log("[Karuta Helper] New Message");
    mutations.forEach(mutation =>{
        mutation.addedNodes.forEach(addedMessage =>{
            if(addedMessage?.nodeName === "LI" && stopScroll){
                if(scrollLock){
                    scrollElement.scrollBy({top:-getAbsoluteHeight(addedMessage.firstChild), behavior:"instant"});
                    scrollLock = false;
                }
                if(isKarutaMsg(addedMessage)){
                    var node = addedMessage.firstChild.getElementsByClassName("contents-2MsGLg")[0].getElementsByTagName("div")[0];
                    if(markMessage(node, addedMessage)){
                        if(!scrollLock){
                            scrollElement.scrollBy({top:99999999999, behavior:"instant"});
                            scrollLock = true;
                            released = false;
                            setTimeout(function(){
                                if(!released){
                                    console.log('[Karuta Helper] Releasing scroll lock ', new Date().toString());
                                    scrollElement.scrollBy({top:99999999999, behavior:"instant"});
                                    scrollLock = false;
                                }else{
                                    console.log('[Karuta Helper] Scroll lock already released');
                                }
                            },msLockTime);
                        }
                    }
                }
            
            }
        });
    });
});

function isKarutaMsg(message){
    var karutaImg = null;
    var imgNodes = message?.firstChild?.getElementsByClassName("contents-2MsGLg")[0]?.getElementsByTagName("img");
    if(imgNodes){
        for(const node of imgNodes){
            if(node.src === botImg){
                karutaImg = true;
                break;
            }else{
                karutaImg = false;
            }
        }
    }
    if(karutaImg === null){
        return isKarutaMsg(message.previousSibling);
    }else{
        return karutaImg;
    }
}


async function init(){
    chrome.storage.local.get(['isOn','usernames'], async function(result){
        if(!result.isOn){
            return;
        }
        usersNames = result.usernames;
        while(wlData===undefined){
            console.log("[Karuta Helper] waiting for wldata");
            await delay(500);
        }
        let chat;
        while(chat===undefined){
            chat = document.getElementsByClassName("scrollerInner-2PPAp2")[0];
            console.log("[Karuta Helper] Waiting for chat to load...");
            await delay(500);
        }
        scrollElement = document.getElementsByClassName("scroller-kQBbkU")[0];

        scrollElement.addEventListener("wheel", (event) => {
            if(!released){
                console.log('[Karuta Helper] Released scroll lock with mouse scroll');
                scrollLock = false;
                released = true;
            }
        });
        observer.observe(chat, config);
        //main(chat);
      });
}

function main(chat){
    var messages = chat.getElementsByTagName("li");
    for(var i = messages.length-1; i > 0; i--){
        if(messages[i].hasChildNodes()){
            var imgFound = false;
            var karutaImg = false;

            while(!imgFound){
                var childNodes = messages[i]?.firstChild.getElementsByClassName("contents-2MsGLg")[0]?.childNodes;
                if(!childNodes){
                    break;
                }
                for(const node of childNodes){
                    if(node.nodeName === "IMG"){
                        imgFound = true;
                        if(node.src === botImg){
                            karutaImg = true;
                        }
                    }
                    if(node.nodeName === "DIV"){
                        if(node.innerHTML.indexOf("server") !== -1 && node.innerHTML.indexOf("dropping") !== -1 ){
                            messages[i].style.backgroundColor = sdcolor;
                            var innerObserver = new MutationObserver(function(mutations, observer) {
                                if(mutations[0].target.innerHTML.indexOf("expired") !== -1){
                                    mutations[0].target.parentElement.parentElement.parentElement.style.backgroundColor = null;
                                    observer.disconnect();
                                }
                            });
                            innerObserver.observe(node, config);
                        }
                    }
                }
                if(!imgFound){
                    i--;
                }
            }
        }
    }
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === 'UsernameUpdate') {
        console.log("[Karuta Helper] Usernames Updated ", request.usernames);
        userNames = request.usernames;
    }
});

var oldHref = document.location.href;

window.onload = function() {
    var bodyList = document.querySelector("body")
    var siteobserver = new MutationObserver(function(mutations) {
        if (oldHref != document.location.href) {
            oldHref = document.location.href;
            console.log("[Karuta Helper] Location Change");
            observer.disconnect();
            init();
        }
    });
    var config = {
        childList: true,
        subtree: true
    };
    siteobserver.observe(bodyList, config);
};

console.log("[Karuta Helper] Started Extension");
init();