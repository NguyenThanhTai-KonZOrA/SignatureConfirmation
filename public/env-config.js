// Environment configuration
// This file will be updated during build process

window._env_ = {
  API_BASE: 'http://10.21.10.1:8105',
  BUILD_VERSION: 'dev-' + new Date().toISOString().replace(/[:.]/g, '-'),
  BUILD_DATE: new Date().toISOString(),
  PACKAGE_VERSION: '0.0.0',
};

// Make version available globally for cache busting
window.APP_VERSION = window._env_.BUILD_VERSION;

// Version change detection for automatic cache clearing
(function () {
  const STORAGE_KEY = 'app_last_known_version';
  const currentVersion = window.APP_VERSION;
  const lastKnownVersion = localStorage.getItem(STORAGE_KEY);

  if (lastKnownVersion && lastKnownVersion !== currentVersion) {
    console.log('🔄 Version change detected:', lastKnownVersion, '→', currentVersion);
    console.log('🧹 Auto-clearing cache silently...');

    // Clear cache silently when version changes
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
        console.log('✅ Service Worker caches cleared');
      });
    }

    // Clear localStorage but preserve essential data
    const preserveKeys = ['user_preferences', 'auth_token', 'language_setting', 'lang'];
    const itemsToPreserve = {};

    preserveKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        itemsToPreserve[key] = value;
      }
    });

    localStorage.clear();

    // Restore preserved items
    Object.entries(itemsToPreserve).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    // Clear session storage
    sessionStorage.clear();

    console.log('✅ All caches cleared silently');
  }

  localStorage.setItem(STORAGE_KEY, currentVersion);
})();

console.log('🚀 App Version:', window._env_.PACKAGE_VERSION);
console.log('🔨 Build Version:', window._env_.BUILD_VERSION);
// This file is for development only and will be replaced during build