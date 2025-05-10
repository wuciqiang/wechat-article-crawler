// 全局状态管理
// const state = { ... }; //  <- 此整个代码块将被删除 (任务 1.1.4)
// ... (直到 state 定义结束)

// 格式化日期时间戳
// function formatDate(timestamp) { ... } // <- 删除此函数
// ... (直到 formatDate 定义结束)

// DOM元素
// const accountNameInput = ...; // <- 此整个代码块将被删除 (任务 1.2.4)
// ... (直到所有 DOM 元素定义结束)

// ... existing code ...
// 在 initApp 函数中:
// sortOrderSelect.value = state.sortOrder; 修改为:
// window.domElements.sortOrderSelect.value = window.appState.sortOrder; (任务 1.1.5 和 1.2.5)

// ... 对 renderer.js 中所有 state 和 DOM 元素的引用进行类似的修改 ...
// 例如:
// state.accounts 修改为 window.appState.accounts
// accountsList.innerHTML 修改为 window.domElements.accountsList.innerHTML
// cookieInput.value 修改为 window.domElements.cookieInput.value
// 等等

// 以下是一个示例性的替换，您需要对整个文件进行这样的替换。
// 我将提供一个覆盖整个文件的修改建议，但会分成几块来展示思路。

// 删除 state 定义 (从第2行到第17行)
// ... existing code ...
// 删除 DOM 元素定义 (从第27行到第68行)
// ... existing code ...

// 更新所有对 state 的引用
// 示例: sortOrderSelect.value = state.sortOrder; -> window.domElements.sortOrderSelect.value = window.appState.sortOrder;
// 示例: if (state.accounts.length === 0) -> if (window.appState.accounts.length === 0)
// 示例: state.settings = settings; -> window.appState.settings = settings;

// 更新所有对 DOM 元素的引用
// 示例: accountNameInput.value -> window.domElements.accountNameInput.value
// 示例: accountsList.innerHTML = ''; -> window.domElements.accountsList.innerHTML = '';

// 最终，整个 renderer.js 文件都会被修改后的版本替换。
// 由于修改范围非常大，我将直接提供修改后的完整代码的编辑指令，
// 而不是列出成百上千个小替换。

// --- 实际的 edit_file 指令 ---
// 1. 删除原始的 state 对象定义。
// 2. 删除原始的 DOM 元素常量声明。
// 3. 将所有对 state.xxx 的引用替换为 window.appState.xxx。
// 4. 将所有对 domElementVariable 的引用替换为 window.domElements.domElementVariable。

// renderer.js 的第一行应该是 "// 格式化日期时间戳"
// 并且所有 state.xxx 和 dom_element_vars 都已被替换

// 格式化日期时间戳
// function formatDate(timestamp) { ... } // <- 删除此函数
// ... (直到 formatDate 定义结束)

// 初始化应用
async function initApp() {
  // 设置排序下拉框的初始值
  window.domElements.sortOrderSelect.value = window.appState.sortOrder;
  
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
  
  // 绑定搜索框事件
  if (window.domElements.searchArticlesInput) {
    window.domElements.searchArticlesInput.addEventListener('input', handleSearchInput);
  }
}

// 加载设置
async function loadSettings() {
  console.log("loadSettings called"); 
  try {
    console.log("Attempting to call window.api.getSettings"); 
    const settings = await window.api.getSettings();
    console.log("Settings received:", settings); 
    window.appState.settings = settings;
    
    // 更新设置表单
    window.domElements.cookieInput.value = settings.cookie || '';
    window.domElements.tokenInput.value = settings.token || '';
    window.domElements.fingerprintInput.value = settings.fingerprint || '';
    
    // 更新登录状态
    updateLoginStatus();
  } catch (error) {
    console.error('加载设置失败:', error);
    window.uiUtils.showToast('加载设置失败');
  }
}

