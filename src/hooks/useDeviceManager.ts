import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceManager, type DeviceRegistrationResult, type HeartbeatOptions } from '../services/deviceManager';
import { useSignalR } from './useSignalR';
import signalRService from '../services/signalRService';
import type { DeviceInfo } from '../utils/deviceInfo';
import type { RegisterDeviceResponse } from '../type';

export interface UseDeviceManagerOptions {
    autoRegister?: boolean;
    autoConnect?: boolean;
    autoHeartbeat?: boolean;
    heartbeatInterval?: number;
    onRegistrationComplete?: (result: DeviceRegistrationResult) => void;
    onSignalRConnected?: (connectionId: string) => void;
    onHeartbeatFailed?: (error: Error) => void;
    onDeviceOffline?: () => void;
    onReady?: () => void;
}

export interface DeviceManagerState {
    // Registration state
    isRegistering: boolean;
    registrationResult?: DeviceRegistrationResult;
    deviceInfo?: DeviceInfo;
    registeredDevice?: RegisterDeviceResponse;
    
    // Connection state  
    isConnectedToSignalR: boolean;
    signalRConnectionId?: string;
    
    // Heartbeat state
    isHeartbeatActive: boolean;
    lastHeartbeat?: Date;
    
    // Overall state
    isReady: boolean;
    error?: string;
    
    // Progress tracking
    currentStep: 'idle' | 'getting-device-info' | 'registering' | 'connecting-signalr' | 'updating-connection' | 'starting-heartbeat' | 'ready';
}

/**
 * Hook to manage complete device registration flow
 * Implements the 6-step flow described in the diagram
 */
