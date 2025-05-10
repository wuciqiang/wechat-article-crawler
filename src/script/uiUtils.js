window.uiUtils = {};

window.uiUtils.formatDate = function(timestamp) {
  if (!timestamp) return '未知';
  
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

window.uiUtils.showToast = function(message) {
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
    if (document.body.contains(toast)) {
        document.body.removeChild(toast);
    }
  }, 2000);
};

window.uiUtils.setupTableColumnResize = function() {
  const table = document.getElementById('articles-table'); 
  if (!table) return; 
  
  const headers = table.querySelectorAll('th');
  
  let isResizing = false;
  let currentTh = null;
  let startX = 0;
  let startWidth = 0;
  
  headers.forEach(th => {
    th.addEventListener('mousedown', (e) => {
      const thRect = th.getBoundingClientRect();
      const edgeSize = 5;
      
      if (thRect.right - e.clientX < edgeSize) {
        isResizing = true;
        currentTh = th;
        startX = e.clientX;
        startWidth = currentTh.offsetWidth;
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
  
  table.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const width = startWidth + (e.clientX - startX);
    if (width > 50) { 
      currentTh.style.width = `${width}px`;
    }
    
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    // Check if currentTh is still valid and attached to the DOM
    if (!currentTh || !document.body.contains(currentTh)) {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        return;
    }

    const width = startWidth + (e.clientX - startX);
    if (width > 50) { 
      currentTh.style.width = `${width}px`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      currentTh = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });
}; 