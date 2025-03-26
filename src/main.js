const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const axios = require('axios');
const ExcelJS = require('exceljs');
const EventEmitter = require('events');

// 存储应用配置
const store = new Store({
  name: 'config',
  defaults: {
    accounts: [],
    settings: {
      cookie: '',
      token: '',
      fingerprint: ''
    },
    articles: {}, // 用于存储每个公众号的文章
    syncProgress: {} // 记录每个公众号的同步进度
  }
});

// 辅助对象，用于获取Cookie和Token
const Cookie = {
  find: (accountName) => {
    const settings = store.get('settings');
    return settings.cookie || '';
  }
};

const Token = {
  find: (accountName) => {
    const settings = store.get('settings');
    return settings.token || '';
  }
};

// 获取User-Agent
function getUserAgent() {
  // 使用较新版本的Chrome UA，更好地模拟实际浏览器
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36';
}

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,  // 启用webview标签
      webSecurity: false, // 禁用web安全策略，使webview可以加载外部内容
      allowRunningInsecureContent: true // 允许运行混合内容（http和https混合）
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    console.log('Development mode - opening DevTools');
    mainWindow.webContents.openDevTools();
    
    // 设置窗口开发快捷键
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Ctrl+Shift+I或F12打开开发者工具
      if ((input.control && input.shift && input.key === 'I') || input.key === 'F12') {
        mainWindow.webContents.openDevTools();
        event.preventDefault();
      }
      // Ctrl+R刷新页面
      if (input.control && input.key === 'R') {
        mainWindow.webContents.reload();
        event.preventDefault();
      }
    });
  }
  
  // 允许打开外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 允许打开与当前主机相同的链接
    if (url.startsWith('https://mp.weixin.qq.com')) {
      return { action: 'allow' };
    }
    // 对于其他链接，使用默认浏览器打开
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // 返回窗口实例
  return mainWindow;
}

// 全局保存主窗口引用
let mainWindow = null;

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 获取保存的公众号列表
ipcMain.handle('get-accounts', async () => {
  return store.get('accounts');
});

// 保存公众号
ipcMain.handle('save-account', async (event, account) => {
  const accounts = store.get('accounts');
  const exists = accounts.findIndex(a => a.name === account.name);
  
  if (exists >= 0) {
    accounts[exists] = account;
  } else {
    accounts.push(account);
  }
  
  store.set('accounts', accounts);
  return accounts;
});

// 删除公众号
ipcMain.handle('delete-account', async (event, accountName) => {
  const accounts = store.get('accounts');
  const newAccounts = accounts.filter(a => a.name !== accountName);
  store.set('accounts', newAccounts);
  return newAccounts;
});

// 获取应用设置
ipcMain.handle('get-settings', (event) => {
  const settings = store.get('settings') || {
    cookie: '',
    token: '',
    fingerprint: '',
    loggedIn: false,
    lastLogin: null
  };
  return settings;
});

// 保存应用设置
ipcMain.handle('save-settings', (event, settings) => {
  try {
    store.set('settings', settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, message: error.message };
  }
});

// 清理Cookie，解决乱码和无效字符问题
function sanitizeCookie(cookie) {
  if (!cookie) return '';
  
  try {
    // 确保是字符串
    cookie = cookie.toString();
    
    // 使用Buffer进行编码转换，解决可能的编码问题
    cookie = Buffer.from(cookie, 'utf8').toString('ascii');
    
    // 只保留合法的Cookie字符（ASCII可打印字符，但不包含分号和逗号以外的特殊字符）
    cookie = cookie.replace(/[^\x20-\x7E]/g, '');
    
    // 去除空白字符
    cookie = cookie.replace(/[\r\n\t\f\v]/g, '');
    
    // 分割成单独的cookie条目并重新组合，进一步确保格式正确
    const cookieParts = cookie.split(';').map(part => part.trim()).filter(Boolean);
    return cookieParts.join('; ');
  } catch (error) {
    console.error('[Error] Failed to sanitize cookie:', error);
    return '';
  }
}

