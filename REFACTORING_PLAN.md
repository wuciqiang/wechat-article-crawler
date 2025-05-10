## `renderer.js` 重构计划

**目标:** 将 `renderer.js` 文件按业务逻辑和功能拆分成多个独立、易于管理的 JS 文件，每个文件原则上不超过500行。拆分出的文件将存放于 `src/script/` 目录下。

**模块化策略:**
由于原始文件通过 `<script>` 标签直接引入，新的 JS 文件也将通过 `<script>` 标签引入。为了实现模块间的通信：
1.  拆分出来的 JS 文件中需要共享的变量和函数，将挂载到全局 `window` 对象上 (例如 `window.appState = {...}` 或 `window.domElements = {...}` 或 `window.uiUtils = {...}`) 。
2.  主 `renderer.js` 文件（或最终的协调文件）将直接通过这些全局对象来访问功能。
3.  `index.html` 文件需要修改，以正确的顺序引入所有 JS 文件（依赖文件在前，主文件在后）。

**文件存放目录:** `src/script/`

---

### 阶段一：基础拆分 - 状态和 DOM 元素

**任务 1.1: 拆分全局状态**
*   **描述:** 将全局 `state` 对象移至独立文件。
*   **目标文件:** `src/script/state.js`
*   **步骤:**
    1.  创建 `src/script/state.js` 文件。
    2.  将 `renderer.js` 中的 `state` 对象完整定义剪切并粘贴到 `state.js`。
    3.  在 `state.js` 中，将 `state` 对象赋值给 `window.appState`:
        ```javascript
        // src/script/state.js
        window.appState = {
          accounts: [],
          currentAccount: null,
          allArticlesForCurrentAccount: [],
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
          sortOrder: 'desc',
          currentSearchTerm: '',
        };
        ```
    4.  从 `renderer.js` 中删除原始的 `state` 对象定义。
    5.  在 `renderer.js` 中，将所有对 `state.` 的引用修改为 `window.appState.`。
*   **状态:** `已完成`

**任务 1.2: 拆分 DOM 元素获取**
*   **描述:** 将所有 DOM 元素的获取和定义移至独立文件。
*   **目标文件:** `src/script/domElements.js`
*   **步骤:**
    1.  创建 `src/script/domElements.js` 文件。
    2.  将 `renderer.js` 中所有 `document.getElementById(...)` 或 `document.querySelector(...)` 的 DOM 元素常量声明剪切并粘贴到 `domElements.js`。
    3.  在 `domElements.js` 中，创建一个名为 `window.domElements` 的对象，并将这些 DOM 元素常量作为其属性：
        ```javascript
        // src/script/domElements.js
        window.domElements = {};
        window.domElements.accountNameInput = document.getElementById('account-name');
        window.domElements.addAccountBtn = document.getElementById('btn-add-account');
        window.domElements.accountsList = document.getElementById('accounts');
        window.domElements.currentAccountName = document.getElementById('current-account-name');
        window.domElements.progressInfo = document.getElementById('progress-info');
        window.domElements.exportBtn = document.getElementById('btn-export');
        window.domElements.articlesData = document.getElementById('articles-data');
        window.domElements.loadMoreBtn = document.getElementById('btn-load-more');
        window.domElements.settingsBtn = document.getElementById('btn-settings');
        window.domElements.settingsModal = document.getElementById('settings-modal');
        window.domElements.closeSettingsBtn = document.querySelector('.close');
        window.domElements.saveSettingsBtn = document.getElementById('btn-save-settings');
        window.domElements.cookieInput = document.getElementById('cookie');
        window.domElements.tokenInput = document.getElementById('token');
        window.domElements.fingerprintInput = document.getElementById('fingerprint');
        window.domElements.articleDetailView = document.getElementById('article-detail-view');
        window.domElements.articlesView = document.getElementById('articles-view');
        window.domElements.backBtn = document.getElementById('btn-back');
        window.domElements.backBtnFloat = document.getElementById('btn-back-float');
        window.domElements.articleTitle = document.getElementById('article-title');
        window.domElements.articleAuthor = document.getElementById('article-author');
        window.domElements.articleDate = document.getElementById('article-date');
        window.domElements.articleFrame = document.getElementById('article-frame');
        window.domElements.sortOrderSelect = document.getElementById('sort-order');
        window.domElements.articleWebview = document.getElementById('article-webview');
        window.domElements.loadingIndicator = document.getElementById('loading-indicator');
        window.domElements.errorContainer = document.getElementById('error-container');
        window.domElements.errorMessage = document.getElementById('error-message');
        window.domElements.errorDetails = document.getElementById('error-details');
        window.domElements.loginStatusText = document.getElementById('login-status-text');
        window.domElements.btnLogin = document.getElementById('btn-login');
        window.domElements.btnLogout = document.getElementById('btn-logout');
        window.domElements.settingsLoginStatus = document.getElementById('settings-login-status');
        window.domElements.lastLoginTime = document.getElementById('last-login-time');
        window.domElements.loginTimeContainer = document.getElementById('login-time-container');
        window.domElements.btnOpenLogin = document.getElementById('btn-open-login');
        window.domElements.loginPromptModal = document.getElementById('login-prompt-modal');
        window.domElements.closeLoginPrompt = document.querySelector('.close-login-prompt');
        window.domElements.btnCancelLogin = document.getElementById('btn-cancel-login');
        window.domElements.btnConfirmLogin = document.getElementById('btn-confirm-login');
        window.domElements.searchArticlesInput = document.getElementById('search-articles-input');
        ```
    4.  从 `renderer.js` 中删除原始的 DOM 元素常量声明。
    5.  在 `renderer.js` 中，将所有对这些 DOM 元素的引用修改为 `window.domElements.elementName` (例如 `accountNameInput` 修改为 `window.domElements.accountNameInput`)。
