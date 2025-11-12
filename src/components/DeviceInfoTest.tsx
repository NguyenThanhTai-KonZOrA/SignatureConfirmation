import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Stack, Alert } from '@mui/material';
import { getDeviceInfo, getStoredDeviceInfo, clearDeviceInfo } from '../utils/deviceInfo';
import type { DeviceInfo } from '../utils/deviceInfo';

/**
 * Component to test device info persistence across page refreshes
 */
export const DeviceInfoTest: React.FC = () => {
    const [currentDeviceInfo, setCurrentDeviceInfo] = useState<DeviceInfo | null>(null);
    const [storedDeviceInfo, setStoredDeviceInfo] = useState<Partial<DeviceInfo>>({});
    const [systemInfo, setSystemInfo] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    // Load device info on component mount
    useEffect(() => {
        loadDeviceInfo();
        setStoredDeviceInfo(getStoredDeviceInfo());
        collectSystemInfo();
    }, []);

    const loadDeviceInfo = async () => {
        setIsLoading(true);
        try {
            const info = await getDeviceInfo();
            setCurrentDeviceInfo(info);
        } catch (error) {
            console.error('Failed to get device info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const collectSystemInfo = () => {
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection;

        setSystemInfo({
            hostname: window.location.hostname,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            vendor: navigator.vendor,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            connection: connection ? {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            } : 'Not available'
        });
    };

    const handleClearAndReload = () => {
        clearDeviceInfo();
        setStoredDeviceInfo({});
        setCurrentDeviceInfo(null);
        loadDeviceInfo();
    };

    const refreshStoredInfo = () => {
        setStoredDeviceInfo(getStoredDeviceInfo());
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                🧪 Device Info & Network Detection Test
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    <strong>Enhanced Detection:</strong> Now attempts to get real hostname and IP address. 
                    Test persistence by refreshing the page (F5). Device info should remain consistent.
                </Typography>
            </Alert>

            <Stack spacing={3}>
                {/* System Information */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="info.main">
                            System Information Detected
                        </Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                <strong>Hostname:</strong> {systemInfo.hostname || 'localhost'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Platform:</strong> {systemInfo.platform}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Timezone:</strong> {systemInfo.timezone}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Screen:</strong> {systemInfo.screen}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Language:</strong> {systemInfo.language}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Browser Vendor:</strong> {systemInfo.vendor || 'Unknown'}
                            </Typography>
                            {systemInfo.connection && typeof systemInfo.connection === 'object' && (
                                <Typography variant="body2">
                                    <strong>Connection:</strong> {systemInfo.connection.effectiveType} 
                                    (DL: {systemInfo.connection.downlink}Mbps, RTT: {systemInfo.connection.rtt}ms)
                                </Typography>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Current Device Info */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                            Generated Device Info
                        </Typography>
                        {isLoading ? (
                            <Typography>Loading...</Typography>
                        ) : currentDeviceInfo ? (
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    <strong>Device Name:</strong> {currentDeviceInfo.deviceName}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>MAC Address:</strong> {currentDeviceInfo.macAddress}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>IP Address:</strong> {currentDeviceInfo.ipAddress}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Staff Device ID:</strong> {currentDeviceInfo.staffDeviceId}
                                </Typography>
                            </Stack>
                        ) : (
                            <Typography color="text.secondary">No device info loaded</Typography>
                        )}
                    </CardContent>
                </Card>

                {/* Stored Device Info */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary">
                            Stored Device Info (LocalStorage)
                        </Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                <strong>Device Name:</strong> {storedDeviceInfo.deviceName || 'Not stored'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>MAC Address:</strong> {storedDeviceInfo.macAddress || 'Not stored'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>IP Address:</strong> {storedDeviceInfo.ipAddress || 'Not stored'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Staff Device ID:</strong> {storedDeviceInfo.staffDeviceId || 'Not stored'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Control Buttons */}
                <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Button 
                        variant="contained" 
                        onClick={loadDeviceInfo}
                        disabled={isLoading}
                    >
                        Refresh Device Info
                    </Button>
                    <Button 
                        variant="outlined" 
                        onClick={refreshStoredInfo}
                    >
                        Refresh Stored Info
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="info"
                        onClick={collectSystemInfo}
                    >
                        Refresh System Info
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="warning"
                        onClick={handleClearAndReload}
                    >
                        Clear & Regenerate
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="info"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page (F5)
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};