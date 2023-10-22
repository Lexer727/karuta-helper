// background.js

chrome.runtime.onInstalled.addListener(async() => {
  chrome.storage.local.set({isOn: true });
  chrome.storage.local.set({usernames: [] });
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({url: cs.matches})) {
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: cs.js,
      });
    }
  }
});

function handleMessage(request, sender, sendResponse) {  
  if (request.event === "Toggle"){
    console.log("New status: " + request.payload);
    chrome.storage.local.set({isOn: request.payload }).then(()=>{
      sendResponse({payload: request.payload});
    });
  }
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);