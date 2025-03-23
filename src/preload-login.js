const { contextBridge, ipcRenderer } = require('electron');

// 为登录窗口提供基本API
contextBridge.exposeInMainWorld('loginApi', {
  // 发送消息到主进程
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  
  // 从渲染进程接收消息
  receiveMessage: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // 关闭窗口
  closeWindow: () => {
    ipcRenderer.send('close-login-window');
  }
}); 