// 安全的请求函数，使用axios，支持重试机制
async function safeRequest(url, options = {}) {
  let retries = 3;
  let lastError = null;
  
  // 如果传入的是字符串URL，转换为标准options
  if (typeof options === 'string') {
    options = { headers: options };
  }
  
  // 提取或初始化请求配置
  const headers = options.headers || {};
  const method = options.method || 'GET';
  const params = options.params || {};
  const data = options.data || {};
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} for ${url}`);
      
      // 构建请求配置
      const config = {
        method,
        url,
        headers: { ...headers },
        timeout: 15000, // 15秒超时
        validateStatus: status => status >= 200 && status < 300,
      };
      
      // 添加参数
      if (method.toUpperCase() === 'GET' && Object.keys(params).length > 0) {
        config.params = params;
      } else if (method.toUpperCase() !== 'GET' && Object.keys(data).length > 0) {
        config.data = data;
      }
      
      // 如果headers中有Cookie，确保它被清理
      if (headers.Cookie || headers.cookie) {
        config.headers.Cookie = sanitizeCookie(headers.Cookie || headers.cookie);
      }
      
      // 发送请求
      const response = await axios(config);
      
      // 检查响应
      const responseData = response.data;
      
      // 返回成功的结果
      return {
        success: true,
        data: responseData
      };
      
    } catch (error) {
      lastError = error;
      console.error(`Request failed (attempt ${attempt}/${retries}):`, error.message);
      
      // 如果是网络错误或超时，等待后重试
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // 如果是其他类型的错误，检查是否有响应数据
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
        return {
          success: false,
          status: error.response.status,
          message: `HTTP Error ${error.response.status}: ${error.message}`,
          data: error.response.data
        };
      }
      
      // 无法重试的错误，直接返回
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
  
  // 所有重试都失败
  return {
    success: false,
    message: `All ${retries} attempts failed: ${lastError?.message || 'Unknown error'}`,
    error: lastError
  };
}

// 搜索公众号获取fakeid
ipcMain.handle('search-account', async (event, accountName) => {
  try {
    const settings = store.get('settings');
    
    if (!settings.cookie || !settings.token || !settings.fingerprint) {
      return { success: false, message: 'Please set cookie, token and fingerprint first' };
    }
    
    // 直接构造URL，避免参数处理问题
    const url = `https://mp.weixin.qq.com/cgi-bin/searchbiz?action=search_biz&begin=0&count=5&query=${encodeURIComponent(accountName)}&fingerprint=${encodeURIComponent(settings.fingerprint)}&token=${encodeURIComponent(settings.token)}&lang=zh_CN&f=json&ajax=1`;
    
    // 创建一个干净的headers对象
    const headers = {};
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    // 使用清理函数处理Cookie
    if (settings.cookie) {
      headers['Cookie'] = sanitizeCookie(settings.cookie);
    }
    
    // 使用重试机制发送请求
    const result = await safeRequest(url, { headers });
    
    if (!result.success) {
      return { success: false, message: `Search request failed: ${result.message}` };
    }
    
    const data = result.data;
    
    if (data.base_resp && data.base_resp.ret === 0) {
      const list = data.list || [];
      if (list.length > 0) {
        // 尝试找到完全匹配的公众号
        for (const account of list) {
          if (account.nickname === accountName) {
            return { success: true, fakeid: account.fakeid };
          }
        }
        // 如果没有完全匹配，返回第一个结果
        return { success: true, fakeid: list[0].fakeid };
      } else {
        return { success: false, message: 'Account not found' };
      }
    } else {
      return { success: false, message: `Search failed: ${data.base_resp?.err_msg || 'Unknown error'}` };
    }
  } catch (error) {
    console.error('Failed to search account:', error);
    return { success: false, message: `Search error: ${error.message}` };
  }
});

