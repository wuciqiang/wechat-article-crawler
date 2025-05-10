window.accountManager = {};

// 加载公众号列表
window.accountManager.loadAccounts = async function() {
  try {
    const accounts = await window.api.getAccounts();
    window.appState.accounts = accounts;
    window.accountManager.renderAccountsList(); // Internal call
  } catch (error) {
    console.error('加载公众号列表失败:', error);
    window.uiUtils.showToast('加载公众号列表失败');
  }
};

// 渲染公众号列表
window.accountManager.renderAccountsList = function() {
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
    
    if (window.appState.currentAccount && window.appState.currentAccount.name === account.name) {
      const allItems = window.domElements.accountsList.querySelectorAll('li');
      allItems.forEach(item => {
        item.classList.remove('active');
        item.style.background = '#f8f9fa';
        item.style.borderColor = '#e9ecef';
        item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      });
      
      li.classList.add('active');
      li.style.background = '#e3f2fd';
      li.style.borderColor = '#90caf9';
      li.style.boxShadow = '0 2px 8px rgba(33,150,243,0.2)';
    }
    
    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.textContent = account.name;
    accountInfo.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    `;
    
    const actions = document.createElement('div');
    actions.className = 'account-actions';
    actions.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
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
    
    deleteBtn.addEventListener('mouseover', () => {
      deleteBtn.style.background = '#ffcdd2';
    });
    deleteBtn.addEventListener('mouseout', () => {
      deleteBtn.style.background = '#ffebee';
    });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.accountManager.deleteAccount(account.name); // Internal call
    });
    
    actions.appendChild(deleteBtn);
    li.appendChild(accountInfo);
    li.appendChild(actions);
    
    li.addEventListener('click', () => {
      const allItems = window.domElements.accountsList.querySelectorAll('li');
      allItems.forEach(item => {
        item.classList.remove('active');
        item.style.background = '#f8f9fa';
        item.style.borderColor = '#e9ecef';
        item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      });
      
      li.classList.add('active');
      li.style.background = '#e3f2fd';
      li.style.borderColor = '#90caf9';
      li.style.boxShadow = '0 2px 8px rgba(33,150,243,0.2)';
      
      window.accountManager.selectAccount(account); // Internal call
    });
    window.domElements.accountsList.appendChild(li);
  });
};

// 选择公众号
window.accountManager.selectAccount = function(account) {
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
    loadArticles(account); // This function is still in renderer.js for now
  } else {
    window.accountManager.searchAccount(account); // Internal call
  }
};

// 搜索公众号获取fakeid
window.accountManager.searchAccount = async function(account) {
  if (!validateSettings()) return; // This function is still in renderer.js for now
  
  try {
    window.domElements.progressInfo.textContent = '正在搜索公众号...';
    const result = await window.api.searchAccount(account.name);
    if (result.success) {
      account.fakeid = result.fakeid;
      await window.api.saveAccount(account);
      loadArticles(account); // This function is still in renderer.js for now
    } else {
      window.domElements.progressInfo.textContent = result.message;
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('搜索公众号失败:', error);
    window.domElements.progressInfo.textContent = '搜索失败';
    window.uiUtils.showToast('搜索公众号失败');
  }
};

// 添加公众号
window.accountManager.addAccount = async function(name) {
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
    window.accountManager.renderAccountsList(); // Internal call
    window.domElements.accountNameInput.value = '';
    window.accountManager.selectAccount(account); // Internal call
  } catch (error) {
    console.error('添加公众号失败:', error);
    window.uiUtils.showToast('添加公众号失败');
  }
};

// 编辑公众号
window.accountManager.editAccount = function(account) {
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
      window.accountManager.renderAccountsList(); // Internal call
    })
    .catch(error => {
      console.error('编辑公众号失败:', error);
      window.uiUtils.showToast('编辑公众号失败');
    });
};

// 删除公众号
window.accountManager.deleteAccount = async function(accountName) {
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
      window.accountManager.renderAccountsList(); // Internal call
      window.uiUtils.showToast(result.message);
    } else {
      window.uiUtils.showToast(result.message);
    }
  } catch (error) {
    console.error('删除公众号失败:', error);
    window.uiUtils.showToast('删除公众号失败');
  }
};

// 切换账号 (原 switchAccount)
window.accountManager.switchAccount = async function(accountName) {
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

    // Assuming loadArticles will be moved to articleManager or similar later
    // For now, direct call as it's still in renderer.js
    // If currentAccount is found, call loadArticles
    if (window.appState.currentAccount) {
        if (window.appState.currentAccount.fakeid) {
            loadArticles(window.appState.currentAccount); // This function is still in renderer.js for now
        } else {
            window.accountManager.searchAccount(window.appState.currentAccount); // Internal call to get fakeid then loadArticles
        }
    } else {
        window.uiUtils.showToast('未能找到账号: ' + accountName);
    }

    // Original problematic getArticles call is removed as selectAccount already handles loading logic.
    // The selectAccount logic (which calls loadArticles or searchAccount) should be sufficient if currentAccount is set.
    // The primary goal of switchAccount should be to set the currentAccount and trigger the standard selection flow.
    // A more direct way would be to find the account and then call selectAccount.
    // const accountToSelect = window.appState.accounts.find(a => a.name === accountName);
    // if (accountToSelect) {
    //   window.accountManager.selectAccount(accountToSelect);
    // } else {
    //   window.uiUtils.showToast('未能找到账号: ' + accountName);
    // }

  } catch (error) {
    console.error('切换账号失败:', error);
    window.uiUtils.showToast('切换账号失败：' + error.message);
  }
}; 