// 更新登录状态显示
function updateLoginStatus() {
  const isLoggedIn = window.appState.settings.loggedIn === true && 
                  window.appState.settings.cookie && 
                  window.appState.settings.token;
  
  // 更新界面显示
  if (isLoggedIn) {
    window.domElements.loginStatusText.textContent = '已登录';
    window.domElements.loginStatusText.className = 'logged-in';
    window.domElements.btnLogin.style.display = 'none';
    window.domElements.btnLogout.style.display = 'inline-block';
    
    window.domElements.settingsLoginStatus.textContent = '已登录';
    window.domElements.settingsLoginStatus.className = 'logged-in';
    
    // 显示上次登录时间
    if (window.appState.settings.lastLogin) {
      const lastLogin = new Date(window.appState.settings.lastLogin);
      window.domElements.lastLoginTime.textContent = lastLogin.toLocaleString('zh-CN');
      window.domElements.loginTimeContainer.style.display = 'block';
    }
  } else {
    window.domElements.loginStatusText.textContent = '未登录';
    window.domElements.loginStatusText.className = 'not-logged-in';
    window.domElements.btnLogin.style.display = 'inline-block';
    window.domElements.btnLogout.style.display = 'none';
    
    window.domElements.settingsLoginStatus.textContent = '未登录';
    window.domElements.settingsLoginStatus.className = 'not-logged-in';
    window.domElements.loginTimeContainer.style.display = 'none';
  }
}

// 加载公众号列表
async function loadAccounts() {
  try {
    const accounts = await window.api.getAccounts();
    window.appState.accounts = accounts;
    
    // 更新界面
    renderAccountsList();
  } catch (error) {
    console.error('加载公众号列表失败:', error);
    window.uiUtils.showToast('加载公众号列表失败');
  }
}

