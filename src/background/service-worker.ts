// // 监听插件安装事件
// chrome.runtime.onInstalled.addListener((tab) => {
//   console.log('插件已安装');
//   chrome.sidePanel.open({tabId:tab.id}).catch(err => {
//     console.error('Failed to open side panel:', err);
//   });
// });

// // 监听插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  console.log('插件图标被点击', tab);
  console.log(chrome,'111')
  chrome.sidePanel.open({tabId:tab.id}).catch(err => {
    console.error('Failed to open side panel:', err);
  });
});
