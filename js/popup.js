window.addEventListener("DOMContentLoaded", (event) => {
  const onOffToggle = document.getElementById("onOffToggle");
  const statusText = document.getElementById("statusText");
  const inputField = document.getElementById("inputField");
  const nameList = document.getElementById("nameList");
  const addNameButton = document.getElementById("addName");

  function changeOnOff(x){
    statusText.innerHTML = x?"ON":"OFF";
    onOffToggle.style.color = x?"green":"red";
    statusText.style.color = x?"green":"red";
    x?chrome.action.setIcon({ path: "/images/icon128.png" }):chrome.action.setIcon({ path: "/images/icon128_.png" });
  }

  async function sendUsernameList(usernames){

    for (const cs of chrome.runtime.getManifest().content_scripts) {
      for (const tab of await chrome.tabs.query({url: cs.matches})) {
        chrome.tabs.sendMessage(tab.id, {message: "UsernameUpdate", usernames})
      }
    }
  }

  function addName(name){
    const newLi = document.createElement("li");
    newLi.id = name + "li";
    const minus = document.createElement("i");
    const nameNode = document.createTextNode(name);

    minus.className = "buttonM fa fa-minus-square fa-lg";
    minus.id = name;

    minus.addEventListener("click", (e)=>{
      console.log(e.target.id);
      chrome.storage.local.get(['usernames'], function(result){
        var filtered = result.usernames.filter(el =>{
          return el !== e.target.id;
        });
        sendUsernameList(filtered);
        chrome.storage.local.set({usernames: filtered});
        e.target.parentElement.remove();
      });
    });

    newLi.appendChild(minus);
    newLi.appendChild(nameNode);

    nameList.appendChild(newLi);
  }

    chrome.storage.local.get(['isOn','usernames'], function(result){
      changeOnOff(result.isOn);
      result.usernames.forEach(name => {
        addName(name);
      });
    });

    onOffToggle.addEventListener("click", ()=>{
      chrome.storage.local.get(['isOn'], function(result){
        const tmp = !result.isOn;
        chrome.storage.local.set({isOn: tmp});
        changeOnOff(tmp);
      });
    });

    addNameButton.addEventListener("click", () => {
      if(!inputField.value){
        return;
      }
      chrome.storage.local.get(['usernames'], function(result){
        if(result.usernames.includes(inputField.value)){
          return;
        }
        result.usernames.push(inputField.value);
        addName(inputField.value);
        inputField.value = "";
        sendUsernameList(result.usernames);
        chrome.storage.local.set({usernames: result.usernames});
      });
     });
 });