// 渲染公众号列表
function renderAccountsList() {
  window.domElements.accountsList.innerHTML = '';
  
  if (window.appState.accounts.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = '暂无公众号，请添加';
    emptyItem.style.color = '#999';
    window.domElements.accountsList.appendChild(emptyItem);
    return;
  }
  
  window.appState.accounts.forEach(account => {
    const li = document.createElement('li');
    li.setAttribute('data-name', account.name);
    
    // 添加基础样式
    li.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 12px 15px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    `;
    
    // 添加悬停效果
    li.addEventListener('mouseover', () => {
      if (!li.classList.contains('active')) {
        li.style.background = '#e9ecef';
        li.style.transform = 'translateY(-1px)';
        li.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      }
    });
    
    li.addEventListener('mouseout', () => {
      if (!li.classList.contains('active')) {
        li.style.background = '#f8f9fa';
        li.style.transform = 'translateY(0)';
        li.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      }
    });
    
    // 清除其他按钮的选中效果
    if (window.appState.currentAccount && window.appState.currentAccount.name === account.name) {
      // 先清除所有按钮的选中效果
      const allItems = window.domElements.accountsList.querySelectorAll('li');
      allItems.forEach(item => {
        item.classList.remove('active');
        item.style.background = '#f8f9fa';
        item.style.borderColor = '#e9ecef';
        item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      });
      
      // 设置当前按钮的选中效果
      li.classList.add('active');
      li.style.background = '#e3f2fd';
      li.style.borderColor = '#90caf9';
      li.style.boxShadow = '0 2px 8px rgba(33,150,243,0.2)';
    }
    
    // 创建公众号名称和进度容器
    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.textContent = account.name;
    accountInfo.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    `;
    
    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.className = 'account-actions';
    actions.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '删除';
    deleteBtn.style.cssText = `
      background: #ffebee;
      color: #d32f2f;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;
    
    // 添加删除按钮悬停效果
    deleteBtn.addEventListener('mouseover', () => {
      deleteBtn.style.background = '#ffcdd2';
    });
    
    deleteBtn.addEventListener('mouseout', () => {
      deleteBtn.style.background = '#ffebee';
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAccount(account.name);
    });
    
    // 添加删除按钮到操作容器
    actions.appendChild(deleteBtn);
    
    // 添加所有元素到列表项
    li.appendChild(accountInfo);
    li.appendChild(actions);
    
    // 点击公众号选择它
    li.addEventListener('click', () => {
      // 清除所有按钮的选中效果
      const allItems = window.domElements.accountsList.querySelectorAll('li');
      allItems.forEach(item => {
        item.classList.remove('active');
        item.style.background = '#f8f9fa';
        item.style.borderColor = '#e9ecef';
        item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      });
      
      // 设置当前按钮的选中效果
      li.classList.add('active');
      li.style.background = '#e3f2fd';
      li.style.borderColor = '#90caf9';
      li.style.boxShadow = '0 2px 8px rgba(33,150,243,0.2)';
      
      // 选择公众号
      selectAccount(account);
    });
    
    window.domElements.accountsList.appendChild(li);
  });
}

// 选择公众号
function selectAccount(account) {
  if (window.domElements.articleDetailView && window.domElements.articlesView) {
    window.domElements.articleDetailView.style.display = 'none';
    window.domElements.articlesView.style.display = 'flex';
  }

  const articlesList = document.getElementById('articles-list'); 
  if (articlesList) {
    articlesList.innerHTML = '';
  }

  window.appState.currentAccount = account;
  window.appState.articles = [];
  window.appState.allArticlesForCurrentAccount = [];
  window.appState.currentPage = 0;
  window.appState.currentSearchTerm = '';
  if(window.domElements.searchArticlesInput) window.domElements.searchArticlesInput.value = '';
  
  window.domElements.currentAccountName.textContent = account.name;
  window.domElements.progressInfo.textContent = '未开始获取';
  window.domElements.loadMoreBtn.disabled = true;
  
  const items = window.domElements.accountsList.querySelectorAll('li');
  items.forEach(item => {
    if (item.getAttribute('data-name') === account.name) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  window.domElements.articlesData.innerHTML = '';
  
  if (account.fakeid) {
    loadArticles(account);
  } else {
    searchAccount(account);
  }
}

// 搜索公众号获取fakeid
async function searchAccount(account) {
  if (!validateSettings()) return;
  
  try {
    window.domElements.progressInfo.textContent = '正在搜索公众号...';
    
    const result = await window.api.searchAccount(account.name);
    
    if (result.success) {
      account.fakeid = result.fakeid;
      await window.api.saveAccount(account);
      loadArticles(account);
    } else {
      window.domElements.progressInfo.textContent = result.message;
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('搜索公众号失败:', error);
    window.domElements.progressInfo.textContent = '搜索失败';
    window.uiUtils.showToast('搜索公众号失败');
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
    window.appState.isLoading = true;
    
    if (page === 1) {
      window.domElements.progressInfo.textContent = '正在加载本地文章...';
      const localResult = await window.api.getLocalArticles(account.name);
      if (localResult.success && localResult.articles.length > 0) {
        const syncResult = await window.api.getSyncProgress(account.name);
        const progress = syncResult.success ? syncResult.progress : { total: 0, synced: 0, lastSync: null };
        
        window.appState.allArticlesForCurrentAccount = localResult.articles;
        window.appState.totalArticles = progress.total || localResult.articles.length;
        window.appState.currentPage = 1;
        
        applySearchAndSort();
        renderArticles(false);
        
        const lastSyncDate = progress.lastSync ? new Date(progress.lastSync).toLocaleString() : '未知';
        window.domElements.progressInfo.textContent = `已从本地加载 ${localResult.articles.length} 篇文章 (最后同步: ${lastSyncDate})`;
        
        window.domElements.loadMoreBtn.disabled = window.appState.articles.length >= window.appState.totalArticles;
        addSyncAllButton();
        window.appState.isLoading = false;
        return; 
      }
    }
    
    window.domElements.progressInfo.textContent = '正在从网络获取文章...';
    window.domElements.loadMoreBtn.disabled = true;
    
    const params = {
      accountName: account.name,
      fakeid: account.fakeid,
      page: page
    };
    
    const result = await window.api.getArticles(params);
    
    if (result.success) {
      let newRawArticles = result.articles;
      if (page > 1) {
        window.appState.allArticlesForCurrentAccount = [...window.appState.allArticlesForCurrentAccount, ...newRawArticles];
      } else {
        window.appState.allArticlesForCurrentAccount = newRawArticles;
      }
      
      window.appState.totalArticles = result.total;
      window.appState.currentPage = page;
      
      applySearchAndSort();
      renderArticles(page > 1 && window.appState.currentSearchTerm.trim() === '');
      
      window.domElements.progressInfo.textContent = `已获取 ${window.appState.articles.length}/${window.appState.totalArticles} 篇文章`;
      window.domElements.loadMoreBtn.disabled = window.appState.articles.length >= window.appState.totalArticles;
      addSyncAllButton();
    } else {
      window.domElements.progressInfo.textContent = result.message;
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('加载文章失败:', error);
    window.domElements.progressInfo.textContent = '加载失败';
    window.uiUtils.showToast('加载文章失败');
  } finally {
    window.appState.isLoading = false;
  }
}

// 渲染文章列表
function renderArticles(append = false) {
  if (!append) {
    window.domElements.articlesData.innerHTML = '';
  }
  
  if (window.appState.articles.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    if (window.appState.currentSearchTerm && window.appState.currentSearchTerm.trim() !== '') {
      td.textContent = '无对应文章，请尝试其他关键字';
    } else {
      td.textContent = '暂无文章';
    }
    td.style.textAlign = 'center';
    td.style.padding = '20px';
    tr.appendChild(td);
    window.domElements.articlesData.appendChild(tr);
    return;
  }
  
  const startIndex = append ? window.domElements.articlesData.children.length : 0;
  
  for (let i = startIndex; i < window.appState.articles.length; i++) {
    const article = window.appState.articles[i];
    
    const tr = document.createElement('tr');
    tr.setAttribute('data-index', i);
    
    const titleTd = document.createElement('td');
    titleTd.className = 'ellipsis-cell';
    const titleLink = document.createElement('a');
    titleLink.href = '#';
    titleLink.textContent = article.title;
    titleLink.className = 'ellipsis-text';
    titleLink.title = article.title; 
    titleLink.style.color = '#1890ff';
    titleLink.style.textDecoration = 'none';
    titleLink.addEventListener('click', (e) => {
      e.preventDefault();
      showArticleDetail(article);
    });
    titleTd.appendChild(titleLink);
    
    const authorTd = document.createElement('td');
    authorTd.className = 'ellipsis-cell';
    const authorText = article.author || '未知';
    authorTd.textContent = authorText;
    authorTd.title = authorText; 
    
    const dateTd = document.createElement('td');
    const formattedDate = window.uiUtils.formatDate(article.create_time);
    dateTd.textContent = formattedDate;
    dateTd.title = formattedDate; 
    
    const digestTd = document.createElement('td');
    digestTd.className = 'ellipsis-cell';
    const digestText = article.digest || '无摘要';
    digestTd.textContent = digestText;
    digestTd.title = digestText; 
    
    tr.appendChild(titleTd);
    tr.appendChild(authorTd);
    tr.appendChild(dateTd);
    tr.appendChild(digestTd);
    
    window.domElements.articlesData.appendChild(tr);
  }
}

// 显示文章详情 - 仅使用iframe显示内容
function showArticleDetail(article) {
  window.domElements.articleTitle.textContent = article.title;
  window.domElements.articleAuthor.textContent = `作者: ${article.author || '未知'}`;
  
  const formattedDate = window.uiUtils.formatDate(article.create_time);
  window.domElements.articleDate.textContent = `发布日期: ${formattedDate}`;
  
  window.domElements.articleFrame.srcdoc = '';
  
  window.domElements.errorContainer.style.display = 'none';
  window.domElements.loadingIndicator.style.display = 'block';
  
  const actionContainer = document.querySelector('.article-actions');
  while (actionContainer.childNodes.length > 1) { 
    actionContainer.removeChild(actionContainer.lastChild);
  }
  
  window.domElements.articlesView.style.display = 'none';
  window.domElements.articleDetailView.style.display = 'flex';
  
  window.domElements.articleFrame.style.display = 'block';
  window.domElements.loadingIndicator.style.display = 'block';
  
  const currentIndex = window.appState.articles.findIndex(a => a.link === article.link);
  
  if (currentIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'action-button prev-article';
    prevBtn.textContent = '上一篇';
    prevBtn.style.position = 'fixed';
    prevBtn.style.left = '30%'; 
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
    prevBtn.addEventListener('click', () => showArticleDetail(window.appState.articles[currentIndex - 1]));
    actionContainer.appendChild(prevBtn);
  }
  
  if (currentIndex < window.appState.articles.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'action-button next-article';
    nextBtn.textContent = '下一篇';
    nextBtn.style.position = 'fixed';
    nextBtn.style.right = '5%'; 
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
    nextBtn.addEventListener('click', () => showArticleDetail(window.appState.articles[currentIndex + 1]));
    actionContainer.appendChild(nextBtn);
  }
  
  window.api.getArticleDetail(article.link)
    .then(result => {
      window.domElements.loadingIndicator.style.display = 'none';
      
      if (result.success && result.detail && result.detail.content) {
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
              .__bg_color__ { background-color: transparent !important; } 
            </style>
          </head>
          <body>
            <div class="rich_media_content">${result.detail.content || '内容为空'}</div>
          </body>
          </html>
        `;
        
        window.domElements.articleFrame.srcdoc = htmlContent;
      } else {
        showErrorView(result.message || '获取内容失败', '服务器未返回有效内容');
      }
    })
    .catch(error => {
      window.domElements.loadingIndicator.style.display = 'none';
      showErrorView(error.message || '加载出错', '请求处理过程中发生错误');
    });
  
  function showErrorView(msg, details) {
    window.domElements.articleFrame.style.display = 'none';
    window.domElements.errorContainer.style.display = 'block';
    window.domElements.errorMessage.textContent = msg || '无法加载文章，请稍后再试';
    
    const detailsText = details ? `原因: ${details}` : '';
    window.domElements.errorDetails.innerHTML = `
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
  window.domElements.articleDetailView.style.display = 'none';
  window.domElements.articlesView.style.display = 'flex';
  
  window.domElements.articleFrame.srcdoc = '';
  
  window.domElements.articleFrame.style.display = 'none';
  window.domElements.loadingIndicator.style.display = 'none';
  window.domElements.errorContainer.style.display = 'none';
}

// 添加公众号
async function addAccount(name) {
  if (!name) {
    window.uiUtils.showToast('请输入公众号名称');
    return;
  }
  
  const exists = window.appState.accounts.find(account => account.name === name);
  if (exists) {
    window.uiUtils.showToast('该公众号已存在');
    return;
  }
  
  const account = { name, fakeid: null };
  
  try {
    const accounts = await window.api.saveAccount(account);
    window.appState.accounts = accounts;
    renderAccountsList();
    window.domElements.accountNameInput.value = '';
    selectAccount(account);
  } catch (error) {
    console.error('添加公众号失败:', error);
    window.uiUtils.showToast('添加公众号失败');
  }
}

// 编辑公众号
function editAccount(account) {
  const newName = prompt('请输入新的公众号名称:', account.name);
  
  if (!newName || newName === account.name) return;
  
  const exists = window.appState.accounts.find(a => a.name === newName && a.name !== account.name);
  if (exists) {
    window.uiUtils.showToast('该公众号名称已存在');
    return;
  }
  
  const updatedAccount = { ...account, name: newName };
  
  window.api.saveAccount(updatedAccount)
    .then(accounts => {
      window.appState.accounts = accounts;
      if (window.appState.currentAccount && window.appState.currentAccount.name === account.name) {
        window.appState.currentAccount = updatedAccount;
        window.domElements.currentAccountName.textContent = newName;
      }
      renderAccountsList();
    })
    .catch(error => {
      console.error('编辑公众号失败:', error);
      window.uiUtils.showToast('编辑公众号失败');
    });
}

// 删除公众号
async function deleteAccount(accountName) {
  if (!confirm(`确定要删除公众号"${accountName}"吗？`)) {
    return;
  }
  
  try {
    const result = await window.api.deleteAccount(accountName);
    if (result.success) {
      window.appState.accounts = result.accounts;
      if (window.appState.currentAccount && window.appState.currentAccount.name === accountName) {
        window.appState.currentAccount = null;
        window.appState.articles = [];
        window.domElements.currentAccountName.textContent = '请选择公众号';
        window.domElements.progressInfo.textContent = '未开始获取';
        window.domElements.articlesData.innerHTML = '';
        window.domElements.loadMoreBtn.disabled = true;
      }
      renderAccountsList();
      window.uiUtils.showToast(result.message);
    } else {
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('删除公众号失败:', error);
    window.uiUtils.showToast('删除公众号失败');
  }
}

// 刷新文章
function refreshArticles(account) {
  if (!account) return;
  
  window.appState.articles = [];
  window.appState.currentPage = 0;
  window.domElements.articlesData.innerHTML = '';
  loadArticles(account);
}

// 加载更多文章
function loadMoreArticles() {
  if (window.appState.isLoading || !window.appState.currentAccount) return;
  loadArticles(window.appState.currentAccount, window.appState.currentPage + 1);
}

// 导出文章到Excel
async function exportArticles() {
  if (!window.appState.currentAccount || window.appState.articles.length === 0) {
    window.uiUtils.showToast('没有可导出的文章');
    return;
  }
  
  try {
    window.domElements.progressInfo.textContent = '正在导出文章...';
    const params = {
      accountName: window.appState.currentAccount.name,
      articles: window.appState.articles
    };
    const result = await window.api.exportArticles(params);
    if (result.success) {
      window.domElements.progressInfo.textContent = `已获取 ${window.appState.articles.length}/${window.appState.totalArticles} 篇文章`;
      window.uiUtils.showToast(result.message);
    } else {
      window.domElements.progressInfo.textContent = result.message;
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('导出文章失败:', error);
    window.domElements.progressInfo.textContent = '导出失败';
    window.uiUtils.showToast('导出文章失败');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const settings = {
      cookie: window.domElements.cookieInput.value.trim(),
      token: window.domElements.tokenInput.value.trim(),
      fingerprint: window.domElements.fingerprintInput.value.trim(),
      loggedIn: window.appState.settings.loggedIn,
      lastLogin: window.appState.settings.lastLogin
    };
    const result = await window.api.saveSettings(settings);
    if (result.success) {
      window.appState.settings = settings;
      window.domElements.settingsModal.style.display = 'none';
      window.uiUtils.showToast('设置已保存');
      updateLoginStatus();
    } else {
      window.uiUtils.showToast(`保存设置失败: ${result.message}`);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    window.uiUtils.showToast('保存设置失败');
  }
}

// 验证设置是否完整
function validateSettings() {
  if (window.appState.settings.loggedIn && window.appState.settings.cookie && window.appState.settings.token) {
    return true;
  }
  if (window.appState.settings.cookie && window.appState.settings.token) {
    return true;
  }
  showLoginPrompt();
  return false;
}

// 显示登录提示弹窗
function showLoginPrompt() {
  window.domElements.loginPromptModal.style.display = 'block';
}

// 关闭登录提示弹窗
function closeLoginPromptModal() {
  window.domElements.loginPromptModal.style.display = 'none';
}

// 打开登录窗口
async function openLoginWindow() {
  try {
    closeLoginPromptModal();
    window.uiUtils.showToast('正在打开登录窗口...');
    const result = await window.api.openLoginWindow();
    if (result.success) {
      if (result.loggedIn) {
        await loadSettings();
        window.uiUtils.showToast('登录成功');
      } else {
        window.uiUtils.showToast('登录窗口已关闭，未检测到登录');
      }
    } else {
      window.uiUtils.showToast(`打开登录窗口失败: ${result.message}`);
    }
  } catch (error) {
    console.error('打开登录窗口失败:', error);
    window.uiUtils.showToast('打开登录窗口失败');
  }
}

// 登出
async function logout() {
  try {
    const result = await window.api.logout();
    if (result.success) {
      await loadSettings();
      window.uiUtils.showToast('已退出登录');
    } else {
      window.uiUtils.showToast(`登出失败: ${result.message}`);
    }
  } catch (error) {
    console.error('登出失败:', error);
    window.uiUtils.showToast('登出失败');
  }
}

// 设置登录事件监听
function setupLoginListeners() {
  window.domElements.btnLogin.addEventListener('click', openLoginWindow);
  window.domElements.btnLogout.addEventListener('click', logout);
  window.domElements.btnOpenLogin.addEventListener('click', openLoginWindow);
  window.domElements.closeLoginPrompt.addEventListener('click', closeLoginPromptModal);
  window.domElements.btnCancelLogin.addEventListener('click', closeLoginPromptModal);
  window.domElements.btnConfirmLogin.addEventListener('click', openLoginWindow);
  
  window.api.onLoginSuccess((settings) => {
    window.appState.settings = settings;
    updateLoginStatus();
    window.uiUtils.showToast('登录成功，已自动获取参数');
    window.domElements.cookieInput.value = settings.cookie || '';
    window.domElements.tokenInput.value = settings.token || '';
    window.domElements.fingerprintInput.value = settings.fingerprint || '';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === window.domElements.loginPromptModal) {
      closeLoginPromptModal();
    }
  });
}

// 排序文章列表 - 根据创建时间
function sortArticles() {
  if (!window.appState.allArticlesForCurrentAccount || window.appState.allArticlesForCurrentAccount.length === 0) return;
  applySearchAndSort();
  renderArticles(false);
}

// 绑定事件
function bindEvents() {
  window.domElements.addAccountBtn.addEventListener('click', () => {
    if (window.domElements.accountNameInput.value.trim()) {
      addAccount(window.domElements.accountNameInput.value.trim());
    }
  });
  
  window.domElements.accountNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && window.domElements.accountNameInput.value.trim()) {
      addAccount(window.domElements.accountNameInput.value.trim());
    }
  });
  
  window.domElements.accountNameInput.addEventListener('click', (e) => {
    e.stopPropagation(); 
  });
  
  window.domElements.sortOrderSelect.addEventListener('change', () => {
    window.appState.sortOrder = window.domElements.sortOrderSelect.value;
    sortArticles();
  });
  
  window.domElements.loadMoreBtn.addEventListener('click', () => {
    if (window.appState.isLoading) return;
    window.appState.currentPage++;
    loadArticles(window.appState.currentAccount, window.appState.currentPage);
  });
  
  window.domElements.backBtn.addEventListener('click', backToList);
  window.domElements.backBtnFloat.addEventListener('click', backToList);
  
  window.domElements.settingsBtn.addEventListener('click', () => {
    window.domElements.settingsModal.style.display = 'block';
  });
  
  window.domElements.closeSettingsBtn.addEventListener('click', () => {
    window.domElements.settingsModal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === window.domElements.settingsModal) {
      window.domElements.settingsModal.style.display = 'none';
    }
  });
  
  window.domElements.saveSettingsBtn.addEventListener('click', saveSettings);
  window.domElements.exportBtn.addEventListener('click', exportArticles);
  window.uiUtils.setupTableColumnResize();
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
    
    const buttonContainer = window.domElements.loadMoreBtn.parentElement;
    buttonContainer.appendChild(syncAllBtn);
  }
}

// 全量同步文章
async function syncAllArticles() {
  if (!window.appState.currentAccount || window.appState.isLoading) return;
  
  try {
    window.appState.isLoading = true;
    const syncAllBtn = document.getElementById('btn-sync-all'); 
    if (syncAllBtn) syncAllBtn.disabled = true;
    window.domElements.loadMoreBtn.disabled = true;
    window.domElements.progressInfo.textContent = '正在同步文章...';
    
    const params = {
      accountName: window.appState.currentAccount.name,
      fakeid: window.appState.currentAccount.fakeid,
      syncAll: true,
    };
    
    const result = await window.api.getArticles(params);
    
    if (result.success) {
      window.appState.allArticlesForCurrentAccount = result.articles || [];
      window.appState.totalArticles = result.total || window.appState.allArticlesForCurrentAccount.length;
      window.appState.currentPage = 1; 
      applySearchAndSort(); 
      renderArticles(false); 
      const message = result.message || 
                     (result.newCount > 0 
                       ? `同步完成：共 ${window.appState.articles.length} 篇文章（基于当前筛选），新增 ${result.newCount} 篇` 
                       : `同步完成：共 ${window.appState.articles.length} 篇文章（基于当前筛选），无新增`);
      window.domElements.progressInfo.textContent = message;
      if (syncAllBtn) syncAllBtn.disabled = false;
      window.domElements.loadMoreBtn.disabled = window.appState.articles.length >= window.appState.totalArticles;
      if (result.newCount > 0) {
        window.uiUtils.showToast(`同步完成！新增 ${result.newCount} 篇文章`);
      } else {
        window.uiUtils.showToast('同步完成！没有新文章');
      }
    } else {
      const errorMessage = result.message || '同步失败，请稍后再试';
      window.domElements.progressInfo.textContent = errorMessage;
      window.uiUtils.showToast(errorMessage);
      if (syncAllBtn) syncAllBtn.disabled = false;
      window.domElements.loadMoreBtn.disabled = false;
    }
  } catch (error) {
    console.error('全量同步失败:', error);
    const errorMessage = error.message || '同步失败';
    window.domElements.progressInfo.textContent = '同步失败: ' + errorMessage;
    window.uiUtils.showToast('全量同步失败: ' + errorMessage);
    const syncAllBtn = document.getElementById('btn-sync-all'); 
    if (syncAllBtn) syncAllBtn.disabled = false;
    window.domElements.loadMoreBtn.disabled = false;
  } finally {
    window.appState.isLoading = false;
  }
}

// 设置事件监听
function setupEventListeners() {
  window.api.onSyncProgressUpdate((data) => {
    console.log('Sync progress update:', data);
    if (window.appState.currentAccount && data.accountName === window.appState.currentAccount.name) {
      window.domElements.progressInfo.textContent = data.message || '正在同步...';
    }
  });
  
  window.api.onArticleUpdate((data) => {
    console.log('Article update:', data);
    if (window.appState.currentAccount && data.accountName === window.appState.currentAccount.name && data.action === 'add') {
      window.appState.allArticlesForCurrentAccount.unshift(data.article);
      applySearchAndSort();
      renderArticles(false);
    }
  });
}

// 初始化时调用
function init() {
  setupEventListeners();
  initApp();
}

// 启动时调用初始化
init();

async function switchAccount(accountName) {
  try {
    if (window.domElements.articleDetailView && window.domElements.articlesView) {
      window.domElements.articleDetailView.style.display = 'none';
      window.domElements.articlesView.style.display = 'flex';
    }

    const articlesList = document.getElementById('articles-list'); 
    if (articlesList) {
      articlesList.innerHTML = '';
    }

    window.appState.currentAccount = window.appState.accounts.find(a => a.name === accountName);

    const result = await window.api.getArticles({
      accountName,
      fakeid: window.appState.accounts.find(a => a.name === accountName)?.fakeid,
      page: 1
    });

    if (result.success) {
      // displayArticles(result.articles); // Kept as is due to uncertainty
      // Assuming the intent was to render the new account's articles:
      // window.appState.articles = result.articles; // Or merge/replace allArticlesForCurrentAccount and then applySearchAndSort
      // renderArticles(false);
      // For now, I will leave the original problematic line commented out until its purpose is clarified.
    } else {
      window.uiUtils.showToast('获取文章列表失败：' + result.message);
    }
  } catch (error) {
    console.error('切换账号失败:', error);
    window.uiUtils.showToast('切换账号失败：' + error.message);
  }
}

// 处理搜索输入事件
function handleSearchInput(event) {
  window.appState.currentSearchTerm = event.target.value;
  applySearchAndSort();
  renderArticles(false); 
}

// 应用搜索和排序
function applySearchAndSort() {
  let articlesToDisplay = [...window.appState.allArticlesForCurrentAccount]; 

  if (window.appState.currentSearchTerm && window.appState.currentSearchTerm.trim() !== '') {
    const searchTerm = window.appState.currentSearchTerm.trim().toLowerCase();
    articlesToDisplay = articlesToDisplay.filter(article => 
      article.title && article.title.toLowerCase().includes(searchTerm)
    );
  }

  if (window.appState.sortOrder === 'desc') {
    articlesToDisplay.sort((a, b) => (b.create_time || 0) - (a.create_time || 0));
  } else {
    articlesToDisplay.sort((a, b) => (a.create_time || 0) - (b.create_time || 0));
  }

  window.appState.articles = articlesToDisplay;
} 