export interface DeviceInfo {
    deviceName: string;
    macAddress: string;
    ipAddress: string;
    staffDeviceId: string;
}

/**
 * Get device information for registration
 * In a real iOS/Android app, this would use native APIs
 * For web, we simulate with browser fingerprinting and store consistently
 */
export const getDeviceInfo = (): Promise<DeviceInfo> => {
    return new Promise((resolve) => {
        // Generate a consistent device name (store in localStorage to persist across sessions)
        const deviceName = getOrCreateDeviceName();
        
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
 * Get or create a consistent device name
 * In real app, this would be the actual device name from system
 * For web, try to get hostname or generate based on browser/platform info
 */
const getOrCreateDeviceName = (): string => {
    // Check if we have a stored device name
    const storedName = localStorage.getItem('device_name');
    if (storedName) {
        return storedName;
    }
    
    // Try to get actual hostname/computer name
    let deviceName = getActualDeviceName();
    
    // If couldn't get actual name, generate based on platform and browser
    if (!deviceName) {
        deviceName = generateDeviceNameFromPlatform();
    }
    
    // Store for consistency across app sessions
    localStorage.setItem('device_name', deviceName);
    return deviceName;
};

/**
 * Try to get actual device/computer name
 */
const getActualDeviceName = (): string | null => {
    try {
        // Method 1: Try to get from hostname if available
        if (window.location.hostname && 
            window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1' &&
            window.location.hostname !== '0.0.0.0') {
            
            // Clean up hostname to make it a valid device name
            const hostname = window.location.hostname
                .replace(/\./g, '-')
                .toUpperCase();
            return `HOST_${hostname}`;
        }

        // Method 2: Try to extract computer name from User-Agent or other sources
        const userAgent = navigator.userAgent;
        
        // Look for Windows computer name patterns in User-Agent
        const windowsMatch = userAgent.match(/Windows NT [^;)]+/);
        if (windowsMatch) {
            const platform = navigator.platform || 'Win';
            const screenInfo = `${screen.width}x${screen.height}`;
            const hash = generateConsistentHash(`${platform}-${screenInfo}-${navigator.vendor}`);
            return `PC_${hash}`;
        }

        // Look for Mac computer name patterns
        if (userAgent.includes('Macintosh')) {
            const screenInfo = `${screen.width}x${screen.height}`;
            const hash = generateConsistentHash(`Mac-${screenInfo}-${navigator.vendor}`);
            return `MAC_${hash}`;
        }

        return null;
    } catch (error) {
        console.log('Could not get actual device name:', error);
        return null;
    }
};

/**
 * Generate device name from platform info as fallback
 */
const generateDeviceNameFromPlatform = (): string => {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;
    
    let deviceType = 'Device';
    
    // Detect platform type
    if (platform.includes('Win')) {
        deviceType = 'PC';
    } else if (platform.includes('Mac')) {
        deviceType = 'Mac';
    } else if (platform.includes('Linux')) {
        deviceType = 'Linux';
    } else if (/iPad/.test(userAgent)) {
        deviceType = 'iPad';
    } else if (/iPhone/.test(userAgent)) {
        deviceType = 'iPhone';
    } else if (/Android/.test(userAgent)) {
        deviceType = 'Android';
    }
    
    // Create a unique but consistent suffix based on screen resolution and other factors
    const screenInfo = `${screen.width}x${screen.height}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserInfo = navigator.vendor || navigator.product || 'Browser';
    
    const deviceSuffix = generateConsistentHash(`${platform}-${screenInfo}-${timeZone}-${browserInfo}`);
    
    return `${deviceType}_${deviceSuffix}`;
};

/**
 * Generate consistent hash from string
 */
const generateConsistentHash = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to a readable suffix (6 characters)
    return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
};

/**
 * Generate a MAC address-like identifier
 * In real app, this would be the actual MAC address
 * For web, try to get network info or generate consistent identifier
 */
const generateMacAddress = (): string => {
    // Get or create a stored MAC address for consistency
    const storedMac = localStorage.getItem('device_mac_address');
    if (storedMac) {
        return storedMac;
    }
    
    // Try to get network information if available
    const networkMac = getNetworkBasedMac();
    if (networkMac) {
        localStorage.setItem('device_mac_address', networkMac);
        return networkMac;
    }
    
    // Generate consistent MAC based on device characteristics
    const deviceFingerprint = getDeviceFingerprint();
    const mac = generateConsistentMacFromFingerprint(deviceFingerprint);
    
    // Store for consistency across app sessions
    localStorage.setItem('device_mac_address', mac);
    return mac;
};

/**
 * Try to get network-based MAC info
 */
const getNetworkBasedMac = (): string | null => {
    try {
        // This is limited in browsers due to security, but we can try
        // In a real native app, you would use actual network APIs
        
        // Generate based on connection info if available
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection;
        
        if (connection && connection.effectiveType) {
            // Use connection characteristics to generate consistent MAC
            const connectionInfo = `${connection.effectiveType}-${connection.downlink || 'unknown'}`;
            return generateMacFromString(connectionInfo);
        }
        
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Get device fingerprint for consistent MAC generation
 */
const getDeviceFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'Device fingerprint for MAC generation';
    
    if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText(txt, 2, 2);
    }
    
    const fingerprint = [
        navigator.platform,
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        canvas.toDataURL()
    ].join('|');
    
    return fingerprint;
};

/**
 * Generate MAC address from string input
 */
const generateMacFromString = (input: string): string => {
    // Create hash from input
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Convert to MAC format
    const hex = Math.abs(hash).toString(16).padStart(12, '0');
    const mac = hex.match(/.{2}/g)?.join(':').toUpperCase() || '00:00:00:00:00:00';
    
    // Ensure it's a valid MAC format (6 pairs)
    const pairs = mac.split(':');
    while (pairs.length < 6) {
        pairs.push('00');
    }
    
    return pairs.slice(0, 6).join(':');
};

/**
 * Generate consistent MAC from device fingerprint
 */
const generateConsistentMacFromFingerprint = (fingerprint: string): string => {
    // Use multiple hashes to create 6 pairs
    const hashes = [];
    for (let i = 0; i < 6; i++) {
        let hash = 0;
        const saltedInput = fingerprint + i.toString();
        for (let j = 0; j < saltedInput.length; j++) {
            hash = ((hash << 5) - hash) + saltedInput.charCodeAt(j);
            hash = hash & hash;
        }
        hashes.push((Math.abs(hash) % 256).toString(16).padStart(2, '0').toUpperCase());
    }
    
    return hashes.join(':');
};

/**
 * Get local IP address and hostname
 * In real app, this would be more accurate
 * Try multiple methods to get the actual machine's IP/hostname
 */
const getLocalIPAddress = (): Promise<string> => {
    return new Promise((resolve) => {
        // Check if we have a cached IP (use localStorage for persistence)
        const cachedIP = localStorage.getItem('device_ip_address');
        if (cachedIP) {
            resolve(cachedIP);
            return;
        }

        // Try to get hostname first (most stable identifier)
        getHostnameOrIP()
            .then(ipOrHostname => {
                localStorage.setItem('device_ip_address', ipOrHostname);
                resolve(ipOrHostname);
            })
            .catch(() => {
                // Fallback to WebRTC method
                getIPViaWebRTC()
                    .then(ip => {
                        localStorage.setItem('device_ip_address', ip);
                        resolve(ip);
                    })
                    .catch(() => {
                        // Final fallback
                        const fallbackIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
                        localStorage.setItem('device_ip_address', fallbackIP);
                        resolve(fallbackIP);
                    });
            });
    });
};

/**
 * Get hostname or IP using various methods
 */
const getHostnameOrIP = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Method 1: Try to get from window.location.hostname if not localhost
        if (window.location.hostname && 
            window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1' &&
            window.location.hostname !== '0.0.0.0') {
            resolve(window.location.hostname);
            return;
        }

        // Method 2: Try to get actual IP via external service
        getExternalIP()
            .then(ip => resolve(ip))
            .catch(() => {
                // Method 3: Try WebRTC method
                getIPViaWebRTC()
                    .then(ip => resolve(ip))
                    .catch(() => reject('No IP found'));
            });
    });
};

/**
 * Get external IP address via external service
 */
const getExternalIP = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Try multiple services for reliability
        const services = [
            'https://api.ipify.org?format=text',
            'https://ipapi.co/ip/',
            'https://httpbin.org/ip'
        ];

        let attempts = 0;
        
        const tryNextService = () => {
            if (attempts >= services.length) {
                reject('All services failed');
                return;
            }

            const service = services[attempts];
            attempts++;

            fetch(service, { 
                method: 'GET'
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(data => {
                // Extract IP from response
                let ip = data.trim();
                if (service.includes('httpbin')) {
                    // httpbin returns JSON: {"origin": "x.x.x.x"}
                    const jsonData = JSON.parse(data);
                    ip = jsonData.origin.split(',')[0].trim(); // Take first IP if multiple
                }
                
                // Validate IP format
                if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                    resolve(ip);
                } else {
                    tryNextService();
                }
            })
            .catch(error => {
                console.log(`Service ${service} failed:`, error);
                tryNextService();
            });
        };

        // Add timeout for the whole process
        setTimeout(() => {
            reject('Timeout getting external IP');
        }, 10000);

        tryNextService();
    });
};

/**
 * Get IP via WebRTC (local network IP)
 */
const getIPViaWebRTC = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pc.createDataChannel('');
            pc.createOffer().then(pc.setLocalDescription.bind(pc));

            let resolved = false;

            pc.onicecandidate = (ice) => {
                if (ice && ice.candidate && ice.candidate.candidate && !resolved) {
                    const candidateStr = ice.candidate.candidate;
                    const match = /(\d+\.\d+\.\d+\.\d+)/.exec(candidateStr);
                    if (match) {
                        const ip = match[1];
                        // Filter out common non-local IPs and prefer private network ranges
                        if (!ip.startsWith('0.') && 
                            !ip.startsWith('127.') && 
                            !ip.startsWith('169.254.') && // Link-local
                            (ip.startsWith('192.168.') || // Private range
                             ip.startsWith('10.') || // Private range
                             ip.startsWith('172.') || // Private range
                             true)) { // Accept others as fallback
                            resolved = true;
                            resolve(ip);
                            pc.close();
                        }
                    }
                }
            };

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!resolved) {
                    pc.close();
                    reject('WebRTC timeout');
                }
            }, 5000);

        } catch (error) {
            reject(error);
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
    localStorage.removeItem('device_name');
    localStorage.removeItem('device_mac_address');
    localStorage.removeItem('staff_device_id');
    localStorage.removeItem('device_ip_address');
};

/**
 * Get stored device info without regenerating
 */
export const getStoredDeviceInfo = (): Partial<DeviceInfo> => {
    return {
        deviceName: localStorage.getItem('device_name') || undefined,
        macAddress: localStorage.getItem('device_mac_address') || undefined,
        staffDeviceId: localStorage.getItem('staff_device_id') || undefined,
        ipAddress: localStorage.getItem('device_ip_address') || undefined
    };
};
