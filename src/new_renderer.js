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
  sortOrder: 'desc', // 默认为降序（新→旧）
  loginCheckTimer: null // 登录状态检查定时器
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

// DOM元素 - 只声明一次
// 公众号相关元素
let accountNameInput, addAccountBtn, accountsList, currentAccountName, 
    progressInfo, exportBtn, articlesData, loadMoreBtn;

// 设置相关元素
let settingsBtn, settingsModal, closeSettingsBtn, saveSettingsBtn, 
    cookieInput, tokenInput, fingerprintInput;

// 文章相关元素
let articleDetailView, articlesView, backBtn, backBtnFloat, 
    articleTitle, articleAuthor, articleDate, articleFrame, 
    sortOrderSelect, articleWebview;

// 提示和错误相关元素
let loadingIndicator, errorContainer, errorMessage, errorDetails;

// 登录相关元素
let loginButton, logoutButton, loginStatus, loginArea, loginStatusText, 
    btnLogin, btnLogout, settingsLoginStatus, lastLoginTime, 
    loginTimeContainer, btnOpenLogin, loginPromptModal, closeLoginPrompt, 
    btnCancelLogin, btnConfirmLogin;

// 主内容区域
let mainContent, loginPage, appHeader, headerMenu;

// 初始化UI引用
function initUIReferences() {
  console.log('初始化UI元素引用...');
  
  // 公众号相关元素
  accountNameInput = document.getElementById('account-name');
  addAccountBtn = document.getElementById('btn-add-account');
  accountsList = document.getElementById('accounts');
  currentAccountName = document.getElementById('current-account-name');
  progressInfo = document.getElementById('progress-info');
  exportBtn = document.getElementById('btn-export');
  articlesData = document.getElementById('articles-data');
  loadMoreBtn = document.getElementById('btn-load-more');
  
  // 设置相关元素
  settingsBtn = document.getElementById('btn-settings');
  settingsModal = document.getElementById('settings-modal');
  closeSettingsBtn = document.querySelector('.close');
  saveSettingsBtn = document.getElementById('btn-save-settings');
  cookieInput = document.getElementById('cookie');
  tokenInput = document.getElementById('token');
  fingerprintInput = document.getElementById('fingerprint');
  
  // 文章相关元素
  articleDetailView = document.getElementById('article-detail-view');
  articlesView = document.getElementById('articles-view');
  backBtn = document.getElementById('btn-back');
  backBtnFloat = document.getElementById('btn-back-float');
  articleTitle = document.getElementById('article-title');
  articleAuthor = document.getElementById('article-author');
  articleDate = document.getElementById('article-date');
  articleFrame = document.getElementById('article-frame');
  sortOrderSelect = document.getElementById('sort-order');
  articleWebview = document.getElementById('article-webview');
  
  // 提示和错误相关元素
  loadingIndicator = document.getElementById('loading-indicator');
  errorContainer = document.getElementById('error-container');
  errorMessage = document.getElementById('error-message');
  errorDetails = document.getElementById('error-details');
  
  // 登录相关元素
  loginButton = document.getElementById('login-button');
  logoutButton = document.getElementById('logout-button');
  loginStatus = document.getElementById('login-status');
  loginArea = document.getElementById('login-area');
  loginStatusText = document.getElementById('login-status-text');
  btnLogin = document.getElementById('btn-login');
  btnLogout = document.getElementById('btn-logout');
  settingsLoginStatus = document.getElementById('settings-login-status');
  lastLoginTime = document.getElementById('last-login-time');
  loginTimeContainer = document.getElementById('login-time-container');
  btnOpenLogin = document.getElementById('btn-open-login');
  loginPromptModal = document.getElementById('login-prompt-modal');
  closeLoginPrompt = document.querySelector('.close-login-prompt');
  btnCancelLogin = document.getElementById('btn-cancel-login');
  btnConfirmLogin = document.getElementById('btn-confirm-login');
  
  // 主内容区域
  mainContent = document.getElementById('main-content');
  loginPage = document.getElementById('login-page');
  appHeader = document.getElementById('app-header');
  headerMenu = document.querySelector('.header');
  
  console.log('UI元素引用初始化完成');
}