// 获取文章列表
ipcMain.handle('get-articles', async (event, params) => {
  try {
    const { accountName, fakeid, page = 1, syncAll = false, lastSyncTime = 0 } = params;
    
    if (!accountName || !fakeid) {
      return { success: false, message: 'Missing account name or fakeid' };
    }
    
    // 检查设置
    const settings = store.get('settings', {});
    if (!settings.cookie || !settings.token) {
      return { success: false, message: 'Please set cookie and token first' };
    }
    
    // 创建发射器
    const emitter = new EventEmitter();
    
    // 监听同步进度
    emitter.on('sync-progress', (data) => {
      mainWindow.webContents.send('sync-progress-update', {
        ...data,
        accountName
      });
    });
    
    // 监听文章更新
    emitter.on('article-update', (data) => {
      mainWindow.webContents.send('article-update', {
        ...data,
        accountName
      });
    });
    
    // 开始同步
    let syncData;
    if (syncAll) {
      // 全量同步时，强制lastSyncTime为0
      syncData = await syncArticles(accountName, fakeid, settings, emitter, 0);
    } else {
      // 正常分页获取
      syncData = await getArticlesByPage(accountName, fakeid, settings, page);
    }
    
    return syncData;
  } catch (error) {
    console.error('Failed to get articles:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
});

// 常规分页获取文章
async function getArticlesByPage(accountName, fakeid, settings, page = 1) {
  try {
    console.log(`Getting articles for ${accountName}, page ${page}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Cookie': settings.cookie,
        'User-Agent': getUserAgent()
      },
      params: {
        action: 'list_ex',
        begin: (page - 1) * 10,
        count: 10,
        fakeid: fakeid,
        type: '9',
        query: '',
        token: settings.token,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1'
      }
    };
    
    const result = await safeRequest('https://mp.weixin.qq.com/cgi-bin/appmsg', options);
    
    if (!result.success) {
      throw new Error(`Failed to fetch articles: ${result.message}`);
    }
    
    const data = result.data;
    
    if (!data.base_resp || data.base_resp.ret !== 0) {
      throw new Error(`API error: ${data.base_resp?.ret}, ${data.base_resp?.err_msg || 'Unknown error'}`);
    }
    
    const articles = data.app_msg_list || [];
    const totalCount = data.app_msg_cnt || 0;
    
    // 格式化文章数据
    const formattedArticles = articles.map(article => ({
      aid: article.aid,
      title: article.title,
      link: article.link,
      digest: article.digest || '',
      cover: article.cover,
      create_time: article.create_time * 1000, // 转换为毫秒
      update_time: article.update_time * 1000, // 转换为毫秒
      author: article.author || '',
      itemidx: article.itemidx
    }));
    
    // 获取本地文章
    const localArticles = readArticles(accountName);
    
    // 使用Map进行去重，以aid作为唯一标识
    const articlesMap = new Map();
    
    // 先添加已有的文章
    localArticles.forEach(article => {
      articlesMap.set(article.aid || article.link, article);
    });
    
    // 添加新文章，如果有重复的会覆盖
    formattedArticles.forEach(article => {
      articlesMap.set(article.aid || article.link, article);
    });
    
    // 将Map转回数组并按创建时间排序
    const mergedArticles = Array.from(articlesMap.values());
    mergedArticles.sort((a, b) => b.create_time - a.create_time);
    
    // 保存合并后的文章到本地
    saveArticles(accountName, mergedArticles);
    
    // 更新同步进度
    const syncProgress = {
      total: totalCount,
      synced: mergedArticles.length,
      lastSync: Date.now()
    };
    saveSyncProgress(accountName, syncProgress);
    
    return {
      success: true,
      articles: mergedArticles,
      total: totalCount,
      hasMore: articles.length === 10 && (page - 1) * 10 + articles.length < totalCount
    };
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return {
      success: false,
      message: error.message,
      articles: []
    };
  }
}

// 同步文章 - 支持增量同步
async function syncArticles(accountName, fakeid, settings, emitter, lastSyncTime = 0) {
  try {
    // 使用 Buffer 处理中文编码
    const log = (message, data = null) => {
      const encodedMessage = Buffer.from(message).toString('utf8');
      if (data) {
        console.log(`[Sync] ${encodedMessage}:`, data);
      } else {
        console.log(`[Sync] ${encodedMessage}`);
      }
    };
    
    log(`Starting sync for account: ${accountName}, fakeid: ${fakeid}`);
    
    // 获取本地文章
    const localArticles = readArticles(accountName);
    const existingArticleIds = new Set(localArticles.map(a => a.aid || a.link));
    log(`Local articles count: ${localArticles.length}`);
    log(`Existing article IDs: ${Array.from(existingArticleIds).length}`);
    
    // 创建新文章的集合
    const newArticles = [];
    let totalArticleCount = 0;
    let begin = 0;
    let hasMore = true;
    
    // 发送初始进度
    emitter.emit('sync-progress', {
      message: `准备同步文章...`,
      progress: { synced: 0, total: 0 }
    });
    
    // 是否成功获取了文章
    let fetchSuccessful = false;
    
    // 先获取第一页，获取总文章数
    try {
      log(`Fetching first page with begin=0, count=10`);
      const options = {
        method: 'GET',
        headers: {
          'Cookie': settings.cookie,
          'User-Agent': getUserAgent()
        },
        params: {
          action: 'list_ex',
          begin: 0,
          count: 10,
          fakeid,
          type: '9',
          query: '',
          token: settings.token,
          lang: 'zh_CN',
          f: 'json',
          ajax: '1'
        }
      };
      
      const result = await safeRequest('https://mp.weixin.qq.com/cgi-bin/appmsg', options);
      
      if (result.success && result.data.base_resp?.ret === 0) {
        totalArticleCount = result.data.app_msg_cnt || 0;
        log(`Total articles count from API: ${totalArticleCount}`);
        log(`First page response:`, {
          base_resp: result.data.base_resp,
          app_msg_cnt: result.data.app_msg_cnt,
          app_msg_list_length: result.data.app_msg_list?.length
        });
        
        // 处理第一页的文章
        const firstPageArticles = result.data.app_msg_list || [];
        log(`Processing ${firstPageArticles.length} articles from first page`);
        
        for (const article of firstPageArticles) {
          if (!article) continue;
          
          const formattedArticle = {
            aid: article.aid,
            title: article.title,
            link: article.link,
            digest: article.digest || '',
            cover: article.cover,
            create_time: article.create_time * 1000,
            update_time: article.update_time * 1000,
            author: article.author || '',
            itemidx: article.itemidx
          };
          
          const articleId = formattedArticle.aid || formattedArticle.link;
          if (articleId && !existingArticleIds.has(articleId)) {
            newArticles.push(formattedArticle);
            existingArticleIds.add(articleId);
            log(`Added new article: ${formattedArticle.title}`);
            
            // 发送文章更新事件
            emitter.emit('article-update', {
              action: 'add',
              article: formattedArticle
            });
          } else {
            log(`Skipped existing article: ${formattedArticle.title}`);
          }
        }
      }
    } catch (error) {
      log(`Failed to get total article count: ${error.message}`);
      return { success: false, message: `Failed to get total article count: ${error.message}` };
    }
    
    // 从第二页开始获取
    begin = 10;
    
    while (hasMore) {
      const count = 10; // 每次获取10篇文章
      
      // 检查是否已经达到或超过总文章数
      const currentTotalArticles = newArticles.length + localArticles.length;
      if (currentTotalArticles >= totalArticleCount) {
        log(`Stopping sync: Reached total count`, {
          currentTotalArticles,
          totalArticleCount
        });
        hasMore = false;
        break;
      }
      
      // 检查begin值是否超出范围
      if (begin >= totalArticleCount) {
        log(`Stopping sync: Begin value ${begin} exceeds total count ${totalArticleCount}`);
        hasMore = false;
        break;
      }
      
      // 发送进度更新
      emitter.emit('sync-progress', {
        message: `正在同步文章 ${begin+1} - ${begin+count}...`,
        progress: { synced: begin, total: totalArticleCount }
      });
      
      try {
        log(`Fetching page with begin=${begin}, count=${count}`);
        // 构建请求选项
        const options = {
          method: 'GET',
          headers: {
            'Cookie': settings.cookie,
            'User-Agent': getUserAgent()
          },
          params: {
            action: 'list_ex',
            begin,
            count,
            fakeid,
            type: '9',
            query: '',
            token: settings.token,
            lang: 'zh_CN',
            f: 'json',
            ajax: '1'
          }
        };
        
        // 发送请求
        const result = await safeRequest('https://mp.weixin.qq.com/cgi-bin/appmsg', options);
        
        // 检查结果
        if (!result.success) {
          log(`Failed to fetch articles batch: ${result.message}`);
          if (begin === 10) {
            return { success: false, message: `Failed to fetch articles: ${result.message}` };
          }
          break; // 跳出循环，使用已获取的文章
        }
        
        // 标记已成功获取
        fetchSuccessful = true;
        
        const data = result.data;
        log(`Page response:`, {
          base_resp: data.base_resp,
          app_msg_list_length: data.app_msg_list?.length
        });
        
        if (!data.base_resp || data.base_resp.ret !== 0) {
          log(`Error in API response:`, data.base_resp);
          if (data.base_resp && data.base_resp.err_msg) {
            emitter.emit('sync-progress', {
              message: `API错误: ${data.base_resp.err_msg}`,
              progress: { error: true }
            });
          }
          // 如果是第一批就失败，则终止同步
          if (begin === 10) {
            return {
              success: false,
              message: `Error code: ${data.base_resp?.ret}, ${data.base_resp?.err_msg || 'Unknown error'}`
            };
          } 
          // 否则跳出循环，使用已获取的内容
          break;
        }
        
        const articles = data.app_msg_list || [];
        log(`Processing ${articles.length} articles from current page`);
        
        // 如果返回的文章列表为空，说明已经到达末尾
        if (articles.length === 0) {
          log(`Stopping sync: Empty article list received`);
          hasMore = false;
          break;
        }
        
        // 处理文章
        for (const article of articles) {
          if (!article) continue; // 跳过无效文章
          
          // 格式化文章数据
          const formattedArticle = {
            aid: article.aid,
            title: article.title,
            link: article.link,
            digest: article.digest || '',
            cover: article.cover,
            create_time: article.create_time * 1000, // 转换为毫秒
            update_time: article.update_time * 1000, // 转换为毫秒
            author: article.author || '',
            itemidx: article.itemidx
          };
          
          // 如果不在现有文章ID集合中，则添加
          const articleId = formattedArticle.aid || formattedArticle.link;
          if (articleId && !existingArticleIds.has(articleId)) {
            newArticles.push(formattedArticle);
            log(`Added new article: ${formattedArticle.title}`);
            
            // 发送文章更新事件
            emitter.emit('article-update', {
              action: 'add',
              article: formattedArticle
            });
            
            // 添加到存在集合，避免重复添加
            existingArticleIds.add(articleId);
          } else {
            log(`Skipped existing article: ${formattedArticle.title}`);
          }
        }
        
        // 检查是否需要继续获取
        const updatedTotalArticles = newArticles.length + localArticles.length;
        log(`Current status:`, {
          currentTotalArticles: updatedTotalArticles,
          totalArticleCount,
          newArticlesCount: newArticles.length,
          localArticlesCount: localArticles.length,
          hasMore: updatedTotalArticles < totalArticleCount
        });
        
        // 如果已经获取了所有文章，结束同步
        if (updatedTotalArticles >= totalArticleCount) {
          log(`Stopping sync: Reached total count`, {
            currentTotalArticles: updatedTotalArticles,
            totalArticleCount
          });
          hasMore = false;
        } else {
          begin += count;
          log(`Continuing sync, next begin=${begin}`);
        }
        
      } catch (error) {
        log(`Error during batch fetch: ${error.message}`);
        // 如果是第一批就失败，返回错误
        if (begin === 10) {
          return {
            success: false,
            message: `Failed to sync: ${error.message}`
          };
        }
        // 否则跳出循环，使用已获取的内容
        break;
      }
      
      // 暂停一下，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 如果没有成功获取任何文章，返回错误
    if (!fetchSuccessful) {
      log(`No articles were successfully fetched`);
      return {
        success: false,
        message: '同步失败：无法获取文章列表'
      };
    }
    
    // 更新所有文章列表
    const allArticles = [...newArticles, ...localArticles];
    log(`Final article counts:`, {
      totalArticles: allArticles.length,
      newArticles: newArticles.length,
      localArticles: localArticles.length
    });
    
    // 按create_time降序排序
    allArticles.sort((a, b) => b.create_time - a.create_time);
    
    // 保存文章到本地
    saveArticles(accountName, allArticles);
    
    // 保存同步进度
    const syncProgress = {
      total: totalArticleCount,
      synced: allArticles.length,
      lastSync: Date.now()
    };
    saveSyncProgress(accountName, syncProgress);
    
    // 构建同步完成消息
    let syncCompleteMessage = '';
    if (newArticles.length > 0) {
      syncCompleteMessage = `同步完成，共 ${allArticles.length} 篇文章，新增 ${newArticles.length} 篇`;
    } else {
      syncCompleteMessage = `同步完成，共 ${allArticles.length} 篇文章，无新增`;
    }
    
    // 发送完成进度
    emitter.emit('sync-progress', {
      message: syncCompleteMessage,
      progress: syncProgress
    });
    
    log(`Sync completed: ${syncCompleteMessage}`);
    
    // 确保返回的消息非空
    return {
      success: true,
      articles: allArticles,
      total: totalArticleCount,
      newCount: newArticles.length,
      message: syncCompleteMessage
    };
  } catch (error) {
    log(`Failed to sync articles: ${error.message}`);
    return { 
      success: false, 
      message: `同步失败: ${error.message}`,
      articles: []
    };
  }
}

// 导出文章到Excel
ipcMain.handle('export-articles', async (event, { accountName, articles }) => {
  try {
    const options = {
      defaultPath: `${accountName}_articles.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    };
    
    const { filePath } = await dialog.showSaveDialog(options);
    
    if (!filePath) return { success: false, message: 'Export cancelled by user' };
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(accountName);
    
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Link', key: 'link', width: 80 },
      { header: 'Publish Date', key: 'publish_time', width: 15 },
      { header: 'Author', key: 'author', width: 15 },
      { header: 'Summary', key: 'digest', width: 100 }
    ];
    
    worksheet.addRows(articles);
    
    await workbook.xlsx.writeFile(filePath);
    
    return { success: true, message: `Exported ${articles.length} articles to ${filePath}` };
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return { success: false, message: `Export error: ${error.message}` };
  }
});