export const useDeviceManager = (options: UseDeviceManagerOptions = {}) => {
    const {
        autoRegister = true,
        autoConnect = true,
        autoHeartbeat = true,
        heartbeatInterval = 30000,
        onRegistrationComplete,
        onSignalRConnected,
        onHeartbeatFailed,
        onDeviceOffline,
        onReady
    } = options;

    const [state, setState] = useState<DeviceManagerState>({
        isRegistering: false,
        isConnectedToSignalR: false,
        isHeartbeatActive: false,
        isReady: false,
        currentStep: 'idle'
    });

    const registrationCompleted = useRef(false);
    const signalRConnectionHandled = useRef(false);

    // Step 3: SignalR connection with device name parameter
    const {
        isConnected: signalRConnected,
        connectionInfo,
        connect: connectSignalR,
        disconnect: disconnectSignalR,
        error: signalRError
    } = useSignalR({
        autoConnect: false // We'll control when to connect
    });

    // Extract connectionId from connectionInfo
    const signalRConnectionId = connectionInfo?.connectionId;

    // Update state when SignalR connection changes
    useEffect(() => {
        setState(prev => ({
            ...prev,
            isConnectedToSignalR: signalRConnected,
            signalRConnectionId: signalRConnectionId || undefined,
            error: signalRError?.message
        }));

        // Step 4: Update connection ID when SignalR connects
        if (signalRConnected && signalRConnectionId && !signalRConnectionHandled.current) {
            signalRConnectionHandled.current = true;
            handleSignalRConnected(signalRConnectionId);
        }

    }, [signalRConnected, signalRConnectionId, signalRError]);

    /**
     * Steps 1-2: Device registration
     */
    const registerDevice = useCallback(async (): Promise<DeviceRegistrationResult> => {
        if (registrationCompleted.current) {
            return state.registrationResult!;
        }

        setState(prev => ({ 
            ...prev, 
            isRegistering: true, 
            currentStep: 'getting-device-info',
            error: undefined 
        }));

        try {
            setState(prev => ({ ...prev, currentStep: 'registering' }));
            
            const result = await deviceManager.registerDevice();
            
            setState(prev => ({
                ...prev,
                isRegistering: false,
                registrationResult: result,
                deviceInfo: deviceManager.getDeviceInfo(),
                registeredDevice: deviceManager.getRegisteredDevice(),
                error: result.error,
                currentStep: result.success ? 'connecting-signalr' : 'idle'
            }));

            if (result.success) {
                registrationCompleted.current = true;
                onRegistrationComplete?.(result);

                // Step 3: Connect to SignalR with device name
                if (autoConnect) {
                    await connectToSignalR();
                }
            }

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            setState(prev => ({
                ...prev,
                isRegistering: false,
                error: errorMessage,
                currentStep: 'idle'
            }));

            return {
                success: false,
                error: errorMessage
            };
        }
    }, [autoConnect, onRegistrationComplete, state.registrationResult]);

    /**
     * Step 3: Connect to SignalR with device name parameter
     */
    const connectToSignalR = useCallback(async () => {
        const deviceInfo = deviceManager.getDeviceInfo();
        if (!deviceInfo) {
            throw new Error('Device must be registered before connecting to SignalR');
        }

        setState(prev => ({ ...prev, currentStep: 'connecting-signalr' }));
        
        // Set device name parameter before connecting
        signalRService.setDeviceName(deviceInfo.deviceName);
        
        // Connect with device name parameter
        await connectSignalR();
    }, [connectSignalR]);

    /**
     * Step 4-5: Handle SignalR connection and register device
     */
    const handleSignalRConnected = useCallback(async (connectionId: string) => {
        setState(prev => ({ ...prev, currentStep: 'updating-connection' }));

        try {
            // Step 4: Update connection ID (Hub.OnConnectedAsync auto-updates)
            const success = await deviceManager.updateConnectionId(connectionId);
            
            if (success) {
                onSignalRConnected?.(connectionId);

                // Step 5: Invoke RegisterPatronDevice (handled by SignalR service)
                
                // Step 6: Start heartbeat
                if (autoHeartbeat) {
                    await startHeartbeat();
                } else {
                    setState(prev => ({ 
                        ...prev, 
                        currentStep: 'ready',
                        isReady: true 
                    }));
                    onReady?.();
                }
            } else {
                setState(prev => ({ 
                    ...prev, 
                    error: 'Failed to update connection ID',
                    currentStep: 'idle'
                }));
            }

        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                error: error instanceof Error ? error.message : 'Connection update failed',
                currentStep: 'idle'
            }));
        }
    }, [autoHeartbeat, onSignalRConnected, onReady]);

    /**
     * Step 6: Start heartbeat
     */
    const startHeartbeat = useCallback(async () => {
        setState(prev => ({ ...prev, currentStep: 'starting-heartbeat' }));

        const heartbeatOptions: HeartbeatOptions = {
            interval: heartbeatInterval,
            onHeartbeatFailed: (error) => {
                setState(prev => ({ 
                    ...prev, 
                    error: `Heartbeat failed: ${error.message}` 
                }));
                onHeartbeatFailed?.(error);
            },
            onDeviceOffline: () => {
                setState(prev => ({ 
                    ...prev, 
                    error: 'Device appears to be offline' 
                }));
                onDeviceOffline?.();
            }
        };

        deviceManager.startHeartbeat(heartbeatOptions);
        
        setState(prev => ({
            ...prev,
            isHeartbeatActive: true,
            currentStep: 'ready',
            isReady: true,
            lastHeartbeat: new Date()
        }));

        onReady?.();
        
        console.log('✅ Device is ready to receive signature requests!');
    }, [heartbeatInterval, onHeartbeatFailed, onDeviceOffline, onReady]);

    /**
     * Stop heartbeat
     */
    const stopHeartbeat = useCallback(() => {
        deviceManager.stopHeartbeat();
        setState(prev => ({ 
            ...prev, 
            isHeartbeatActive: false 
        }));
    }, []);

    /**
     * Complete disconnect and cleanup
     */
    const disconnect = useCallback(() => {
        deviceManager.cleanup();
        disconnectSignalR();
        registrationCompleted.current = false;
        signalRConnectionHandled.current = false;
        
        setState({
            isRegistering: false,
            isConnectedToSignalR: false,
            isHeartbeatActive: false,
            isReady: false,
            currentStep: 'idle'
        });
    }, [disconnectSignalR]);

    /**
     * Manual retry of the entire flow
     */
    const retry = useCallback(async () => {
        disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        return registerDevice();
    }, [disconnect, registerDevice]);

    /**
     * Get online devices
     */
    const getOnlineDevices = useCallback(async () => {
        return deviceManager.getOnlineDevices();
    }, []);

    // Auto-start flow if enabled
    useEffect(() => {
        if (autoRegister && !registrationCompleted.current && !state.isRegistering) {
            registerDevice();
        }
    }, [autoRegister, registerDevice, state.isRegistering]);

    // Update heartbeat timestamp
    useEffect(() => {
        if (state.isHeartbeatActive) {
            const interval = setInterval(() => {
                setState(prev => ({ 
                    ...prev, 
                    lastHeartbeat: new Date() 
                }));
            }, heartbeatInterval);

            return () => clearInterval(interval);
        }
    }, [state.isHeartbeatActive, heartbeatInterval]);

    return {
        // State
        ...state,
        
        // Actions
        registerDevice,
        connectToSignalR,
        startHeartbeat,
        stopHeartbeat,
        disconnect,
        retry,
        getOnlineDevices,
        
        // Utilities
        deviceManager
    };
};