// 显示消息提示
function showToast(message) {
  console.log('提示:', message);
  
  // 创建toast元素
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  // 添加到页面
  document.body.appendChild(toast);
  
  // 显示后自动消失
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 3000);
  }, 100);
}

// 处理登录
async function handleLogin() {
  console.log('准备登录...');
  
  try {
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.innerHTML = '<span class="loading"></span>正在打开登录窗口...';
    }
    
    showToast('正在打开登录窗口，请稍候...');
    
    // 打开登录窗口
    await window.api.openLoginWindow();
    console.log('登录窗口已打开');
  } catch (error) {
    console.error('打开登录窗口失败:', error);
    showToast('打开登录窗口失败: ' + (error.message || '未知错误'));
    
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = '登录微信公众平台';
    }
  }
}

// 处理登录窗口关闭
function handleLoginWindowClosed(success) {
  console.log('登录窗口已关闭, 成功状态:', success);
  
  if (loginButton) {
    loginButton.disabled = false;
    loginButton.textContent = '登录微信公众平台';
  }
  
  if (success) {
    showToast('登录成功！');
    // 隐藏登录区域，显示主内容
    if (loginArea) loginArea.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (headerMenu) headerMenu.style.display = 'flex';
    
    // 加载公众号列表
    loadAccounts();
  } else {
    showToast('登录未完成或已取消');
  }
}

// 处理登录成功
async function handleLoginSuccess(data) {
  console.log('处理登录成功事件...');
  
  try {
    // 更新设置
    state.settings = {
      cookie: data.cookie || '',
      token: data.token || '',
      fingerprint: data.fingerprint || '',
      loggedIn: true,
      lastLogin: new Date().toISOString()
    };
    
    console.log('更新后的设置:', state.settings);
    
    // 保存设置
    await window.api.saveSettings(state.settings);
    
    // 更新UI
    updateLoginStatus();
    
    // 检查登录状态并控制界面
    checkAndControlLoginState();
    
    showToast('登录成功！正在加载数据...');
    
    // 延迟加载公众号列表，确保DOM已更新
    setTimeout(() => {
      loadAccounts().catch(err => {
        console.error('加载公众号列表失败:', err);
      });
    }, 500);
  } catch (error) {
    console.error('处理登录成功时出错:', error);
    showToast('处理登录数据时出错，请重试');
  }
}

// 处理登出
async function handleLogout() {
  try {
    const result = await window.api.logout();
    
    if (result.success) {
      // 更新状态
      state.settings.loggedIn = false;
      state.settings.cookie = '';
      state.settings.token = '';
      state.settings.fingerprint = '';
      
      // 显示登录区域，隐藏主内容
      if (loginArea) loginArea.style.display = 'flex';
      if (mainContent) mainContent.style.display = 'none';
      if (headerMenu) headerMenu.style.display = 'none';
      
      showToast('已成功退出登录');
    } else {
      showToast('退出登录失败: ' + result.message);
    }
  } catch (error) {
    console.error('登出时出错:', error);
    showToast('登出时出错: ' + error.message);
  }
}

// 关闭登录提示弹窗
function closeLoginPromptModal() {
  if (loginPromptModal) {
    loginPromptModal.style.display = 'none';
  }
}

// 检查登录状态并控制界面显示
async function checkAndControlLoginState() {
  console.log('检查登录状态并控制界面显示...');
  
  try {
    // 确保设置已加载
    if (!state.settings || typeof state.settings.loggedIn === 'undefined') {
      await loadSettings();
    }
    
    const loggedIn = state.settings.loggedIn && 
                     state.settings.cookie && 
                     state.settings.token;
    
    console.log('登录状态:', loggedIn ? '已登录' : '未登录');
    
    // 确保DOM元素存在
    if (mainContent && loginPage && appHeader) {
      // 根据登录状态显示或隐藏相应元素
      if (loggedIn) {
        console.log('显示主界面');
        mainContent.style.display = 'block';
        loginPage.style.display = 'none';
        appHeader.style.display = 'flex';
        
        // 如果还没有加载公众号列表，则加载
        if (!state.accounts || state.accounts.length === 0) {
          setTimeout(() => {
            loadAccounts().catch(err => {
              console.error('加载公众号列表失败:', err);
              showToast('加载公众号列表失败，请尝试重新登录');
            });
          }, 500);
        }
      } else {
        console.log('显示登录页面');
        mainContent.style.display = 'none';
        loginPage.style.display = 'flex';
        appHeader.style.display = 'none';
      }
    } else {
      console.warn('部分主界面元素不存在，无法切换显示状态', {
        mainContent: !!mainContent,
        loginPage: !!loginPage,
        appHeader: !!appHeader
      });
    }
    
    // 更新登录状态显示
    updateLoginStatus();
    
    return loggedIn;
  } catch (error) {
    console.error('检查登录状态出错:', error);
    return false;
  }
}