// 获取文章内容
ipcMain.handle('get-article-content', async (event, link) => {
  try {
    console.log('Fetching article content:', link);
    const settings = store.get('settings');
    
    // 确保URL格式正确
    if (!link.startsWith('http')) {
      return {
        success: false,
        message: 'Invalid URL format'
      };
    }
    
    // 构建请求选项
    const options = {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://mp.weixin.qq.com/',
        'Cache-Control': 'no-cache'
      }
    };
    
    // 如果有cookie则添加
    if (settings && settings.cookie) {
      options.headers['Cookie'] = sanitizeCookie(settings.cookie);
    }
    
    const result = await safeRequest(link, options);
    
    if (!result.success) {
      console.error('Failed to fetch article content:', result.message);
      return {
        success: false,
        message: `Failed to fetch article content: ${result.message}`
      };
    }
    
    const html = result.data;
    
    // 检查是否是HTML内容
    if (typeof html !== 'string') {
      console.error('Received non-HTML content:', typeof html);
      return {
        success: false,
        message: 'Invalid content type received'
      };
    }
    
    // 处理HTML内容
    const contentHtml = processArticleHtml(html, link);
    
    return {
      success: true,
      content: contentHtml
    };
  } catch (error) {
    console.error('Error fetching article content:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
});

// 获取文章详情内容 - 增强可靠性
ipcMain.handle('get-article-detail', async (event, url) => {
  try {
    console.log('Fetching article detail content for:', url);
    const settings = store.get('settings');
    
    if (!url.startsWith('http')) {
      return {
        success: false,
        message: 'Invalid URL format'
      };
    }
    
    // 构建请求选项
    const options = {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://mp.weixin.qq.com/',
        'Cache-Control': 'no-cache'
      }
    };
    
    if (settings && settings.cookie) {
      options.headers['Cookie'] = sanitizeCookie(settings.cookie);
    }
    
    const result = await safeRequest(url, options);
    
    if (!result.success) {
      console.error('Failed to fetch article content:', result.message);
      return {
        success: false,
        message: `Failed to fetch article detail: ${result.message}`
      };
    }
    
    const html = result.data;
    
    if (typeof html !== 'string') {
      console.error('Received non-HTML content:', typeof html);
      return {
        success: false,
        message: 'Invalid content type received'
      };
    }
    
    // 提取文章内容
    let title = '';
    let author = '';
    let content = '';
    let publishTime = '';
    
    // 尝试提取标题
    const titleMatch = html.match(/<h1.*?>(.*?)<\/h1>/i) || 
                      html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // 尝试提取作者
    const authorMatch = html.match(/var nickname = "([^"]+)"/i) || 
                       html.match(/作者：<a[^>]*>(.*?)<\/a>/i) ||
                       html.match(/author: '([^']+)'/i);
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1].trim();
    }
    
    // 尝试提取发布时间
    const timeMatch = html.match(/var create_time = "(\d+)"/i) ||
                     html.match(/publish_time = '(\d+)'/i) ||
                     html.match(/publish_time: '(\d+)'/i);
    if (timeMatch && timeMatch[1]) {
      publishTime = timeMatch[1].trim();
    }
    
    // 尝试提取正文内容
    const contentMatch = html.match(/<div class="rich_media_content[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch && contentMatch[1]) {
      content = contentMatch[1].trim();
    }
    
    // 处理HTML内容
    content = processArticleHtml(html, url);
    
    // 构造返回结果
    const detail = {
      title: title,
      author: author,
      publish_time: publishTime,
      content: content
    };
    
    return {
      success: true,
      detail
    };
  } catch (error) {
    console.error('Error fetching article detail:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
});

