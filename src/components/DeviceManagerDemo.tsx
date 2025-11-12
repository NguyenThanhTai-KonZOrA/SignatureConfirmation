import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    Chip,
    Alert,
    LinearProgress,
    Stack,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Paper
} from '@mui/material';
import {
    Devices,
    Wifi,
    WifiOff,
    CheckCircle,
    Error,
    Refresh,
    Stop,
    PlayArrow
} from '@mui/icons-material';
import { useDeviceManager } from '../hooks/useDeviceManager';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { SignatureRequestDialog } from './SignatureRequestDialog';
import { clearDeviceInfo } from '../utils/deviceInfo';
import type { RegisterDeviceResponse, SignatureMessageData } from '../type';

const stepDescriptions = {
    'idle': 'Ready to start device registration',
    'getting-device-info': '🔍 Getting device information (MAC, IP addresses)',
    'registering': '📡 Registering device with API server',
    'connecting-signalr': '🔗 Connecting to SignalR hub',
    'updating-connection': '🔄 Updating connection ID in database',
    'starting-heartbeat': '💓 Starting heartbeat monitoring',
    'ready': '✅ Ready to receive signature requests!'
};

const stepProgress = {
    'idle': 0,
    'getting-device-info': 16,
    'registering': 33,
    'connecting-signalr': 50,
    'updating-connection': 66,
    'starting-heartbeat': 83,
    'ready': 100
};