// 更新登录状态显示
function updateLoginStatus() {
  try {
    // 更新顶部登录状态显示
    if (loginStatusText && btnLogin && btnLogout) {
      if (state.settings.loggedIn) {
        loginStatusText.textContent = '已登录';
        loginStatusText.className = 'logged-in';
        btnLogin.style.display = 'none';
        btnLogout.style.display = 'inline-block';
      } else {
        loginStatusText.textContent = '未登录';
        loginStatusText.className = 'not-logged-in';
        btnLogin.style.display = 'inline-block';
        btnLogout.style.display = 'none';
      }
    }
    
    // 更新设置中的登录状态显示
    if (settingsLoginStatus && lastLoginTime && loginTimeContainer) {
      if (state.settings.loggedIn) {
        settingsLoginStatus.textContent = '已登录';
        settingsLoginStatus.className = 'logged-in';
        
        if (state.settings.lastLogin) {
          lastLoginTime.textContent = formatDate(state.settings.lastLogin);
          loginTimeContainer.style.display = 'block';
        } else {
          loginTimeContainer.style.display = 'none';
        }
        
        if (btnOpenLogin) btnOpenLogin.textContent = '重新登录';
      } else {
        settingsLoginStatus.textContent = '未登录';
        settingsLoginStatus.className = 'not-logged-in';
        loginTimeContainer.style.display = 'none';
        if (btnOpenLogin) btnOpenLogin.textContent = '登录';
      }
    }
  } catch (error) {
    console.error('更新登录状态显示时出错:', error);
  }
}

// 加载设置
async function loadSettings() {
  try {
    console.log('加载设置...');
    const settings = await window.api.getSettings();
    
    // 更新state中的设置
    state.settings = {
      cookie: settings?.cookie || '',
      token: settings?.token || '',
      fingerprint: settings?.fingerprint || '',
      loggedIn: !!(settings?.cookie && settings?.token),
      lastLogin: settings?.lastLogin || null
    };
    
    console.log('设置加载完成. 登录状态:', state.settings.loggedIn);
    
    // 如果在设置页面，更新输入框
    if (cookieInput && tokenInput && fingerprintInput) {
      cookieInput.value = state.settings.cookie || '';
      tokenInput.value = state.settings.token || '';
      fingerprintInput.value = state.settings.fingerprint || '';
    }
    
    return state.settings;
  } catch (error) {
    console.error('加载设置时出错:', error);
    return null;
  }
}

// 设置登录状态定时检查
function setupLoginCheckTimer() {
  // 清除可能存在的旧定时器
  if (state.loginCheckTimer) {
    clearInterval(state.loginCheckTimer);
  }
  
  // 每30分钟检查一次登录状态
  const THIRTY_MINUTES = 30 * 60 * 1000;
  state.loginCheckTimer = setInterval(async () => {
    try {
      console.log('定时检查登录状态...');
      const loginStatus = await window.api.checkLoginStatus();
      
      if (!loginStatus.loggedIn && state.settings.loggedIn) {
        console.log('检测到登录已失效，更新状态');
        state.settings.loggedIn = false;
        updateLoginStatus();
        checkAndControlLoginState();
        showToast('登录已失效，请重新登录');
      }
    } catch (error) {
      console.error('检查登录状态时出错:', error);
    }
  }, THIRTY_MINUTES);
  
  console.log('已设置登录状态定时检查');
}

