const { contextBridge, ipcRenderer } = require('electron');

// 由于contextIsolation的开启，需要通过contextBridge来暴露API给渲染进程
contextBridge.exposeInMainWorld('api', {
  // 获取公众号列表
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  
  // 保存公众号
  saveAccount: (account) => ipcRenderer.invoke('save-account', account),
  
  // 删除公众号
  deleteAccount: (accountName) => ipcRenderer.invoke('delete-account', accountName),
  
  // 获取应用设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // 保存应用设置
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 登录功能
  openLoginWindow: () => ipcRenderer.invoke('open-login-window'),
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),
  logout: () => ipcRenderer.invoke('logout'),
  
  // 搜索公众号
  searchAccount: (accountName) => ipcRenderer.invoke('search-account', accountName),
  
  // 获取文章列表
  getArticles: (params) => ipcRenderer.invoke('get-articles', params),
  
  // 导出文章到Excel
  exportArticles: (params) => ipcRenderer.invoke('export-articles', params),
  
  // 获取文章详情内容
  getArticleDetail: (articleUrl) => ipcRenderer.invoke('get-article-detail', articleUrl),
  
  // 在外部浏览器中打开链接
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  
  // 获取本地保存的文章
  getLocalArticles: (accountName) => ipcRenderer.invoke('get-local-articles', accountName),
  
  // 获取同步进度
  getSyncProgress: (accountName) => ipcRenderer.invoke('get-sync-progress', accountName),
  
  // 同步进度更新事件监听
  onSyncProgressUpdate: (callback) => {
    ipcRenderer.on('sync-progress-update', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('sync-progress-update', callback);
  },
  
  // 文章更新事件监听
  onArticleUpdate: (callback) => {
    ipcRenderer.on('article-update', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('article-update', callback);
  },
  
  // 登录成功事件监听
  onLoginSuccess: (callback) => {
    ipcRenderer.on('login-success', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('login-success', callback);
  }
}); 