// 在外部浏览器中打开链接
ipcMain.handle('open-external-link', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external link:', error);
    return { success: false, message: `Failed to open link: ${error.message}` };
  }
});

// 获取本地文章
ipcMain.handle('get-local-articles', (event, accountName) => {
  try {
    const articles = readArticles(accountName);
    
    return {
      success: true,
      articles: articles
    };
  } catch (error) {
    console.error('Failed to get local articles:', error);
    return { success: false, message: `Failed to get local articles: ${error.message}` };
  }
});

// 获取同步进度
ipcMain.handle('get-sync-progress', (event, accountName) => {
  try {
    const progress = getSyncProgress(accountName);
    
    return {
      success: true,
      progress: progress
    };
  } catch (error) {
    console.error('Failed to get sync progress:', error);
    return { success: false, message: `Failed to get sync progress: ${error.message}` };
  }
});

// 合并文章列表，确保不重复
function mergeArticles(existingArticles, newArticles) {
  // 使用Map来快速查找文章
  const articlesMap = new Map();
  
  // 先添加现有文章
  existingArticles.forEach(article => {
    articlesMap.set(article.aid, article);
  });
  
  // 添加新文章
  newArticles.forEach(article => {
    articlesMap.set(article.aid, article);
  });
  
  // 转换回数组并按创建时间排序
  const mergedArticles = Array.from(articlesMap.values());
  mergedArticles.sort((a, b) => b.create_time - a.create_time);
  
  return mergedArticles;
}

