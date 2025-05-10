window.appInit = {};

// 初始化应用
window.appInit.initApp = async function() {
  console.log("initApp called from appInit");
  window.domElements.sortOrderSelect.value = window.appState.sortOrder;
  await window.settingsManager.loadSettings(); 
  await window.settingsManager.updateLoginStatus(); // Ensure this is awaited if it becomes async, currently it's sync
  await window.accountManager.loadAccounts(); 
  window.appInit.bindEvents(); // Internal call
  await window.settingsManager.setupLoginListeners(); // Ensure this is awaited if it becomes async
  if (window.domElements.searchArticlesInput) {
    window.domElements.searchArticlesInput.addEventListener('input', window.articleManager.handleSearchInput);
  }
};

// 绑定事件
window.appInit.bindEvents = function() {
  console.log("bindEvents called from appInit");
  window.domElements.addAccountBtn.addEventListener('click', () => {
    if (window.domElements.accountNameInput.value.trim()) {
      window.accountManager.addAccount(window.domElements.accountNameInput.value.trim()); 
    }
  });
  
  window.domElements.accountNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && window.domElements.accountNameInput.value.trim()) {
      window.accountManager.addAccount(window.domElements.accountNameInput.value.trim()); 
    }
  });
  
  window.domElements.accountNameInput.addEventListener('click', (e) => {
    e.stopPropagation(); 
  });
  
  window.domElements.sortOrderSelect.addEventListener('change', () => {
    window.appState.sortOrder = window.domElements.sortOrderSelect.value;
    window.articleManager.sortArticles(); 
  });
  
  window.domElements.loadMoreBtn.addEventListener('click', () => {
    if (window.appState.isLoading) return;
    window.appState.currentPage++;
    window.articleManager.loadMoreArticles(); 
  });
  
  window.domElements.backBtn.addEventListener('click', window.articleManager.backToList); 
  window.domElements.backBtnFloat.addEventListener('click', window.articleManager.backToList);
  
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
  
  window.domElements.saveSettingsBtn.addEventListener('click', window.settingsManager.saveSettings); 
  window.domElements.exportBtn.addEventListener('click', window.articleManager.exportArticles); 
  window.uiUtils.setupTableColumnResize();
};

// 设置事件监听 (主要是 window.api 事件)
window.appInit.setupEventListeners = function() {
  console.log("setupEventListeners called from appInit");
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
      window.articleManager.applySearchAndSort();
      window.articleManager.renderArticles(false);
    }
  });
  // Note: onLoginSuccess is handled within settingsManager.setupLoginListeners
};

// 初始化时调用
window.appInit.init = async function() { // Made init async as initApp is async
  console.log("init called from appInit");
  await window.appInit.setupEventListeners(); // Internal call, ensure it's awaited if it becomes async
  await window.appInit.initApp(); // Internal call
};

// 自动启动应用
// Consider if DOMContentLoaded or similar is needed, but for now direct call assuming scripts are at end of body.
if (document.readyState === 'loading') { //DOMContentLoaded equivalent for script execution
    document.addEventListener('DOMContentLoaded', window.appInit.init);
} else {
    window.appInit.init(); // Or, if scripts are loaded defer/async, this might run too soon.
} 