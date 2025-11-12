import { signatureApiService } from './signatrueApiService';
import { getDeviceInfo, type DeviceInfo } from '../utils/deviceInfo';
import type { RegisterDeviceRequest, RegisterDeviceResponse, UpdateConnectionRequest } from '../type';

export interface DeviceRegistrationResult {
    success: boolean;
    device?: RegisterDeviceResponse;
    error?: string;
    isNewDevice?: boolean;
}

export interface HeartbeatOptions {
    interval?: number; // milliseconds, default 30000 (30s)
    onHeartbeatFailed?: (error: Error) => void;
    onDeviceOffline?: () => void;
}

/**
 * Device Management Service
 * Implements the complete device registration and management flow
 */
export class DeviceManagerService {
    private heartbeatInterval?: number;
    private deviceInfo?: DeviceInfo;
    private registeredDevice?: RegisterDeviceResponse;
    private isHeartbeatActive = false;

    /**
     * Step 1-2: Get device info and register device
     * Handles both new and existing devices
     */
    async registerDevice(): Promise<DeviceRegistrationResult> {
        try {
            // Step 1: Get Device Info (MAC Address, IP Address)
            console.log('🔍 Step 1: Getting device information...');
            this.deviceInfo = await getDeviceInfo();
            
            console.log('📱 Device Info:', {
                deviceName: this.deviceInfo.deviceName,
                macAddress: this.deviceInfo.macAddress,
                ipAddress: this.deviceInfo.ipAddress,
                staffDeviceId: this.deviceInfo.staffDeviceId
            });

            // Step 2: POST /api/PatronDevice/register (Handles both new & existing devices)
            console.log('📡 Step 2: Registering device with API...');
            const registerRequest: RegisterDeviceRequest = {
                DeviceName: this.deviceInfo.deviceName,
                MacAddress: this.deviceInfo.macAddress,
                IpAddress: this.deviceInfo.ipAddress,
                StaffDeviceId: this.deviceInfo.staffDeviceId
            };

            const device = await signatureApiService.registerDevice(registerRequest);
            this.registeredDevice = device;

            console.log('✅ Device registered successfully:', {
                id: device.id,
                deviceName: device.deviceName,
                isOnline: device.isOnline,
                isAvailable: device.isAvailable
                
            });

            return {
                success: true,
                device,
                isNewDevice: !device.connectionId // New device if no existing connectionId
            };

        } catch (error) {
            console.error('❌ Device registration failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Step 4: Update connection ID after SignalR connection
     * Called from SignalR Hub.OnConnectedAsync()
     */
    async updateConnectionId(connectionId: string): Promise<boolean> {
        try {
            if (!this.deviceInfo) {
                throw new Error('Device not registered. Call registerDevice() first.');
            }

            console.log('🔗 Step 4: Updating connection ID...', connectionId);

            const updateRequest: UpdateConnectionRequest = {
                DeviceName: this.deviceInfo.deviceName,
                ConnectionId: connectionId,
                MacAddress: this.deviceInfo.macAddress,
                IpAddress: this.deviceInfo.ipAddress
            };

            const result = await signatureApiService.updateConnection(updateRequest);
            
            if (this.registeredDevice) {
                this.registeredDevice.connectionId = result.connectionId;
                this.registeredDevice.isOnline = result.isOnline;
            }

            console.log('✅ Connection ID updated successfully:', result);
            return true;

        } catch (error) {
            console.error('❌ Failed to update connection ID:', error);
            return false;
        }
    }

    /**
     * Step 6: Start heartbeat (Every 30s)
     * Keeps the device connection alive
     */
    startHeartbeat(options: HeartbeatOptions = {}): void {
        const {
            interval = 30000, // 30 seconds default
            onHeartbeatFailed,
            onDeviceOffline
        } = options;

        if (this.isHeartbeatActive) {
            console.warn('⚠️ Heartbeat already active');
            return;
        }

        console.log('💓 Step 6: Starting heartbeat every', interval / 1000, 'seconds');
        this.isHeartbeatActive = true;

        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.sendHeartbeat();
            } catch (error) {
                console.error('💔 Heartbeat failed:', error);
                onHeartbeatFailed?.(error instanceof Error ? error : new Error('Heartbeat failed'));
                
                // Check if device is still online
                const isOnline = await this.checkDeviceStatus();
                if (!isOnline) {
                    console.warn('📴 Device appears to be offline');
                    onDeviceOffline?.();
                }
            }
        }, interval);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
            this.isHeartbeatActive = false;
            console.log('💔 Heartbeat stopped');
        }
    }

    /**
     * Send heartbeat by calling getOnlineDevices and checking if our device is still online
     */
    private async sendHeartbeat(): Promise<void> {
        if (!this.registeredDevice) {
            throw new Error('No registered device to heartbeat');
        }

        console.log('💓 Performing heartbeat check...');

        // Use getOnlineDevices as heartbeat mechanism
        const onlineDevicesResponse = await signatureApiService.getOnlineDevices();
        
        console.log('💓 Raw online devices response:', onlineDevicesResponse);
        
        // Ensure we have a valid array
        let onlineDevices: any[] = [];
        if (Array.isArray(onlineDevicesResponse)) {
            onlineDevices = onlineDevicesResponse;
        } else if (onlineDevicesResponse && Array.isArray((onlineDevicesResponse as any).data)) {
            onlineDevices = (onlineDevicesResponse as any).data;
        } else if (onlineDevicesResponse && typeof onlineDevicesResponse === 'object') {
            // If it's an object, try to extract array from common properties
            const resp = onlineDevicesResponse as any;
            onlineDevices = resp.devices || resp.items || [];
        }
        
        console.log('💓 Processed online devices array:', onlineDevices, 'Length:', onlineDevices.length);
        
        if (!Array.isArray(onlineDevices)) {
            console.error('💓 Error: onlineDevices is not an array:', typeof onlineDevicesResponse, onlineDevicesResponse);
            throw new Error('Invalid response format from getOnlineDevices');
        }
        
        // Check if our device is in the online list
        console.log('💓 Looking for device:', {
            registeredDeviceName: this.registeredDevice?.deviceName,
            registeredDeviceId: this.registeredDevice?.id
        });
        
        const ourDevice = onlineDevices.find(d => {
            const nameMatch = d.deviceName === this.registeredDevice?.deviceName;
            const idMatch = d.id === this.registeredDevice?.id;
            
            console.log('💓 Checking device:', {
                apiDeviceName: d.deviceName,
                apiDeviceId: d.id,
                nameMatch,
                idMatch,
                isOnline: d.isOnline
            });
            
            return nameMatch || idMatch;
        });

        console.log('💓 Found device:', ourDevice);

        if (!ourDevice) {
            throw new Error('Device not found in online devices list');
        }

        if (!ourDevice.isOnline) {
            throw new Error('Device marked as offline');
        }

        // Additional validation: Check if device name matches exactly
        if (ourDevice.deviceName !== this.registeredDevice?.deviceName) {
            console.warn('⚠️ Device name mismatch detected:', {
                expected: this.registeredDevice?.deviceName,
                actual: ourDevice.deviceName,
                deviceId: ourDevice.id
            });
            
            // If only ID matched but name is different, consider it suspicious
            if (ourDevice.id === this.registeredDevice?.id) {
                throw new Error(`Device ID matches but name changed: expected '${this.registeredDevice?.deviceName}' but got '${ourDevice.deviceName}'`);
            }
        }

        console.log('💓 Heartbeat successful - device is online');
    }

    /**
     * Check device status
     */
    private async checkDeviceStatus(): Promise<boolean> {
        try {
            if (!this.registeredDevice) return false;

            const onlineDevicesResponse = await signatureApiService.getOnlineDevices();
            
            // Ensure we have a valid array
            let onlineDevices: any[] = [];
            if (Array.isArray(onlineDevicesResponse)) {
                onlineDevices = onlineDevicesResponse;
            } else if (onlineDevicesResponse && Array.isArray((onlineDevicesResponse as any).data)) {
                onlineDevices = (onlineDevicesResponse as any).data;
            } else if (onlineDevicesResponse && typeof onlineDevicesResponse === 'object') {
                const resp = onlineDevicesResponse as any;
                onlineDevices = resp.devices || resp.items || [];
            }
            
            if (!Array.isArray(onlineDevices)) {
                console.error('💓 Error in checkDeviceStatus: onlineDevices is not an array:', typeof onlineDevicesResponse, onlineDevicesResponse);
                return false;
            }

            const ourDevice = onlineDevices.find(d => {
                const nameMatch = d.deviceName === this.registeredDevice?.deviceName;
                const idMatch = d.id === this.registeredDevice?.id;
                
                // For status check, require both name and ID to match for security
                return nameMatch && idMatch;
            });

            return ourDevice?.isOnline ?? false;
        } catch {
            return false;
        }
    }

    /**
     * Get current device info
     */
    getDeviceInfo(): DeviceInfo | undefined {
        return this.deviceInfo;
    }

    /**
     * Get registered device info
     */
    getRegisteredDevice(): RegisterDeviceResponse | undefined {
        return this.registeredDevice;
    }

    /**
     * Check if device is registered and ready
     */
    isReady(): boolean {
        return !!(this.deviceInfo && this.registeredDevice?.connectionId);
    }

    /**
     * Get online devices list
     */
    async getOnlineDevices(): Promise<RegisterDeviceResponse[]> {
        return await signatureApiService.getOnlineDevices();
    }

    /**
     * Complete cleanup
     */
    cleanup(): void {
        this.stopHeartbeat();
        this.deviceInfo = undefined;
        this.registeredDevice = undefined;
    }
}

// Export singleton instance
export const deviceManager = new DeviceManagerService();