// 加载公众号列表
async function loadAccounts() {
  try {
    console.log('加载公众号列表...');
    
    // 显示加载中
    if (!accountsList) {
      // 尝试重新获取elements
      accountsList = document.getElementById('accounts');
      if (!accountsList) {
        // 检查其他可能的IDs
        accountsList = document.getElementById('accounts-list') || 
                       document.querySelector('.accounts-list');
        
        if (!accountsList) {
          console.error('找不到公众号列表元素');
          return;
        }
      }
    }
    
    // 显示加载消息
    accountsList.innerHTML = '<div class="loading-accounts">正在加载公众号列表...</div>';
    
    // 获取公众号列表
    const accounts = await window.api.getAccounts();
    console.log('获取到公众号列表:', accounts);
    
    // 更新state
    state.accounts = Array.isArray(accounts) ? accounts : [];
    
    // 渲染列表
    renderAccountsList();
    
    return state.accounts;
  } catch (error) {
    console.error('加载公众号列表失败:', error);
    
    if (accountsList) {
      accountsList.innerHTML = '<div class="error-message">加载公众号列表失败，请尝试重新登录</div>';
    }
    
    showToast('加载公众号列表失败');
    return [];
  }
}

// 渲染公众号列表
function renderAccountsList() {
  if (!accountsList) {
    console.error('公众号列表元素不存在');
    return;
  }
  
  try {
    // 清空列表
    accountsList.innerHTML = '';
    
    if (!state.accounts || state.accounts.length === 0) {
      accountsList.innerHTML = '<div class="no-accounts">暂无公众号，请添加公众号</div>';
      return;
    }
    
    // 创建列表项
    state.accounts.forEach(account => {
      const item = document.createElement('div');
      item.className = 'account-item';
      if (state.currentAccount && state.currentAccount.name === account.name) {
        item.classList.add('active');
      }
      
      item.innerHTML = `
        <div class="account-info">
          <div class="account-name">${account.name}</div>
          <div class="account-actions">
            <button class="btn-edit">编辑</button>
            <button class="btn-delete">删除</button>
          </div>
        </div>
      `;
      
      // 点击选择公众号
      item.addEventListener('click', () => {
        selectAccount(account);
      });
      
      // 编辑按钮
      const editBtn = item.querySelector('.btn-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editAccount(account);
        });
      }
      
      // 删除按钮
      const deleteBtn = item.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteAccount(account.name);
        });
      }
      
      accountsList.appendChild(item);
    });
  } catch (error) {
    console.error('渲染公众号列表出错:', error);
    accountsList.innerHTML = '<div class="error-message">渲染公众号列表出错</div>';
  }
}

// 禁用或启用登录按钮
function disableLoginButtons(disabled) {
  // 尝试获取主登录按钮
  const mainLoginBtn = document.getElementById('main-login-btn');
  
  // 禁用所有登录按钮
  const loginButtons = [
    btnLogin,
    mainLoginBtn,
    btnOpenLogin
  ];
  
  console.log('禁用登录按钮:', disabled, '按钮状态:', {
    btnLogin: !!btnLogin,
    mainLoginBtn: !!mainLoginBtn,
    btnOpenLogin: !!btnOpenLogin
  });
  
  loginButtons.forEach(btn => {
    if (btn) {
      btn.disabled = disabled;
      if (disabled) {
        btn.classList.add('disabled');
        // 保存原文本并设置加载文本
        btn.dataset.originalText = btn.textContent;
        btn.textContent = '正在处理...';
      } else {
        btn.classList.remove('disabled');
        // 恢复原文本
        if (btn.dataset.originalText) {
          btn.textContent = btn.dataset.originalText;
        }
      }
    }
  });
}

// 显示登录进行中的提示
function showLoginInProgressToast(message) {
  // 移除可能存在的旧提示
  if (window.loginProgressToast && document.body.contains(window.loginProgressToast)) {
    document.body.removeChild(window.loginProgressToast);
  }
  
  // 创建新提示
  const toast = document.createElement('div');
  toast.className = 'login-progress-toast';
  toast.innerHTML = `
    <div class="spinner"></div>
    <div class="message">${message}</div>
  `;
  
  // 添加到页面
  document.body.appendChild(toast);
  
  // 保存引用
  window.loginProgressToast = toast;
}

