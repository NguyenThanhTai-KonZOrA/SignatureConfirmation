// Cache busting utilities
export class CacheBuster {
  private static readonly CACHE_VERSION_KEY = 'app_cache_version';
  
  /**
   * Get current app version from package.json or environment
   */
  static getCurrentVersion(): string {
    // Try to get version from build-time injection
    if (typeof __APP_VERSION__ !== 'undefined') {
      return __APP_VERSION__;
    }
    
    // Try to get version from environment
    if (window.APP_VERSION) {
      return window.APP_VERSION;
    }
    
    // Fallback to timestamp-based version
    return new Date().getTime().toString();
  }
  
  /**
   * Check if cache needs to be cleared
   */
  static shouldClearCache(): boolean {
    const currentVersion = this.getCurrentVersion();
    const storedVersion = localStorage.getItem(this.CACHE_VERSION_KEY);
    
    return storedVersion !== currentVersion;
  }
  
  /**
   * Clear all caches
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear localStorage (except essential data)
      this.clearLocalStorage();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear Service Worker caches if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Update cache version
      localStorage.setItem(this.CACHE_VERSION_KEY, this.getCurrentVersion());
      
      console.log('✅ All caches cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
    }
  }
  
  /**
   * Clear localStorage but preserve essential data
   */
  private static clearLocalStorage(): void {
    // List of keys to preserve
    const preserveKeys = [
      'user_preferences',
      'auth_token',
      'language_setting',
      this.CACHE_VERSION_KEY
    ];
    
    const itemsToPreserve: { [key: string]: string | null } = {};
    
    // Save items to preserve
    preserveKeys.forEach(key => {
      itemsToPreserve[key] = localStorage.getItem(key);
    });
    
    // Clear all localStorage
    localStorage.clear();
    
    // Restore preserved items
    Object.entries(itemsToPreserve).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });
  }
  
  /**
   * Force reload page with cache busting
   */
  static forceReload(): void {
    // Add timestamp to URL to bypass cache
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    
    // Hard reload
    window.location.href = url.toString();
  }
  
  /**
   * Initialize cache management
   */
  static initialize(): void {
    if (this.shouldClearCache()) {
      console.log('🔄 New version detected, clearing caches silently...');
      this.clearAllCaches().then(() => {
        // Silent update - no notification for end users
        console.log('✅ Cache cleared silently for new version');
      });
    }
  }

  /**
   * Add cache busting to fetch requests
   */
  static addCacheBustToUrl(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    APP_VERSION?: string;
    clearAppCache?: () => Promise<void>;
    forceAppReload?: () => void;
  }
  
  // Build-time constants injected by Vite
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
}

// Make cache busting functions available globally for debugging
window.clearAppCache = () => CacheBuster.clearAllCaches();
window.forceAppReload = () => CacheBuster.forceReload();

export default CacheBuster;
