import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  connectionType?: string;
  lastConnectivityCheck?: Date;
}

// Global network status tracker that can be used by API services
export const networkStatusTracker = {
  isConnected: true,
  setConnectedStatus: (status: boolean) => {
    networkStatusTracker.isConnected = status;
  }
};

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>();
  const [lastConnectivityCheck, setLastConnectivityCheck] = useState<Date>();

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (!online) {
        setIsConnected(false);
        networkStatusTracker.setConnectedStatus(false);
      }
    };

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType);
        // Consider slow connections as potentially problematic
        const connected = connection.effectiveType !== 'slow-2g';
        setIsConnected(connected);
        networkStatusTracker.setConnectedStatus(connected);
      }
    };

    // Test actual connectivity by trying to fetch a small resource
    const testConnectivity = async () => {
      if (!navigator.onLine) {
        setIsConnected(false);
        networkStatusTracker.setConnectedStatus(false);
        return;
      }

      try {
        // Create AbortController for timeout support in older browsers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        // Try to fetch a small image or make a HEAD request to detect actual connectivity
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const connected = response.ok;
        setIsConnected(connected);
        networkStatusTracker.setConnectedStatus(connected);
        setLastConnectivityCheck(new Date());
      } catch (error) {
        console.warn('Network connectivity test failed:', error);
        setIsConnected(false);
        networkStatusTracker.setConnectedStatus(false);
        setLastConnectivityCheck(new Date());
      }
    };

    // Initial checks
    updateOnlineStatus();
    updateConnectionInfo();
    testConnectivity();

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Connection change listener (if supported)
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    // Periodic connectivity check (every 30 seconds when online)
    const connectivityInterval = setInterval(() => {
      if (navigator.onLine) {
        testConnectivity();
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
      
      clearInterval(connectivityInterval);
    };
  }, []);

  // Update global tracker when local state changes
  useEffect(() => {
    networkStatusTracker.setConnectedStatus(isOnline && isConnected);
  }, [isOnline, isConnected]);

  return {
    isOnline,
    isConnected: isOnline && isConnected,
    connectionType,
    lastConnectivityCheck
  };
};