export const DeviceManagerDemo: React.FC = () => {
    const [onlineDevices, setOnlineDevices] = useState<RegisterDeviceResponse[]>([]);

    const {
        // State
        isRegistering,
        registrationResult,
        deviceInfo,
        registeredDevice,
        isConnectedToSignalR,
        signalRConnectionId,
        isHeartbeatActive,
        lastHeartbeat,
        isReady,
        error,
        currentStep,
        
        // Actions
        registerDevice,
        disconnect,
        retry,
        getOnlineDevices
    } = useDeviceManager({
        autoRegister: false, // Manual control for demo
        autoConnect: true,
        autoHeartbeat: true,
        heartbeatInterval: 15000, // 15 seconds for demo
        onRegistrationComplete: (result) => {
            console.log('Registration completed:', result);
        },
        onSignalRConnected: (connectionId) => {
            console.log('SignalR connected with ID:', connectionId);
        },
        onReady: () => {
            console.log('Device is ready!');
        }
    });

    // Signature request handling
    const {
        currentRequest,
        isDialogOpen,
        totalRequests,
        closeSignatureDialog,
        handleSignatureSubmitted,
        handleSignatureError,
        openSignatureDialog
    } = useSignatureRequest({
        onSignatureRequest: (data) => {
            console.log('📝 Signature request received:', data);
        },
        onSignatureSubmitted: (requestId) => {
            console.log('✅ Signature submitted:', requestId);
        },
        onSignatureError: (error) => {
            console.error('❌ Signature error:', error);
        },
        autoShowDialog: true
    });

    const handleGetOnlineDevices = async () => {
        try {
            const devices = await getOnlineDevices();
            setOnlineDevices(devices);
        } catch (error) {
            console.error('Failed to get online devices:', error);
        }
    };

    const handleClearDeviceInfo = () => {
        clearDeviceInfo();
        disconnect();
        setOnlineDevices([]);
        window.location.reload(); // Refresh to clear all state
    };

    // Test signature request function
    const handleTestSignatureRequest = () => {
        const testData: SignatureMessageData = {
            patronId: 12345,
            requestId: `test_${Date.now()}`,
            patronName: 'John Doe',
            documentType: 'ID Verification',
            message: 'Please provide your signature to verify your identity for account access.',
            timestamp: new Date().toISOString(),
            expiryMinutes: 5
        };

        openSignatureDialog(testData);
    };

    const getStepColor = (step: string) => {
        if (currentStep === step) return 'primary';
        if (stepProgress[step as keyof typeof stepProgress] < stepProgress[currentStep as keyof typeof stepProgress]) {
            return 'success';
        }
        return 'default';
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
                🔧 Device Manager Demo
            </Typography>

            {/* Current Status Card */}
            <Card elevation={4} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Current Status
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {stepDescriptions[currentStep]}
                        </Typography>
                        <LinearProgress 
                            variant="determinate" 
                            value={stepProgress[currentStep]} 
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                        <Chip
                            icon={registrationResult?.success ? <CheckCircle /> : <Error />}
                            label={registrationResult?.success ? 'Registered' : 'Not Registered'}
                            color={registrationResult?.success ? 'success' : 'default'}
                            variant={registrationResult?.success ? 'filled' : 'outlined'}
                        />
                        <Chip
                            icon={isConnectedToSignalR ? <Wifi /> : <WifiOff />}
                            label={isConnectedToSignalR ? 'SignalR Connected' : 'SignalR Disconnected'}
                            color={isConnectedToSignalR ? 'success' : 'default'}
                            variant={isConnectedToSignalR ? 'filled' : 'outlined'}
                        />
                        <Chip
                            icon={<CheckCircle />}
                            label={isHeartbeatActive ? 'Heartbeat Active' : 'Heartbeat Inactive'}
                            color={isHeartbeatActive ? 'success' : 'default'}
                            variant={isHeartbeatActive ? 'filled' : 'outlined'}
                        />
                        <Chip
                            icon={<Devices />}
                            label={isReady ? 'Ready' : 'Not Ready'}
                            color={isReady ? 'success' : 'default'}
                            variant={isReady ? 'filled' : 'outlined'}
                        />
                        {totalRequests > 0 && (
                            <Chip
                                label={`Signature Requests: ${totalRequests}`}
                                color="info"
                                variant="outlined"
                            />
                        )}
                    </Stack>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {lastHeartbeat && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Last heartbeat: {lastHeartbeat.toLocaleTimeString()}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Control Buttons */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Controls
                    </Typography>
                    
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrow />}
                            onClick={registerDevice}
                            disabled={isRegistering || isReady}
                        >
                            {isRegistering ? 'Registering...' : 'Start Registration Flow'}
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={retry}
                            disabled={isRegistering}
                        >
                            Retry
                        </Button>

                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<Stop />}
                            onClick={disconnect}
                            disabled={!registrationResult?.success}
                        >
                            Disconnect
                        </Button>

                        <Button
                            variant="outlined"
                            color="info"
                            onClick={handleGetOnlineDevices}
                        >
                            Get Online Devices ({onlineDevices.length})
                        </Button>

                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleClearDeviceInfo}
                        >
                            Clear Device Info
                        </Button>

                        {isReady && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={handleTestSignatureRequest}
                            >
                                Test Signature Request
                            </Button>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Flow Steps */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Registration Flow Steps
                    </Typography>
                    
                    <List dense>
                        {Object.entries(stepDescriptions).filter(([step]) => step !== 'idle').map(([step, description], index) => (
                            <ListItem key={step}>
                                <ListItemIcon>
                                    <Chip 
                                        label={index + 1} 
                                        size="small" 
                                        color={getStepColor(step)}
                                        variant={currentStep === step ? 'filled' : 'outlined'}
                                    />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={description}
                                    primaryTypographyProps={{
                                        color: currentStep === step ? 'primary' : 'text.primary',
                                        fontWeight: currentStep === step ? 600 : 400
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                {/* Device Information */}
                {deviceInfo && (
                    <Card elevation={2} sx={{ flex: 1 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Device Information
                            </Typography>
                            
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    <strong>Device Name:</strong> {deviceInfo.deviceName}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>MAC Address:</strong> {deviceInfo.macAddress}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>IP Address:</strong> {deviceInfo.ipAddress}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Staff Device ID:</strong> {deviceInfo.staffDeviceId}
                                </Typography>
                            </Stack>

                            {registeredDevice && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" gutterBottom>
                                        Registration Details
                                    </Typography>
                                    <Stack spacing={1}>
                                        <Typography variant="body2">
                                            <strong>Database ID:</strong> {registeredDevice.id}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Connection ID:</strong> {signalRConnectionId || 'Not connected'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Online:</strong> {registeredDevice.isOnline ? 'Yes' : 'No'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Available:</strong> {registeredDevice.isAvailable ? 'Yes' : 'No'}
                                        </Typography>
                                    </Stack>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Online Devices */}
                <Card elevation={2} sx={{ flex: 1 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Online Devices ({onlineDevices.length})
                            </Typography>
                            <Button size="small" onClick={handleGetOnlineDevices}>
                                Refresh
                            </Button>
                        </Box>
                        
                        {onlineDevices.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No online devices found
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {onlineDevices.map((device) => (
                                    <Paper key={device.id} variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            {device.deviceName}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            ID: {device.id}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            IP: {device.ipAddress}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Chip 
                                                label={device.isOnline ? 'Online' : 'Offline'} 
                                                size="small"
                                                color={device.isOnline ? 'success' : 'error'}
                                            />
                                            <Chip 
                                                label={device.isAvailable ? 'Available' : 'Busy'} 
                                                size="small"
                                                color={device.isAvailable ? 'primary' : 'warning'}
                                            />
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            </Stack>

            {/* Signature Request Dialog */}
            <SignatureRequestDialog
                open={isDialogOpen}
                data={currentRequest}
                deviceName={deviceInfo?.deviceName || 'Demo Device'}
                onClose={closeSignatureDialog}
                onSubmitted={handleSignatureSubmitted}
                onError={handleSignatureError}
            />
        </Box>
    );
};
