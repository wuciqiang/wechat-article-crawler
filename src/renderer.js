// 全局状态管理
const state = {
  accounts: [],
  currentAccount: null,
  articles: [],
  currentPage: 0,
  totalArticles: 0,
  isLoading: false,
  settings: {
    cookie: '',
    token: '',
    fingerprint: '',
    loggedIn: false,
    lastLogin: null
  },
  sortOrder: 'desc' // 默认为降序（新→旧）
};

// 格式化日期时间戳
function formatDate(timestamp) {
  if (!timestamp) return '未知';
  
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// DOM元素
const accountNameInput = document.getElementById('account-name');
const addAccountBtn = document.getElementById('btn-add-account');
const accountsList = document.getElementById('accounts');
const currentAccountName = document.getElementById('current-account-name');
const progressInfo = document.getElementById('progress-info');
const exportBtn = document.getElementById('btn-export');
const articlesData = document.getElementById('articles-data');
const loadMoreBtn = document.getElementById('btn-load-more');
const settingsBtn = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.querySelector('.close');
const saveSettingsBtn = document.getElementById('btn-save-settings');
const cookieInput = document.getElementById('cookie');
const tokenInput = document.getElementById('token');
const fingerprintInput = document.getElementById('fingerprint');
const articleDetailView = document.getElementById('article-detail-view');
const articlesView = document.getElementById('articles-view');
const backBtn = document.getElementById('btn-back');
const backBtnFloat = document.getElementById('btn-back-float');
const articleTitle = document.getElementById('article-title');
const articleAuthor = document.getElementById('article-author');
const articleDate = document.getElementById('article-date');
const articleFrame = document.getElementById('article-frame');
const sortOrderSelect = document.getElementById('sort-order');
const articleWebview = document.getElementById('article-webview');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');

// 登录相关元素
const loginStatusText = document.getElementById('login-status-text');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const settingsLoginStatus = document.getElementById('settings-login-status');
const lastLoginTime = document.getElementById('last-login-time');
const loginTimeContainer = document.getElementById('login-time-container');
const btnOpenLogin = document.getElementById('btn-open-login');
const loginPromptModal = document.getElementById('login-prompt-modal');
const closeLoginPrompt = document.querySelector('.close-login-prompt');
const btnCancelLogin = document.getElementById('btn-cancel-login');
const btnConfirmLogin = document.getElementById('btn-confirm-login');

// 初始化应用
async function initApp() {
  // 设置排序下拉框的初始值
  sortOrderSelect.value = state.sortOrder;
  
  // 加载设置
  await loadSettings();
  
  // 更新登录状态显示
  updateLoginStatus();
  
  // 加载公众号列表
  await loadAccounts();
  
  // 绑定事件
  bindEvents();
  
  // 设置登录事件监听
  setupLoginListeners();
}

// 加载设置
async function loadSettings() {
  try {
    const settings = await window.api.getSettings();
    state.settings = settings;
    
    // 更新设置表单
    cookieInput.value = settings.cookie || '';
    tokenInput.value = settings.token || '';
    fingerprintInput.value = settings.fingerprint || '';
    
    // 更新登录状态
    updateLoginStatus();
  } catch (error) {
    console.error('加载设置失败:', error);
    showToast('加载设置失败');
  }
}

// 更新登录状态显示
function updateLoginStatus() {
  const isLoggedIn = state.settings.loggedIn === true && 
                  state.settings.cookie && 
                  state.settings.token;
  
  // 更新界面显示
  if (isLoggedIn) {
    loginStatusText.textContent = '已登录';
    loginStatusText.className = 'logged-in';
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-block';
    
    settingsLoginStatus.textContent = '已登录';
    settingsLoginStatus.className = 'logged-in';
    
    // 显示上次登录时间
    if (state.settings.lastLogin) {
      const lastLogin = new Date(state.settings.lastLogin);
      lastLoginTime.textContent = lastLogin.toLocaleString('zh-CN');
      loginTimeContainer.style.display = 'block';
    }
  } else {
    loginStatusText.textContent = '未登录';
    loginStatusText.className = 'not-logged-in';
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';
    
    settingsLoginStatus.textContent = '未登录';
    settingsLoginStatus.className = 'not-logged-in';
    loginTimeContainer.style.display = 'none';
  }
}

// 加载公众号列表
async function loadAccounts() {
  try {
    const accounts = await window.api.getAccounts();
    state.accounts = accounts;
    
    // 更新界面
    renderAccountsList();
  } catch (error) {
    console.error('加载公众号列表失败:', error);
    showToast('加载公众号列表失败');
  }
}

// 渲染公众号列表
function renderAccountsList() {
  accountsList.innerHTML = '';
  
  if (state.accounts.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = '暂无公众号，请添加';
    emptyItem.style.color = '#999';
    accountsList.appendChild(emptyItem);
    return;
  }
  
  state.accounts.forEach(account => {
    const li = document.createElement('li');
    li.setAttribute('data-name', account.name);
    
    if (state.currentAccount && state.currentAccount.name === account.name) {
      li.classList.add('active');
    }
    
    // 创建公众号名称和进度容器
    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.textContent = account.name;
    
    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.className = 'account-actions';
    
    // 刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    refreshBtn.textContent = '刷新';
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAccount(account);
      refreshArticles(account);
    });
    
    // 编辑按钮
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editAccount(account);
    });
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAccount(account.name);
    });
    
    // 添加按钮到操作容器
    actions.appendChild(refreshBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    // 添加所有元素到列表项
    li.appendChild(accountInfo);
    li.appendChild(actions);
    
    // 点击公众号选择它
    li.addEventListener('click', () => {
      selectAccount(account);
    });
    
    accountsList.appendChild(li);
  });
}