// 保存文章到本地存储
function saveArticlesToLocal(accountName, articles, append = false) {
  try {
    const allArticles = store.get('articles') || {};
    
    // 如果append为true，则追加文章，否则替换所有文章
    if (append && allArticles[accountName]) {
      console.log(`Appending ${articles.length} articles to existing ${(allArticles[accountName] || []).length} articles`);
      
      // 获取现有的文章
      const existingArticles = allArticles[accountName] || [];
      
      // 使用Map进行去重，以aid作为唯一标识
      const articlesMap = new Map();
      
      // 先添加已有的文章
      existingArticles.forEach(article => {
        articlesMap.set(article.aid, article);
      });
      
      // 添加新文章，如果有重复的会覆盖
      articles.forEach(article => {
        articlesMap.set(article.aid, article);
      });
      
      // 将Map转回数组
      allArticles[accountName] = Array.from(articlesMap.values());
      console.log(`Total articles after merge: ${allArticles[accountName].length}`);
    } else {
      console.log(`Replacing articles for ${accountName}: ${articles.length} articles`);
      // 直接替换文章
      allArticles[accountName] = articles;
    }
    
    // 保存到store
    store.set('articles', allArticles);
    
    // 更新同步进度
    const syncProgress = store.get('syncProgress') || {};
    syncProgress[accountName] = {
      total: allArticles[accountName].length,
      synced: allArticles[accountName].length,
      lastSync: new Date().toISOString()
    };
    store.set('syncProgress', syncProgress);
    
    console.log(`Saved ${allArticles[accountName].length} articles for ${accountName}`);
    return true;
  } catch (error) {
    console.error('Failed to save articles locally:', error);
    return false;
  }
}

