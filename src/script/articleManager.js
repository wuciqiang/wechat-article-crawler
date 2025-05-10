window.articleManager = {};

// 加载文章列表
window.articleManager.loadArticles = async function(account, page = 1) {
  // Validate settings function might be in settingsManager later, or globally available
  if (!validateSettings()) return; 
  if (!account.fakeid) {
    // searchAccount is in accountManager
    window.accountManager.searchAccount(account);
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
        
        window.articleManager.applySearchAndSort(); // Internal call
        window.articleManager.renderArticles(false); // Internal call
        
        const lastSyncDate = progress.lastSync ? new Date(progress.lastSync).toLocaleString() : '未知';
        window.domElements.progressInfo.textContent = `已从本地加载 ${localResult.articles.length} 篇文章 (最后同步: ${lastSyncDate})`;
        
        window.domElements.loadMoreBtn.disabled = window.appState.articles.length >= window.appState.totalArticles;
        window.articleManager.addSyncAllButton(); // Internal call
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
      
      window.articleManager.applySearchAndSort(); // Internal call
      window.articleManager.renderArticles(page > 1 && window.appState.currentSearchTerm.trim() === ''); // Internal call
      
      window.domElements.progressInfo.textContent = `已获取 ${window.appState.articles.length}/${window.appState.totalArticles} 篇文章`;
      window.domElements.loadMoreBtn.disabled = window.appState.articles.length >= window.appState.totalArticles;
      window.articleManager.addSyncAllButton(); // Internal call
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
};

// 渲染文章列表
window.articleManager.renderArticles = function(append = false) {
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
      window.articleManager.showArticleDetail(article); // Internal call
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
};

// 显示文章详情 - 仅使用iframe显示内容
window.articleManager.showArticleDetail = function(article) {
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
    prevBtn.style.cssText = `position: fixed; left: 30%; top: 50%; transform: translate(-50%, -50%); z-index: 1000; cursor: pointer; background-color: rgba(0, 0, 0, 0.5); color: white; border: none; padding: 10px 15px; border-radius: 4px; transition: background-color 0.3s;`;
    prevBtn.addEventListener('mouseover', () => { prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; });
    prevBtn.addEventListener('mouseout', () => { prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; });
    prevBtn.addEventListener('click', () => window.articleManager.showArticleDetail(window.appState.articles[currentIndex - 1])); // Internal call
    actionContainer.appendChild(prevBtn);
  }
  
  if (currentIndex < window.appState.articles.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'action-button next-article';
    nextBtn.textContent = '下一篇';
    nextBtn.style.cssText = `position: fixed; right: 5%; top: 50%; transform: translate(50%, -50%); z-index: 1000; cursor: pointer; background-color: rgba(0, 0, 0, 0.5); color: white; border: none; padding: 10px 15px; border-radius: 4px; transition: background-color 0.3s;`;
    nextBtn.addEventListener('mouseover', () => { nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; });
    nextBtn.addEventListener('mouseout', () => { nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; });
    nextBtn.addEventListener('click', () => window.articleManager.showArticleDetail(window.appState.articles[currentIndex + 1])); // Internal call
    actionContainer.appendChild(nextBtn);
  }
  
  // Nested showErrorView function for showArticleDetail
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
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; line-height: 1.8; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
              img { max-width: 100%; height: auto; border-radius: 4px; }
              a { color: #1890ff; text-decoration: none; }
              a:hover { text-decoration: underline; }
              .rich_media_content { overflow: hidden; }
              pre, code { background-color: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
              blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; color: #666; }
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
};

// 返回文章列表
window.articleManager.backToList = function() {
  window.domElements.articleDetailView.style.display = 'none';
  window.domElements.articlesView.style.display = 'flex';
  window.domElements.articleFrame.srcdoc = '';
  window.domElements.articleFrame.style.display = 'none';
  window.domElements.loadingIndicator.style.display = 'none';
  window.domElements.errorContainer.style.display = 'none';
};

// 刷新文章
window.articleManager.refreshArticles = function(account) {
  if (!account) return;
  window.appState.articles = [];
  window.appState.currentPage = 0;
  window.domElements.articlesData.innerHTML = '';
  window.articleManager.loadArticles(account); // Internal call
};

// 加载更多文章
window.articleManager.loadMoreArticles = function() {
  if (window.appState.isLoading || !window.appState.currentAccount) return;
  // currentPage is incremented in bindEvents in renderer.js before calling this.
  // This function could also increment it, for consistency, but plan says it's handled in bindEvents.
  window.articleManager.loadArticles(window.appState.currentAccount, window.appState.currentPage); // Internal call
};

// 导出文章到Excel
window.articleManager.exportArticles = async function() {
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
};

// 排序文章列表 - 根据创建时间
window.articleManager.sortArticles = function() {
  if (!window.appState.allArticlesForCurrentAccount || window.appState.allArticlesForCurrentAccount.length === 0) return;
  window.articleManager.applySearchAndSort(); // Internal call
  window.articleManager.renderArticles(false); // Internal call
};

// 处理搜索输入事件
window.articleManager.handleSearchInput = function(event) {
  window.appState.currentSearchTerm = event.target.value;
  window.articleManager.applySearchAndSort(); // Internal call
  window.articleManager.renderArticles(false); // Internal call
};

// 应用搜索和排序
window.articleManager.applySearchAndSort = function() {
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
};

// 添加全量同步按钮
window.articleManager.addSyncAllButton = function() {
  let syncAllBtn = document.getElementById('btn-sync-all'); 
  if (!syncAllBtn) {
    syncAllBtn = document.createElement('button');
    syncAllBtn.id = 'btn-sync-all';
    syncAllBtn.className = 'btn';
    syncAllBtn.textContent = '全量同步';
    syncAllBtn.style.marginLeft = '10px';
    syncAllBtn.addEventListener('click', () => window.articleManager.syncAllArticles()); // Internal call
    const buttonContainer = window.domElements.loadMoreBtn.parentElement;
    if (buttonContainer) { // Ensure parentElement exists
        buttonContainer.appendChild(syncAllBtn);
    } else {
        console.error("Could not find parent element for syncAllBtn");
    }
  }
};

// 全量同步文章
window.articleManager.syncAllArticles = async function() {
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
      window.articleManager.applySearchAndSort(); // Internal call
      window.articleManager.renderArticles(false); // Internal call
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
}; 