window.settingsManager = {};

// 加载设置
window.settingsManager.loadSettings = async function() {
  console.log("loadSettings called from settingsManager"); 
  try {
    console.log("Attempting to call window.api.getSettings from settingsManager"); 
    const settings = await window.api.getSettings();
    console.log("Settings received in settingsManager:", settings); 
    window.appState.settings = settings;
    
    window.domElements.cookieInput.value = settings.cookie || '';
    window.domElements.tokenInput.value = settings.token || '';
    window.domElements.fingerprintInput.value = settings.fingerprint || '';
    
    window.settingsManager.updateLoginStatus(); // Internal call
  } catch (error) {
    console.error('加载设置失败:', error);
    window.uiUtils.showToast('加载设置失败');
  }
};

// 更新登录状态显示
window.settingsManager.updateLoginStatus = function() {
  const isLoggedIn = window.appState.settings.loggedIn === true && 
                  window.appState.settings.cookie && 
                  window.appState.settings.token;
  
  if (isLoggedIn) {
    window.domElements.loginStatusText.textContent = '已登录';
    window.domElements.loginStatusText.className = 'logged-in';
    window.domElements.btnLogin.style.display = 'none';
    window.domElements.btnLogout.style.display = 'inline-block';
    window.domElements.settingsLoginStatus.textContent = '已登录';
    window.domElements.settingsLoginStatus.className = 'logged-in';
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
};

// 保存设置
window.settingsManager.saveSettings = async function() {
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
      window.settingsManager.updateLoginStatus(); // Internal call
    } else {
      window.uiUtils.showToast(`保存设置失败: ${result.message}`);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    window.uiUtils.showToast('保存设置失败');
  }
};

// 验证设置是否完整
window.settingsManager.validateSettings = function() {
  if (window.appState.settings.loggedIn && window.appState.settings.cookie && window.appState.settings.token) {
    return true;
  }
  // Also allow if cookie and token are present but loggedIn might be stale (e.g. app restart)
  if (window.appState.settings.cookie && window.appState.settings.token) {
    return true;
  }
  window.settingsManager.showLoginPrompt(); // Internal call
  return false;
};

// 显示登录提示弹窗
window.settingsManager.showLoginPrompt = function() {
  window.domElements.loginPromptModal.style.display = 'block';
};

// 关闭登录提示弹窗
window.settingsManager.closeLoginPromptModal = function() {
  window.domElements.loginPromptModal.style.display = 'none';
};

// 打开登录窗口
window.settingsManager.openLoginWindow = async function() {
  try {
    window.settingsManager.closeLoginPromptModal(); // Internal call
    window.uiUtils.showToast('正在打开登录窗口...');
    const result = await window.api.openLoginWindow();
    if (result.success) {
      if (result.loggedIn) {
        await window.settingsManager.loadSettings(); // Internal call
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
};

// 登出
window.settingsManager.logout = async function() {
  try {
    const result = await window.api.logout();
    if (result.success) {
      await window.settingsManager.loadSettings(); // Internal call (to refresh state and UI)
      window.uiUtils.showToast('已退出登录');
    } else {
      window.uiUtils.showToast(`登出失败: ${result.message}`);
    }
  } catch (error) {
    console.error('登出失败:', error);
    window.uiUtils.showToast('登出失败');
  }
};

// 设置登录事件监听
window.settingsManager.setupLoginListeners = function() {
  window.domElements.btnLogin.addEventListener('click', window.settingsManager.openLoginWindow);
  window.domElements.btnLogout.addEventListener('click', window.settingsManager.logout);
  window.domElements.btnOpenLogin.addEventListener('click', window.settingsManager.openLoginWindow);
  window.domElements.closeLoginPrompt.addEventListener('click', window.settingsManager.closeLoginPromptModal);
  window.domElements.btnCancelLogin.addEventListener('click', window.settingsManager.closeLoginPromptModal);
  window.domElements.btnConfirmLogin.addEventListener('click', window.settingsManager.openLoginWindow);
  
  // The onLoginSuccess callback needs to access methods within settingsManager.
  // It will update appState and call internal methods of settingsManager.
  window.api.onLoginSuccess((settings) => {
    window.appState.settings = settings;
    window.settingsManager.updateLoginStatus(); // Internal call
    window.uiUtils.showToast('登录成功，已自动获取参数');
    window.domElements.cookieInput.value = settings.cookie || '';
    window.domElements.tokenInput.value = settings.token || '';
    window.domElements.fingerprintInput.value = settings.fingerprint || '';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === window.domElements.loginPromptModal) {
      window.settingsManager.closeLoginPromptModal(); // Internal call
    }
  });
}; 