// 读取文章
function readArticles(accountName) {
  const articlesStore = store.get('articles') || {};
  return (articlesStore[accountName] || []).map(a => ({ ...a }));
}

// 保存文章到本地
function saveArticles(accountName, articles) {
  const articlesStore = store.get('articles') || {};
  articlesStore[accountName] = articles;
  store.set('articles', articlesStore);
}

// 读取同步进度
function getSyncProgress(accountName) {
  const progressStore = store.get('syncProgress') || {};
  return progressStore[accountName] || {
    total: 0,
    synced: 0,
    lastSync: null,
    lastArticleTime: 0
  };
}

// 保存同步进度
function saveSyncProgress(accountName, progress) {
  const progressStore = store.get('syncProgress') || {};
  progressStore[accountName] = progress;
  store.set('syncProgress', progressStore);
}

// 处理文章HTML内容
function processArticleHtml(html, baseUrl) {
  try {
    // 提取正文内容
    let content = '';
    
    // 优先尝试提取微信文章特有的内容区域
    const contentMatch = html.match(/<div class="rich_media_content[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch && contentMatch[1]) {
      content = contentMatch[1].trim();
    } else {
      // 尝试提取一般的文章内容区域
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        content = bodyMatch[1].trim();
      } else {
        // 使用整个HTML
        content = html;
      }
    }
    
    // 修复图片地址 - 替换data-src为src
    content = content.replace(/data-src="([^"]+)"/g, (match, src) => {
      // 将相对路径转为绝对路径
      if (src && !src.startsWith('http') && baseUrl) {
        const url = new URL(baseUrl);
        if (src.startsWith('/')) {
          src = `${url.protocol}//${url.host}${src}`;
        } else {
          // 获取baseUrl的目录部分
          const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
          src = `${basePath}${src}`;
        }
      }
      return `src="${src}"`;
    });
    
    // 修复视频地址
    content = content.replace(/data-src="([^"]+)"/g, (match, src) => {
      return `src="${src}"`;
    });
    
    // 移除可能导致问题的script标签
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 移除微信特有的样式类，避免样式冲突
    content = content.replace(/class="wx_/g, 'class="wx-');
    
    // 添加响应式图片样式
    content = content.replace(/<img/g, '<img style="max-width:100%;height:auto;display:block;margin:10px auto;"');
    
    return content;
  } catch (error) {
    console.error('Error processing article HTML:', error);
    return html; // 出错时返回原始HTML
  }
}