*   **状态:** `已完成`

**任务 1.3: 更新 `index.html`**
*   **描述:** 在 `index.html` 中引入新的 JS 文件。
*   **步骤:**
    1.  打开 `index.html` 文件。
    2.  在引入 `renderer.js` 的 `<script>` 标签 *之前*，添加对 `state.js` 和 `domElements.js` 的引用：
        ```html
        <script src="src/script/state.js"></script>
        <script src="src/script/domElements.js"></script>
        <script src="renderer.js"></script> 
        <!-- 确保 renderer.js 的路径相对于 index.html 是正确的 -->
        ```
*   **状态:** `已完成`

**任务 1.4: 测试阶段一**
*   **描述:** 完成上述拆分和 HTML 修改后，进行测试。
*   **步骤:**
    1.  运行应用程序。
    2.  检查控制台是否有错误。
    3.  验证应用基本功能是否正常（例如，UI元素是否正确显示，依赖state的初始逻辑是否工作）。
*   **状态:** `已完成`

---

### 阶段二：UI 工具函数

**任务 2.1: 拆分 UI 工具函数**
*   **描述:** 将通用的 UI 工具函数 (如 `formatDate`, `showToast`, `setupTableColumnResize`) 移至独立文件。
*   **目标文件:** `src/script/uiUtils.js`
*   **步骤:**
    1.  创建 `src/script/uiUtils.js` 文件。
    2.  将 `renderer.js` 中的 `formatDate`, `showToast`, `setupTableColumnResize` 函数定义剪切并粘贴到 `uiUtils.js`。
    3.  在 `uiUtils.js` 中，创建一个名为 `window.uiUtils` 的对象，并将这些函数作为其方法：
        ```javascript
        // src/script/uiUtils.js
        window.uiUtils = {};
        window.uiUtils.formatDate = function(timestamp) { /* ... */ };
        window.uiUtils.showToast = function(message) { /* ... */ };
        window.uiUtils.setupTableColumnResize = function() { /* ... */ };
        ```
    4.  在 `renderer.js` 中，将对这些函数的调用相应修改 (例如，`formatDate(...)` 改为 `window.uiUtils.formatDate(...)`)。
    5.  在 `index.html` 中，在 `renderer.js` 之前引入 `src/script/uiUtils.js`。
*   **状态:** `已完成`

**任务 2.2: 测试阶段二**
*   **描述:** 测试 UI 工具函数相关功能。
*   **步骤:**
    1.  运行应用。
    2.  验证日期格式化、Toast提示、表格列宽调整等功能是否正常。
*   **状态:** `已完成`

---

### 后续阶段 (概要)

*   **阶段三: 公众号管理 (`accountManager.js`)**
    *   **目标文件:** `src/script/accountManager.js`
    *   **包含函数:** `loadAccounts`, `renderAccountsList`, `selectAccount`, `switchAccount`, `addAccount`, `editAccount`, `deleteAccount`, `searchAccount`。
    *   **依赖:** `window.appState`, `window.domElements`, `window.uiUtils.showToast`。
    *   **状态:** `已完成`

