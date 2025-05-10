window.appState = {
  accounts: [],
  currentAccount: null,
  allArticlesForCurrentAccount: [], // Stores all articles for the current account, unfiltered
  articles: [], // Stores articles to be displayed (can be filtered/sorted)
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
  currentSearchTerm: '', // Stores the current search term
}; 