// 创建登录窗口
function createLoginWindow() {
  const loginWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: '微信公众平台登录',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-login.js'),
      partition: 'login', // 使用独立的会话存储
      webSecurity: false
    }
  });

  // 加载微信公众平台登录页面
  loginWindow.loadURL('https://mp.weixin.qq.com/');
  
  // 创建一个会话对象用于处理请求
  const session = loginWindow.webContents.session;
  
  // 监听登录页面的网络请求
  session.webRequest.onCompleted({
    urls: [
      'https://mp.weixin.qq.com/cgi-bin/appmsgpublish*',
      'https://mp.weixin.qq.com/cgi-bin/searchbiz*'
    ]
  }, async (details) => {
    try {
      console.log('Captured request:', details.url);
      
      if (details.statusCode === 200) {
        // 获取cookie
        const cookies = await session.cookies.get({ url: 'https://mp.weixin.qq.com' });
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        
        // 从URL中提取token和fingerprint
        if (details.url.includes('cgi-bin/appmsgpublish') || details.url.includes('cgi-bin/searchbiz')) {
          const url = new URL(details.url);
          const token = url.searchParams.get('token');
          const fingerprint = url.searchParams.get('fingerprint');
          
          // 检查是否获取到了必要参数
          if (cookieString && token) {
            console.log('Captured login credentials');
            
            // 保存到设置
            const settings = {
              cookie: cookieString,
              token: token,
              fingerprint: fingerprint || '',
              loggedIn: true,
              lastLogin: new Date().toISOString()
            };
            
            store.set('settings', settings);
            
            // 通知主窗口登录成功
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('login-success', settings);
            }
            
            // 添加一个短暂延迟，确保消息发送
            setTimeout(() => {
              // 关闭登录窗口
              loginWindow.close();
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error processing login request:', error);
    }
  });
  
  // 添加开发者工具快捷键
  loginWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key === 'I') || input.key === 'F12') {
      loginWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });
  
  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    loginWindow.webContents.openDevTools();
  }
  
  return loginWindow;
}

// 检查登录状态
function checkLoginStatus() {
  const settings = store.get('settings') || {};
  return settings.loggedIn === true && 
         settings.cookie && 
         settings.token && 
         settings.fingerprint;
}

// 打开登录窗口
ipcMain.handle('open-login-window', async (event) => {
  try {
    // 创建新的登录窗口
    const loginWindow = createLoginWindow();
    
    // 等待窗口关闭
    return new Promise((resolve) => {
      loginWindow.on('closed', () => {
        const settings = store.get('settings') || {};
        resolve({ success: true, loggedIn: settings.loggedIn === true });
      });
    });
  } catch (error) {
    console.error('Failed to open login window:', error);
    return { success: false, message: error.message };
  }
});

// 检查登录状态
ipcMain.handle('check-login-status', (event) => {
  return { loggedIn: checkLoginStatus() };
});

// 登出
ipcMain.handle('logout', (event) => {
  try {
    const settings = store.get('settings') || {};
    settings.loggedIn = false;
    settings.lastLogin = null;
    // 保留cookie、token等以备需要
    store.set('settings', settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to logout:', error);
    return { success: false, message: error.message };
  }
});
