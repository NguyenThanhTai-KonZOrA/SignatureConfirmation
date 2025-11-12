import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useDeviceManager } from '../hooks/useDeviceManager';
import type { UseDeviceManagerOptions, DeviceManagerState } from '../hooks/useDeviceManager';

interface DeviceManagerContextType extends DeviceManagerState {
    registerDevice: () => Promise<any>;
    connectToSignalR: () => Promise<void>;
    startHeartbeat: () => Promise<void>;
    stopHeartbeat: () => void;
    disconnect: () => void;
    retry: () => Promise<any>;
    getOnlineDevices: () => Promise<any[]>;
    deviceManager: any;
}

const DeviceManagerContext = createContext<DeviceManagerContextType | undefined>(undefined);

interface DeviceManagerProviderProps {
    children: ReactNode;
    options?: UseDeviceManagerOptions;
}

/**
 * Global Device Manager Provider
 * Provides device manager state and actions to the entire app
 */
export const DeviceManagerProvider: React.FC<DeviceManagerProviderProps> = ({ 
    children, 
    options = {} 
}) => {
    const deviceManagerData = useDeviceManager({
        autoRegister: true,        // Tự động đăng ký device khi khởi động
        autoConnect: true,         // Tự động kết nối SignalR
        autoHeartbeat: true,       // Tự động bắt đầu heartbeat
        heartbeatInterval: 30000,  // 30 giây
        onRegistrationComplete: (result) => {
            if (result.success) {
                console.log('🎉 Device registered automatically:', result);
            } else {
                console.error('❌ Auto registration failed:', result.error);
            }
        },
        onSignalRConnected: (connectionId) => {
            console.log('🔗 SignalR connected automatically:', connectionId);
        },
        onReady: () => {
            console.log('✅ Device is ready to receive signature requests!');
        },
        ...options
    });

    return (
        <DeviceManagerContext.Provider value={deviceManagerData}>
            {children}
        </DeviceManagerContext.Provider>
    );
};

/**
 * Hook to access Device Manager context
 * Use this instead of useDeviceManager directly to avoid multiple instances
 */
export const useDeviceManagerContext = (): DeviceManagerContextType => {
    const context = useContext(DeviceManagerContext);
    if (!context) {
        throw new Error('useDeviceManagerContext must be used within a DeviceManagerProvider');
    }
    return context;
};