// 选择公众号
function selectAccount(account) {
  // 关闭文章详情页面
  const articleDetailView = document.getElementById('article-detail-view');
  const articlesView = document.getElementById('articles-view');
  if (articleDetailView && articlesView) {
    articleDetailView.style.display = 'none';
    articlesView.style.display = 'flex';
  }

  // 清空文章列表
  const articlesList = document.getElementById('articles-list');
  if (articlesList) {
    articlesList.innerHTML = '';
  }

  state.currentAccount = account;
  state.articles = [];
  state.currentPage = 0;
  
  // 更新UI
  currentAccountName.textContent = account.name;
  progressInfo.textContent = '未开始获取';
  loadMoreBtn.disabled = true;
  
  // 高亮当前选中的公众号
  const items = accountsList.querySelectorAll('li');
  items.forEach(item => {
    if (item.getAttribute('data-name') === account.name) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // 清空文章列表
  articlesData.innerHTML = '';
  
  // 如果已经有fakeid，则加载文章
  if (account.fakeid) {
    loadArticles(account);
  } else {
    // 否则先搜索获取fakeid
    searchAccount(account);
  }
}

// 搜索公众号获取fakeid
async function searchAccount(account) {
  if (!validateSettings()) return;
  
  try {
    progressInfo.textContent = '正在搜索公众号...';
    
    const result = await window.api.searchAccount(account.name);
    
    if (result.success) {
      // 更新account对象
      account.fakeid = result.fakeid;
      
      // 保存到本地存储
      await window.api.saveAccount(account);
      
      // 加载文章
      loadArticles(account);
    } else {
      progressInfo.textContent = result.message;
      showToast(result.message);
    }
  } catch (error) {
    console.error('搜索公众号失败:', error);
    progressInfo.textContent = '搜索失败';
    showToast('搜索公众号失败');
  }
}

// 加载文章列表
async function loadArticles(account, page = 1) {
  if (!validateSettings()) return;
  if (!account.fakeid) {
    searchAccount(account);
    return;
  }
  
  try {
    state.isLoading = true;
    
    // 先尝试从本地加载
    if (page === 1) {
      progressInfo.textContent = '正在加载本地文章...';
      const localResult = await window.api.getLocalArticles(account.name);
      if (localResult.success && localResult.articles.length > 0) {
        // 获取同步进度
        const syncResult = await window.api.getSyncProgress(account.name);
        const progress = syncResult.success ? syncResult.progress : { total: 0, synced: 0, lastSync: null };
        
        // 更新状态
        state.articles = localResult.articles;
        state.totalArticles = progress.total || localResult.articles.length;
        state.currentPage = 1;
        
        // 应用排序
        sortArticles();
        
        // 更新UI
        renderArticles(false);
        
        // 更新进度信息
        const lastSyncDate = progress.lastSync ? new Date(progress.lastSync).toLocaleString() : '未知';
        progressInfo.textContent = `已从本地加载 ${localResult.articles.length} 篇文章 (最后同步: ${lastSyncDate})`;
        
        // 启用加载更多按钮
        loadMoreBtn.disabled = state.articles.length >= state.totalArticles;
        
        // 添加全量同步按钮
        addSyncAllButton();
        
        state.isLoading = false;
        return; // 已从本地加载，不需要继续
      }
    }
    
    // 本地无数据或需要追加，从网络获取
    progressInfo.textContent = '正在从网络获取文章...';
    loadMoreBtn.disabled = true;
    
    const params = {
      accountName: account.name,
      fakeid: account.fakeid,
      page: page
    };
    
    const result = await window.api.getArticles(params);
    
    if (result.success) {
      // 更新状态
      if (page > 1) {
        state.articles = [...state.articles, ...result.articles];
      } else {
        state.articles = result.articles;
      }
      
      // 应用排序
      sortArticles();
      
      state.totalArticles = result.total;
      state.currentPage = page;
      
      // 更新UI
      renderArticles(page > 1);
      
      // 更新进度信息
      progressInfo.textContent = `已获取 ${state.articles.length}/${state.totalArticles} 篇文章`;
      
      // 是否启用加载更多按钮
      loadMoreBtn.disabled = state.articles.length >= state.totalArticles;
      
      // 添加全量同步按钮
      addSyncAllButton();
    } else {
      progressInfo.textContent = result.message;
      showToast(result.message);
    }
  } catch (error) {
    console.error('加载文章失败:', error);
    progressInfo.textContent = '加载失败';
    showToast('加载文章失败');
  } finally {
    state.isLoading = false;
  }
}

// 渲染文章列表
function renderArticles(append = false) {
  if (!append) {
    articlesData.innerHTML = '';
  }
  
  if (state.articles.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = '暂无文章';
    td.style.textAlign = 'center';
    td.style.padding = '20px';
    tr.appendChild(td);
    articlesData.appendChild(tr);
    return;
  }
  
  // 仅渲染新加载的文章
  const startIndex = append ? articlesData.children.length : 0;
  
  for (let i = startIndex; i < state.articles.length; i++) {
    const article = state.articles[i];
    
    const tr = document.createElement('tr');
    tr.setAttribute('data-index', i);
    
    // 标题列
    const titleTd = document.createElement('td');
    titleTd.className = 'ellipsis-cell';
    const titleLink = document.createElement('a');
    titleLink.href = '#';
    titleLink.textContent = article.title;
    titleLink.className = 'ellipsis-text';
    titleLink.title = article.title; // 鼠标悬停提示
    titleLink.style.color = '#1890ff';
    titleLink.style.textDecoration = 'none';
    titleLink.addEventListener('click', (e) => {
      e.preventDefault();
      showArticleDetail(article);
    });
    titleTd.appendChild(titleLink);
    
    // 作者列
    const authorTd = document.createElement('td');
    authorTd.className = 'ellipsis-cell';
    const authorText = article.author || '未知';
    authorTd.textContent = authorText;
    authorTd.title = authorText; // 鼠标悬停提示
    
    // 发布日期列
    const dateTd = document.createElement('td');
    // 使用create_time时间戳显示发布日期
    const formattedDate = formatDate(article.create_time);
    dateTd.textContent = formattedDate;
    dateTd.title = formattedDate; // 鼠标悬停提示
    
    // 摘要列
    const digestTd = document.createElement('td');
    digestTd.className = 'ellipsis-cell';
    const digestText = article.digest || '无摘要';
    digestTd.textContent = digestText;
    digestTd.title = digestText; // 鼠标悬停提示
    
    tr.appendChild(titleTd);
    tr.appendChild(authorTd);
    tr.appendChild(dateTd);
    tr.appendChild(digestTd);
    
    articlesData.appendChild(tr);
  }
}

// 显示文章详情 - 仅使用iframe显示内容
function showArticleDetail(article) {
  // 填充文章信息
  articleTitle.textContent = article.title;
  articleAuthor.textContent = `作者: ${article.author || '未知'}`;
  
  // 使用create_time时间戳显示发布日期
  const formattedDate = formatDate(article.create_time);
  articleDate.textContent = `发布日期: ${formattedDate}`;
  
  // 清空iframe内容
  articleFrame.srcdoc = '';
  
  // 重置错误状态
  errorContainer.style.display = 'none';
  loadingIndicator.style.display = 'block';
  
  // 清除旧按钮
  const actionContainer = document.querySelector('.article-actions');
  while (actionContainer.childNodes.length > 1) { // 保留返回按钮
    actionContainer.removeChild(actionContainer.lastChild);
  }
  
  // 切换视图
  articlesView.style.display = 'none';
  articleDetailView.style.display = 'flex';
  
  // 显示iframe
  articleFrame.style.display = 'block';
  
  // 使用API方式获取文章内容
  loadingIndicator.style.display = 'block';
  
  // 获取当前文章在列表中的索引
  const currentIndex = state.articles.findIndex(a => a.link === article.link);
  
  // 添加上一篇和下一篇按钮
  if (currentIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'action-button prev-article';
    prevBtn.textContent = '上一篇';
    prevBtn.style.position = 'fixed';
    prevBtn.style.left = '30%'; // 使用百分比定位
    prevBtn.style.top = '50%';
    prevBtn.style.transform = 'translate(-50%, -50%)';
    prevBtn.style.zIndex = '1000';
    prevBtn.style.cursor = 'pointer';
    prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    prevBtn.style.color = 'white';
    prevBtn.style.border = 'none';
    prevBtn.style.padding = '10px 15px';
    prevBtn.style.borderRadius = '4px';
    prevBtn.style.transition = 'background-color 0.3s';
    prevBtn.addEventListener('mouseover', () => {
      prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });
    prevBtn.addEventListener('mouseout', () => {
      prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    });
    prevBtn.addEventListener('click', () => showArticleDetail(state.articles[currentIndex - 1]));
    actionContainer.appendChild(prevBtn);
  }
  
  if (currentIndex < state.articles.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'action-button next-article';
    nextBtn.textContent = '下一篇';
    nextBtn.style.position = 'fixed';
    nextBtn.style.right = '5%'; // 使用百分比定位
    nextBtn.style.top = '50%';
    nextBtn.style.transform = 'translate(50%, -50%)';
    nextBtn.style.zIndex = '1000';
    nextBtn.style.cursor = 'pointer';
    nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    nextBtn.style.color = 'white';
    nextBtn.style.border = 'none';
    nextBtn.style.padding = '10px 15px';
    nextBtn.style.borderRadius = '4px';
    nextBtn.style.transition = 'background-color 0.3s';
    nextBtn.addEventListener('mouseover', () => {
      nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });
    nextBtn.addEventListener('mouseout', () => {
      nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    });
    nextBtn.addEventListener('click', () => showArticleDetail(state.articles[currentIndex + 1]));
    actionContainer.appendChild(nextBtn);
  }
  
  // API请求获取文章详情
  window.api.getArticleDetail(article.link)
    .then(result => {
      loadingIndicator.style.display = 'none';
      
      if (result.success && result.detail && result.detail.content) {
        // 创建包含完整HTML的文档
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                line-height: 1.8; 
                padding: 20px;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
              }
              img { max-width: 100%; height: auto; border-radius: 4px; }
              a { color: #1890ff; text-decoration: none; }
              a:hover { text-decoration: underline; }
              .rich_media_content { overflow: hidden; }
              pre, code { 
                background-color: #f5f5f5; 
                padding: 8px; 
                border-radius: 4px; 
                overflow: auto;
              }
              blockquote {
                border-left: 4px solid #ddd;
                padding-left: 16px;
                margin-left: 0;
                color: #666;
              }
              /* 微信特有样式兼容 */
              .js_blockquote_wrap { border-left: 4px solid #ddd; padding-left: 16px; color: #666; }
              .__bg_color__ { background-color: transparent !important; } /* 覆盖微信原有样式 */
            </style>
          </head>
          <body>
            <div class="rich_media_content">${result.detail.content || '内容为空'}</div>
          </body>
          </html>
        `;
        
        articleFrame.srcdoc = htmlContent;
      } else {
        // 显示错误信息
        showErrorView(result.message || '获取内容失败', '服务器未返回有效内容');
      }
    })
    .catch(error => {
      loadingIndicator.style.display = 'none';
      showErrorView(error.message || '加载出错', '请求处理过程中发生错误');
    });
  
  // 显示错误视图
  function showErrorView(msg, details) {
    articleFrame.style.display = 'none';
    errorContainer.style.display = 'block';
    errorMessage.textContent = msg || '无法加载文章，请稍后再试';
    
    // 提供更友好的错误信息和解决方案
    const detailsText = details ? `原因: ${details}` : '';
    errorDetails.innerHTML = `
      ${detailsText}
      <div style="margin-top: 15px;">
        <p>可能的解决方法：</p>
        <ul style="text-align: left; margin-top: 8px;">
          <li>检查您的网络连接</li>
          <li>更新登录凭据（Cookie和Token）</li>
          <li>文章可能已被删除或者需要登录才能查看</li>
          <li>微信可能限制了第三方应用访问此内容</li>
        </ul>
      </div>
    `;
  }
}

// 返回文章列表
function backToList() {
  articleDetailView.style.display = 'none';
  articlesView.style.display = 'flex';
  
  // 清空内容
  articleFrame.srcdoc = '';
  
  // 重置状态
  articleFrame.style.display = 'none';
  loadingIndicator.style.display = 'none';
  errorContainer.style.display = 'none';
}

// 添加公众号
async function addAccount(name) {
  if (!name) {
    showToast('请输入公众号名称');
    return;
  }
  
  // 检查是否已存在
  const exists = state.accounts.find(account => account.name === name);
  if (exists) {
    showToast('该公众号已存在');
    return;
  }
  
  const account = { name, fakeid: null };
  
  try {
    // 保存到本地存储
    const accounts = await window.api.saveAccount(account);
    
    // 更新状态
    state.accounts = accounts;
    
    // 更新UI
    renderAccountsList();
    
    // 清空输入框
    accountNameInput.value = '';
    
    // 选择新添加的公众号
    selectAccount(account);
  } catch (error) {
    console.error('添加公众号失败:', error);
    showToast('添加公众号失败');
  }
}

// 编辑公众号
function editAccount(account) {
  const newName = prompt('请输入新的公众号名称:', account.name);
  
  if (!newName || newName === account.name) return;
  
  // 检查是否已存在
  const exists = state.accounts.find(a => a.name === newName && a.name !== account.name);
  if (exists) {
    showToast('该公众号名称已存在');
    return;
  }
  
  // 更新公众号名称
  const updatedAccount = { ...account, name: newName };
  
  // 保存到本地存储
  window.api.saveAccount(updatedAccount)
    .then(accounts => {
      // 更新状态
      state.accounts = accounts;
      
      // 如果当前选中的是被编辑的公众号，更新当前账号
      if (state.currentAccount && state.currentAccount.name === account.name) {
        state.currentAccount = updatedAccount;
        currentAccountName.textContent = newName;
      }
      
      // 更新UI
      renderAccountsList();
    })
    .catch(error => {
      console.error('编辑公众号失败:', error);
      showToast('编辑公众号失败');
    });
}

// 删除公众号
async function deleteAccount(accountName) {
  // 添加删除确认提示
  if (!confirm(`确定要删除公众号"${accountName}"吗？`)) {
    return;
  }
  
  try {
    // 使用正确的 API 调用方式
    const result = await window.api.deleteAccount(accountName);
    
    if (result.success) {
      // 更新状态
      state.accounts = result.accounts;
      
      // 如果当前选中的是被删除的公众号，清空当前选择
      if (state.currentAccount && state.currentAccount.name === accountName) {
        state.currentAccount = null;
        state.articles = [];
        currentAccountName.textContent = '请选择公众号';
        progressInfo.textContent = '未开始获取';
        articlesData.innerHTML = '';
        loadMoreBtn.disabled = true;
      }
      
      // 更新UI
      renderAccountsList();
      
      // 显示成功消息
      showToast(result.message);
    } else {
      // 显示错误消息
      showToast(result.message);
    }
  } catch (error) {
    console.error('删除公众号失败:', error);
    showToast('删除公众号失败');
  }
}

// 刷新文章
function refreshArticles(account) {
  if (!account) return;
  
  state.articles = [];
  state.currentPage = 0;
  
  // 清空文章列表
  articlesData.innerHTML = '';
  
  // 重新加载文章
  loadArticles(account);
}

// 加载更多文章
function loadMoreArticles() {
  if (state.isLoading || !state.currentAccount) return;
  loadArticles(state.currentAccount, state.currentPage + 1);
}

// 导出文章到Excel
async function exportArticles() {
  if (!state.currentAccount || state.articles.length === 0) {
    showToast('没有可导出的文章');
    return;
  }
  
  try {
    progressInfo.textContent = '正在导出文章...';
    
    const params = {
      accountName: state.currentAccount.name,
      articles: state.articles
    };
    
    const result = await window.api.exportArticles(params);
    
    if (result.success) {
      progressInfo.textContent = `已获取 ${state.articles.length}/${state.totalArticles} 篇文章`;
      showToast(result.message);
    } else {
      progressInfo.textContent = result.message;
      showToast(result.message);
    }
  } catch (error) {
    console.error('导出文章失败:', error);
    progressInfo.textContent = '导出失败';
    showToast('导出文章失败');
  }
}

// 保存设置
async function saveSettings() {
  try {
    // 获取表单数据
    const settings = {
      cookie: cookieInput.value.trim(),
      token: tokenInput.value.trim(),
      fingerprint: fingerprintInput.value.trim(),
      // 如果有cookie和token，但未登录，则设置为手动模式
      loggedIn: state.settings.loggedIn,
      lastLogin: state.settings.lastLogin
    };
    
    // 保存设置
    const result = await window.api.saveSettings(settings);
    
    if (result.success) {
      // 更新状态
      state.settings = settings;
      
      // 关闭弹窗
      settingsModal.style.display = 'none';
      
      // 显示提示
      showToast('设置已保存');
      
      // 更新登录状态
      updateLoginStatus();
    } else {
      showToast(`保存设置失败: ${result.message}`);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showToast('保存设置失败');
  }
}

// 验证设置是否完整
function validateSettings() {
  // 检查登录状态
  if (state.settings.loggedIn && state.settings.cookie && state.settings.token) {
    return true;
  }
  
  // 未登录，但有手动设置的参数
  if (state.settings.cookie && state.settings.token) {
    return true;
  }
  
  // 显示登录提示
  showLoginPrompt();
  return false;
}

// 显示登录提示弹窗
function showLoginPrompt() {
  loginPromptModal.style.display = 'block';
}

// 关闭登录提示弹窗
function closeLoginPromptModal() {
  loginPromptModal.style.display = 'none';
}

// 打开登录窗口
async function openLoginWindow() {
  try {
    closeLoginPromptModal();
    
    // 显示加载提示
    showToast('正在打开登录窗口...');
    
    // 调用主进程打开登录窗口
    const result = await window.api.openLoginWindow();
    
    if (result.success) {
      if (result.loggedIn) {
        // 重新加载设置
        await loadSettings();
        showToast('登录成功');
      } else {
        showToast('登录窗口已关闭，未检测到登录');
      }
    } else {
      showToast(`打开登录窗口失败: ${result.message}`);
    }
  } catch (error) {
    console.error('打开登录窗口失败:', error);
    showToast('打开登录窗口失败');
  }
}

// 登出
async function logout() {
  try {
    const result = await window.api.logout();
    
    if (result.success) {
      // 重新加载设置
      await loadSettings();
      showToast('已退出登录');
    } else {
      showToast(`登出失败: ${result.message}`);
    }
  } catch (error) {
    console.error('登出失败:', error);
    showToast('登出失败');
  }
}

// 设置登录事件监听
function setupLoginListeners() {
  // 顶部登录按钮
  btnLogin.addEventListener('click', openLoginWindow);
  
  // 顶部登出按钮
  btnLogout.addEventListener('click', logout);
  
  // 设置中的登录按钮
  btnOpenLogin.addEventListener('click', openLoginWindow);
  
  // 登录提示弹窗关闭按钮
  closeLoginPrompt.addEventListener('click', closeLoginPromptModal);
  
  // 登录提示弹窗取消按钮
  btnCancelLogin.addEventListener('click', closeLoginPromptModal);
  
  // 登录提示弹窗确认按钮
  btnConfirmLogin.addEventListener('click', openLoginWindow);
  
  // 监听登录成功事件
  window.api.onLoginSuccess((settings) => {
    // 更新设置
    state.settings = settings;
    
    // 更新界面
    updateLoginStatus();
    
    // 显示提示
    showToast('登录成功，已自动获取参数');
    
    // 更新设置表单
    cookieInput.value = settings.cookie || '';
    tokenInput.value = settings.token || '';
    fingerprintInput.value = settings.fingerprint || '';
  });
  
  // 点击登录提示弹窗外部关闭
  window.addEventListener('click', (e) => {
    if (e.target === loginPromptModal) {
      closeLoginPromptModal();
    }
  });
}

// 显示简单的toast消息
function showToast(message) {
  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '9999';
  
  // 添加到body
  document.body.appendChild(toast);
  
  // 2秒后移除
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 2000);
}

// 排序文章列表 - 根据创建时间
function sortArticles() {
  if (!state.articles || state.articles.length === 0) return;
  
  // 按照创建时间排序
  state.articles.sort((a, b) => {
    // 先确保create_time字段存在
    const timeA = a.create_time || 0;
    const timeB = b.create_time || 0;
    
    // 根据排序方式进行排序
    if (state.sortOrder === 'desc') {
      return timeB - timeA; // 降序：新→旧
    } else {
      return timeA - timeB; // 升序：旧→新
    }
  });
  
  // 重新渲染文章列表
  renderArticles(false);
}

// 绑定事件
function bindEvents() {
  // 添加公众号
  addAccountBtn.addEventListener('click', () => {
    if (accountNameInput.value.trim()) {
      addAccount(accountNameInput.value.trim());
    }
  });
  
  // 回车添加公众号
  accountNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && accountNameInput.value.trim()) {
      addAccount(accountNameInput.value.trim());
    }
  });
  
  // 确保输入框可以接收输入
  accountNameInput.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止点击事件冒泡
  });
  
  // 排序选择变化事件
  sortOrderSelect.addEventListener('change', () => {
    state.sortOrder = sortOrderSelect.value;
    sortArticles();
  });
  
  // 加载更多文章
  loadMoreBtn.addEventListener('click', () => {
    if (state.isLoading) return;
    
    state.currentPage++;
    loadArticles(state.currentAccount, state.currentPage);
  });
  
  // 返回文章列表按钮
  backBtn.addEventListener('click', backToList);
  backBtnFloat.addEventListener('click', backToList);
  
  // 打开设置面板
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });
  
  // 关闭设置面板
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  
  // 点击模态窗口外部关闭
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });
  
  // 保存设置
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // 导出Excel
  exportBtn.addEventListener('click', exportArticles);
  
  // 设置表格列宽调整功能
  setupTableColumnResize();
}

// 设置表格列宽调整功能
function setupTableColumnResize() {
  const table = document.getElementById('articles-table');
  if (!table) return; // 确保表格存在
  
  const headers = table.querySelectorAll('th');
  
  let isResizing = false;
  let currentTh = null;
  let startX = 0;
  let startWidth = 0;
  
  headers.forEach(th => {
    // 鼠标按下时开始调整大小
    th.addEventListener('mousedown', (e) => {
      // 只有点击右侧边缘时才启用拖动调整
      const thRect = th.getBoundingClientRect();
      const edgeSize = 5;
      
      if (thRect.right - e.clientX < edgeSize) {
        isResizing = true;
        currentTh = th;
        startX = e.clientX;
        startWidth = currentTh.offsetWidth;
        
        // 防止选中文本
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        // 阻止事件传播，避免干扰其他元素
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
  
  // 鼠标移动调整大小 - 只在表格上方监听
  table.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const width = startWidth + (e.clientX - startX);
    if (width > 50) { // 设置最小宽度
      currentTh.style.width = `${width}px`;
    }
    
    // 阻止事件传播
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 鼠标移出表格时也需要监听，以完成调整
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const width = startWidth + (e.clientX - startX);
    if (width > 50) { // 设置最小宽度
      currentTh.style.width = `${width}px`;
    }
  });
  
  // 鼠标释放结束调整
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      currentTh = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });
}

// 添加全量同步按钮
function addSyncAllButton() {
  let syncAllBtn = document.getElementById('btn-sync-all');
  if (!syncAllBtn) {
    syncAllBtn = document.createElement('button');
    syncAllBtn.id = 'btn-sync-all';
    syncAllBtn.className = 'btn';
    syncAllBtn.textContent = '全量同步';
    syncAllBtn.style.marginLeft = '10px';
    syncAllBtn.addEventListener('click', () => syncAllArticles());
    
    const buttonContainer = loadMoreBtn.parentElement;
    buttonContainer.appendChild(syncAllBtn);
  }
}

// 全量同步文章
async function syncAllArticles() {
  if (!state.currentAccount || state.isLoading) return;
  
  try {
    state.isLoading = true;
    
    const syncAllBtn = document.getElementById('btn-sync-all');
    if (syncAllBtn) syncAllBtn.disabled = true;
    loadMoreBtn.disabled = true;
    
    // 保持显示现有文章列表
    progressInfo.textContent = '正在同步文章...';
    
    // 获取最新文章的创建时间，用于增量同步
    let latestArticleTime = 0;
    if (state.articles && state.articles.length > 0) {
      // 假设文章已经按照create_time降序排列
      if (state.sortOrder === 'desc') {
        latestArticleTime = state.articles[0].create_time;
      } else {
        // 如果是升序，则查找最大的create_time
        latestArticleTime = Math.max(...state.articles.map(a => a.create_time || 0));
      }
    }
    
    const params = {
      accountName: state.currentAccount.name,
      fakeid: state.currentAccount.fakeid,
      syncAll: true,
      lastSyncTime: latestArticleTime // 传递上次同步时间，用于增量同步
    };
    
    // 获取同步进度
    const currentArticleCount = state.articles.length;
    
    const result = await window.api.getArticles(params);
    
    if (result.success) {
      // 计算新增文章数量
      const newArticles = [];
      
      // 有些情况下后端可能直接返回处理好的文章列表和新增数量
      if (result.newCount !== undefined && Array.isArray(result.articles)) {
        // 使用后端返回的文章数据和新增数量
        if (result.newCount > 0) {
          // 过滤出真正的新文章（通过对比ID或链接）
          const existingArticleIds = new Set(state.articles.map(a => a.aid || a.link));
          
          for (const article of result.articles) {
            const articleId = article.aid || article.link;
            if (articleId && !existingArticleIds.has(articleId)) {
              newArticles.push(article);
            }
          }
          
          if (newArticles.length > 0) {
            // 添加新文章到现有列表
            state.articles = [...newArticles, ...state.articles];
            
            // 应用排序
            sortArticles();
            
            // 重新渲染文章列表
            renderArticles(false);
          }
        }
        
        // 更新总文章数量
        state.totalArticles = result.total || state.articles.length;
      }
      
      // 更新同步进度信息
      const message = result.message || 
                     (result.newCount > 0 
                       ? `同步完成：共 ${state.articles.length} 篇文章，新增 ${result.newCount} 篇` 
                       : `同步完成：共 ${state.articles.length} 篇文章，无新增`);
      
      progressInfo.textContent = message;
      
      // 同步完成，启用按钮
      if (syncAllBtn) syncAllBtn.disabled = false;
      loadMoreBtn.disabled = state.articles.length >= state.totalArticles;
      
      // 显示不同的提示，取决于是否有新文章
      if (result.newCount > 0) {
        showToast(`同步完成！新增 ${result.newCount} 篇文章`);
      } else {
        showToast('同步完成！没有新文章');
      }
    } else {
      // 显示错误消息
      const errorMessage = result.message || '同步失败，请稍后再试';
      progressInfo.textContent = errorMessage;
      showToast(errorMessage);
      
      if (syncAllBtn) syncAllBtn.disabled = false;
      loadMoreBtn.disabled = false;
    }
  } catch (error) {
    console.error('全量同步失败:', error);
    const errorMessage = error.message || '同步失败';
    progressInfo.textContent = '同步失败: ' + errorMessage;
    showToast('全量同步失败: ' + errorMessage);
    
    const syncAllBtn = document.getElementById('btn-sync-all');
    if (syncAllBtn) syncAllBtn.disabled = false;
    loadMoreBtn.disabled = false;
  } finally {
    state.isLoading = false;
  }
}

// 设置事件监听
function setupEventListeners() {
  // 监听同步进度更新
  window.api.onSyncProgressUpdate((data) => {
    console.log('Sync progress update:', data);
    // 确保是当前公众号的进度更新
    if (state.currentAccount && data.accountName === state.currentAccount.name) {
      // 更新进度信息
      progressInfo.textContent = data.message || '正在同步...';
    }
  });
  
  // 监听文章更新
  window.api.onArticleUpdate((data) => {
    console.log('Article update:', data);
    // 确保是当前公众号的文章更新
    if (state.currentAccount && data.accountName === state.currentAccount.name && data.action === 'add') {
      // 将新文章添加到状态
      state.articles.unshift(data.article);
      
      // 应用排序
      sortArticles();
      
      // 重新渲染文章列表
      renderArticles(false);
    }
  });
}

// 初始化时调用
function init() {
  // 设置事件监听
  setupEventListeners();
  
  // 初始化应用
  initApp();
}

// 启动时调用初始化
init();

async function switchAccount(accountName) {
  try {
    // 关闭文章详情页面
    const articleDetailView = document.getElementById('article-detail-view');
    const articlesView = document.getElementById('articles-view');
    if (articleDetailView && articlesView) {
      articleDetailView.style.display = 'none';
      articlesView.style.display = 'flex';
    }

    // 清空文章列表
    const articlesList = document.getElementById('articles-list');
    if (articlesList) {
      articlesList.innerHTML = '';
    }

    // 更新当前账号
    state.currentAccount = state.accounts.find(a => a.name === accountName);

    // 获取新账号的文章列表
    const result = await window.api.getArticles({
      accountName,
      fakeid: state.accounts.find(a => a.name === accountName)?.fakeid,
      page: 1
    });

    if (result.success) {
      displayArticles(result.articles);
    } else {
      showError('获取文章列表失败：' + result.message);
    }
  } catch (error) {
    console.error('切换账号失败:', error);
    showError('切换账号失败：' + error.message);
  }
} 