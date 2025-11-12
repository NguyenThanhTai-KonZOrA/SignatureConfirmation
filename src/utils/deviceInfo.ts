import { makeId } from './id';

export interface DeviceInfo {
    deviceName: string;
    macAddress: string;
    ipAddress: string;
    staffDeviceId: string;
}

/**
 * Get device information for registration
 * In a real iOS/Android app, this would use native APIs
 * For web, we simulate with browser fingerprinting
 */
export const getDeviceInfo = (): Promise<DeviceInfo> => {
    return new Promise((resolve) => {
        // Generate a consistent device name
        const deviceName = `iPad_${makeId().substring(0, 8)}`;
        
        // In a real mobile app, you would get the actual MAC address
        // For web simulation, generate a consistent MAC-like identifier
        const macAddress = generateMacAddress();
        
        // Get IP address (in real app this would be the actual IP)
        getLocalIPAddress().then((ipAddress) => {
            const staffDeviceId = getStaffDeviceId();
            
            resolve({
                deviceName,
                macAddress,
                ipAddress,
                staffDeviceId
            });
        });
    });
};

/**
 * Generate a MAC address-like identifier
 * In real app, this would be the actual MAC address
 */
const generateMacAddress = (): string => {
    const hexChars = '0123456789ABCDEF';
    let mac = '';
    
    // Get or create a stored MAC address for consistency
    const storedMac = localStorage.getItem('device_mac_address');
    if (storedMac) {
        return storedMac;
    }
    
    // Generate new MAC address format: XX:XX:XX:XX:XX:XX
    for (let i = 0; i < 6; i++) {
        if (i > 0) mac += ':';
        mac += hexChars[Math.floor(Math.random() * 16)];
        mac += hexChars[Math.floor(Math.random() * 16)];
    }
    
    // Store for consistency across app sessions
    localStorage.setItem('device_mac_address', mac);
    return mac;
};

/**
 * Get local IP address
 * In real app, this would be more accurate
 */
const getLocalIPAddress = (): Promise<string> => {
    return new Promise((resolve) => {
        // Check if we have a cached IP
        const cachedIP = sessionStorage.getItem('device_ip_address');
        if (cachedIP) {
            resolve(cachedIP);
            return;
        }

        // Try to get IP via WebRTC (works in most browsers)
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pc.createDataChannel('');
            pc.createOffer().then(pc.setLocalDescription.bind(pc));

            pc.onicecandidate = (ice) => {
                if (ice && ice.candidate && ice.candidate.candidate) {
                    const candidateStr = ice.candidate.candidate;
                    const match = /(\d+\.\d+\.\d+\.\d+)/.exec(candidateStr);
                    if (match) {
                        const ip = match[1];
                        // Filter out common non-local IPs
                        if (!ip.startsWith('0.') && !ip.startsWith('127.')) {
                            sessionStorage.setItem('device_ip_address', ip);
                            resolve(ip);
                            pc.close();
                        }
                    }
                }
            };

            // Fallback after 3 seconds
            setTimeout(() => {
                const fallbackIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
                sessionStorage.setItem('device_ip_address', fallbackIP);
                resolve(fallbackIP);
                pc.close();
            }, 3000);

        } catch (error) {
            // Fallback IP if WebRTC fails
            const fallbackIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
            sessionStorage.setItem('device_ip_address', fallbackIP);
            resolve(fallbackIP);
        }
    });
};

/**
 * Get staff device ID
 * In real app, this might come from login or device provisioning
 */
const getStaffDeviceId = (): string => {
    // Check if we have a stored staff device ID
    let staffDeviceId = localStorage.getItem('staff_device_id');
    if (!staffDeviceId) {
        // Generate a new one for first-time setup
        staffDeviceId = `${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        localStorage.setItem('staff_device_id', staffDeviceId);
    }
    return staffDeviceId;
};

/**
 * Clear stored device information (for testing/reset)
 */
export const clearDeviceInfo = (): void => {
    localStorage.removeItem('device_mac_address');
    localStorage.removeItem('staff_device_id');
    sessionStorage.removeItem('device_ip_address');
};

/**
 * Get stored device info without regenerating
 */
export const getStoredDeviceInfo = (): Partial<DeviceInfo> => {
    return {
        macAddress: localStorage.getItem('device_mac_address') || undefined,
        staffDeviceId: localStorage.getItem('staff_device_id') || undefined,
        ipAddress: sessionStorage.getItem('device_ip_address') || undefined
    };
};