// 打开登录窗口(扫码登录)
async function openLoginWindow() {
  console.log('开始打开登录窗口...');
  
  try {
    closeLoginPromptModal();
    
    // 显示加载提示
    showToast('正在打开扫码登录窗口...');
    
    // 禁用登录按钮，避免重复点击
    disableLoginButtons(true);
    
    console.log('准备调用主进程打开登录窗口...');
    
    // 调用主进程打开登录窗口
    let result;
    try {
      result = await window.api.openLoginWindow();
      console.log('主进程返回结果:', result);
    } catch (error) {
      console.error('调用主进程openLoginWindow时出错:', error);
      showToast('打开登录窗口失败: ' + (error?.message || '未知错误'));
      disableLoginButtons(false);
      return;
    }
    
    if (result && result.success) {
      console.log('登录窗口已成功打开');
      showToast('请在新窗口中扫描二维码登录');
      
      // 监听登录窗口关闭事件
      console.log('设置登录窗口关闭事件监听...');
      window.api.onLoginWindowClosed((data) => {
        console.log('登录窗口关闭事件触发, 数据:', data);
        
        // 恢复按钮状态
        disableLoginButtons(false);
        
        if (data && data.loggedIn) {
          console.log('登录成功!');
          showToast('登录成功! 正在加载数据...');
          
          // 延迟加载设置和控制界面状态
          setTimeout(async () => {
            await loadSettings();
            checkAndControlLoginState();
          }, 500);
        } else {
          console.log('登录未完成');
          showToast('登录未完成或已取消');
        }
      });
    } else {
      console.error('打开登录窗口失败:', result);
      showToast('打开登录窗口失败: ' + (result?.message || '未知错误'));
      disableLoginButtons(false);
    }
  } catch (error) {
    console.error('打开登录窗口过程中发生错误:', error);
    showToast('打开登录窗口出错: ' + (error?.message || '未知错误'));
    disableLoginButtons(false);
  }
}

// 登出
async function logout() {
  try {
    // 确认是否要登出
    if (!confirm('确定要退出登录吗？')) {
      return;
    }
    
    // 调用API登出
    const result = await window.api.logout();
    
    if (result.success) {
      // 清除设置中的登录信息
      state.settings.cookie = '';
      state.settings.token = '';
      state.settings.fingerprint = '';
      state.settings.loggedIn = false;
      state.settings.lastLogin = null;
      
      // 更新登录状态显示
      updateLoginStatus();
      
      // 切换到登录页面
      checkAndControlLoginState();
      
      showToast('已成功退出登录');
    } else {
      showToast('退出登录失败: ' + result.message);
    }
  } catch (error) {
    console.error('登出时出错:', error);
    showToast('登出时出错: ' + error.message);
  }
}

// 设置登录事件监听
function setupLoginListeners() {
  console.log('开始设置登录事件监听...');
  
  // 顶部登录按钮
  if (btnLogin) {
    btnLogin.addEventListener('click', openLoginWindow);
    console.log('已为顶部登录按钮添加点击事件');
  } else {
    console.warn('顶部登录按钮元素不存在');
  }
  
  // 顶部登出按钮
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  } else {
    console.warn('顶部登出按钮元素不存在');
  }
  
  // 设置中的登录按钮
  if (btnOpenLogin) {
    btnOpenLogin.addEventListener('click', openLoginWindow);
  } else {
    console.warn('设置中的登录按钮元素不存在');
  }
  
  // 登录提示弹窗关闭按钮
  if (closeLoginPrompt) {
    closeLoginPrompt.addEventListener('click', closeLoginPromptModal);
  } else {
    console.warn('登录提示弹窗关闭按钮元素不存在');
  }
  
  // 登录提示弹窗确认按钮
  if (btnConfirmLogin) {
    btnConfirmLogin.addEventListener('click', openLoginWindow);
  } else {
    console.warn('登录提示弹窗确认按钮元素不存在');
  }
  
  // 主登录页面的登录按钮
  try {
    const mainLoginBtn = document.getElementById('main-login-btn');
    console.log('主登录按钮元素获取结果:', mainLoginBtn ? '成功找到' : '未找到');
    
    if (mainLoginBtn) {
      console.log('正在为主登录按钮添加点击事件监听器');
      
      // 移除可能已存在的事件监听器以避免重复绑定
      mainLoginBtn.removeEventListener('click', openLoginWindow);
      
      // 添加新的事件监听器
      mainLoginBtn.addEventListener('click', function(event) {
        console.log('主登录按钮被点击了!');
        event.preventDefault();
        openLoginWindow();
      });
      
      console.log('主登录按钮事件监听器添加完成');
    } else {
      console.warn('未找到主登录按钮元素，无法添加事件监听器');
    }
  } catch (error) {
    console.error('为主登录按钮添加事件监听器时出错:', error);
  }
  
  // 登录成功事件监听
  window.api.onLoginSuccess((data) => {
    console.log('收到登录成功事件:', data);
    
    // 处理登录成功
    handleLoginSuccess(data);
  });
  
  // 账号密码登录按钮
  const accountLoginBtn = document.getElementById('account-login-btn');
  if (accountLoginBtn) {
    accountLoginBtn.addEventListener('click', function() {
      showToast('账号密码登录功能暂未实现，请使用扫码登录');
    });
  }
}