*   **阶段四: 文章管理 (`articleManager.js`)**
    *   **目标文件:** `src/script/articleManager.js`
    *   **包含函数:** `loadArticles`, `renderArticles`, `showArticleDetail`, `backToList`, `refreshArticles`, `loadMoreArticles`, `exportArticles`, `sortArticles`, `handleSearchInput`, `applySearchAndSort`, `addSyncAllButton`, `syncAllArticles`。
    *   **依赖:** `window.appState`, `window.domElements`, `window.uiUtils`, `window.api`。
    *   **状态:** `已完成`

*   **阶段五: 设置与登录管理 (`settingsManager.js`)**
    *   **目标文件:** `src/script/settingsManager.js`
    *   **包含函数:** `loadSettings`, `saveSettings`, `updateLoginStatus`, `validateSettings`, `showLoginPrompt`, `closeLoginPromptModal`, `openLoginWindow`, `logout`, `setupLoginListeners`。
    *   **依赖:** `window.appState`, `window.domElements`, `window.uiUtils.showToast`, `window.api`。
    *   **步骤:**
        1.  创建 `src/script/settingsManager.js` 文件。
        2.  将 `renderer.js` 中的 `loadSettings`, `saveSettings`, `updateLoginStatus`, `validateSettings`, `showLoginPrompt`, `closeLoginPromptModal`, `openLoginWindow`, `logout`, `setupLoginListeners` 函数定义剪切并粘贴到 `settingsManager.js`。
        3.  在 `settingsManager.js` 中，创建一个名为 `window.settingsManager` 的对象，并将这些函数作为其方法。
        4.  在 `renderer.js` 中，将对这些函数的调用相应修改 (例如，`loadSettings()` 改为 `window.settingsManager.loadSettings()`)。
        5.  在 `accountManager.js` 和 `articleManager.js` 中，将对 `validateSettings()` 的调用修改为 `window.settingsManager.validateSettings()`。
        6.  确保 `setupLoginListeners` 中对 `window.api.onLoginSuccess` 的回调正确处理或能访问到必要的 `window.settingsManager` 方法。
        7.  在 `index.html` 中，在 `renderer.js` 之前（但在 `articleManager.js` 之后）引入 `src/script/settingsManager.js`。
        8.  测试所有与设置保存/加载、登录状态更新、登录/登出流程、登录提示弹窗相关的功能。
    *   **状态:** `已完成`

*   **阶段六: 应用初始化与主逻辑 (`appInit.js` 或重构后的 `renderer.js`)**
    *   **目标文件:** `renderer.js` (重构后) 或 `src/script/appInit.js`
    *   **包含函数:** `initApp`, `bindEvents`, `setupEventListeners`, `init`。
    *   此文件将协调调用其他模块的函数。
    *   **步骤:**
        1.  审视当前 `renderer.js` 中剩余的函数：`initApp`, `bindEvents`, `setupEventListeners`, `init`。
        2.  确定这些函数是否适合保留在 `renderer.js` 作为主协调文件，或者是否有必要将它们也移到一个新的 `appInit.js` 文件中。
        3.  如果决定创建 `appInit.js`:
            *   创建 `src/script/appInit.js` 文件。
            *   将 `initApp`, `bindEvents`, `setupEventListeners`, `init` 函数定义从 `renderer.js` 剪切并粘贴到 `appInit.js`。
            *   在 `appInit.js` 中，创建一个名为 `window.appInit` 的对象，并将这些函数作为其方法（或者，如果 `init` 是唯一的入口点，则只暴露 `window.appInit.init`）。
            *   在 `renderer.js` 中，如果它还存在并且需要调用初始化，则调用 `window.appInit.init()`。或者，如果 `renderer.js` 变成一个空文件或仅包含注释，可以考虑在 `index.html` 中直接引入并调用 `appInit.js` 中的初始化函数。
            *   更新 `index.html`，在所有其他脚本之后、但在需要启动应用的地方，引入 `src/script/appInit.js`。
        4.  如果决定保留在 `renderer.js`:
            *   确保 `renderer.js` 中对其他模块（`state`, `domElements`, `uiUtils`, `accountManager`, `articleManager`, `settingsManager`）的调用都是通过它们各自的 `window.object.method()` 方式。
            *   确保 `init` 函数是最终的启动点。
        5.  最终测试:
            *   全面测试整个应用程序的所有功能，确保从启动到各项操作均无缝衔接，所有模块协同工作正常。
            *   特别关注应用启动流程、事件绑定是否都按预期工作。
            *   检查控制台有无任何错误。
    *   **状态:** `已完成`

---