// 设置事件监听
function setupEventListeners() {
  // 设置登录相关的事件监听
  setupLoginListeners();
  
  // 监听公众号相关事件
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      if (accountNameInput && accountNameInput.value) {
        addAccount(accountNameInput.value);
      } else {
        showToast('请输入公众号名称');
      }
    });
  }
  
  if (accountNameInput) {
    accountNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && accountNameInput.value) {
        addAccount(accountNameInput.value);
      }
    });
  }
  
  // 排序下拉框
  if (sortOrderSelect) {
    sortOrderSelect.addEventListener('change', () => {
      state.sortOrder = sortOrderSelect.value;
      sortArticles();
      renderArticles();
    });
  }
  
  // 加载更多按钮
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreArticles);
  }
  
  // 导出按钮
  if (exportBtn) {
    exportBtn.addEventListener('click', exportArticles);
  }
  
  // 返回按钮
  if (backBtn) {
    backBtn.addEventListener('click', backToList);
  }
  
  if (backBtnFloat) {
    backBtnFloat.addEventListener('click', backToList);
  }
  
  // 设置按钮
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsModal) {
        settingsModal.style.display = 'block';
      }
    });
  }
  
  // 关闭设置按钮
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }
  
  // 保存设置按钮
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  // 点击其他地方关闭模态框
  window.addEventListener('click', (e) => {
    if (settingsModal && e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
    
    if (loginPromptModal && e.target === loginPromptModal) {
      loginPromptModal.style.display = 'none';
    }
  });
  
  // 监听登录成功事件
  window.api.onLoginSuccess((data) => {
    handleLoginSuccess(data);
  });
}

// 初始化应用
async function init() {
  try {
    console.log('初始化应用...');
    
    // 初始化UI引用
    initUIReferences();
    
    // 加载设置
    await loadSettings();
    console.log('设置加载完成');
    
    // 设置事件监听
    setupEventListeners();
    console.log('事件监听设置完成');
    
    // 检查登录状态并控制界面显示
    await checkAndControlLoginState();
    console.log('登录状态检查完成');
    
    // 设置登录状态定时检查
    setupLoginCheckTimer();
    console.log('登录检查定时器设置完成');
    
    // 添加window事件监听，以便在控制台中调试
    window.checkLogin = checkAndControlLoginState;
    window.loadAccountsList = loadAccounts;
    window.openLogin = openLoginWindow;
    
    // 显示初始化完成消息
    showToast('应用初始化完成');
    console.log('应用初始化完成');
  } catch (error) {
    console.error('初始化应用时出错:', error);
    showToast('初始化应用出错，请刷新页面重试');
  }
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容加载完成，开始初始化应用...');
  init().catch(err => {
    console.error('初始化失败:', err);
  });
});

// 直接为主登录按钮绑定事件，确保无论如何它都能正常工作
window.addEventListener('load', () => {
  const mainLoginBtn = document.getElementById('main-login-btn');
  if (mainLoginBtn) {
    console.log('页面加载完成，确保主登录按钮有事件绑定');
    
    mainLoginBtn.addEventListener('click', (event) => {
      console.log('主登录按钮被点击（通过window.load绑定）');
      event.preventDefault();
      openLoginWindow();
    });
  }
}); 