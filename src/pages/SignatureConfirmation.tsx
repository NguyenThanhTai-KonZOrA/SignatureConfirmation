import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Alert,
    LinearProgress,
    Stack,
    Avatar,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Person,
    Wifi,
    WifiOff,
    CheckCircle,
    Error,
    Devices,
    Schedule,
    Assignment,
    Edit,
    Send,
    Close
} from '@mui/icons-material';
import MainLayout from "../layout/MainLayout";
import { useDeviceManagerContext } from '../contexts/deviceManagerContext';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { signatureApiService } from '../services/signatrueApiService';
import type { SignatureMessageData, SignatureConfirmRequest } from '../type';

const stepDescriptions = {
    'idle': 'Initializing system...',
    'getting-device-info': '🔍 Getting device information',
    'registering': '📡 Registering device with server',
    'connecting-signalr': '🔗 Connecting to signature service',
    'updating-connection': '🔄 Updating connection',
    'starting-heartbeat': '💓 Starting monitoring',
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

export default function SignatureConfirmation() {
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [currentSignatureData, setCurrentSignatureData] = useState<SignatureMessageData | null>(null);
    const [canvasSignature, setCanvasSignature] = useState<string | null>(null);
    const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
    const [signatureError, setSignatureError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Device Manager Context
    const {
        registrationResult,
        deviceInfo,
        isConnectedToSignalR,
        signalRConnectionId,
        isHeartbeatActive,
        lastHeartbeat,
        isReady,
        error: deviceError,
        currentStep,
        retry
    } = useDeviceManagerContext();

    // Signature Request Hook
    const {
        totalRequests,
        handleSignatureSubmitted,
        handleSignatureError
    } = useSignatureRequest({
        onSignatureRequest: (data) => {
            console.log('📝 New signature request received:', data);
            setCurrentSignatureData(data);
            setSignatureDialogOpen(true);
        },
        onSignatureSubmitted: (requestId) => {
            console.log('✅ Signature submitted successfully:', requestId);
        },
        onSignatureError: (error) => {
            console.error('❌ Signature error:', error);
        },
        autoShowDialog: false // We'll handle dialog manually
    });

    // Timer for signature expiry
    useEffect(() => {
        if (!currentSignatureData || !currentSignatureData.expiryMinutes) {
            setTimeLeft(null);
            return;
        }

        const requestTime = new Date(currentSignatureData.timestamp);
        const expiryTime = new Date(requestTime.getTime() + currentSignatureData.expiryMinutes * 60 * 1000);

        const updateTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setSignatureError('Signature request has expired');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [currentSignatureData]);

    // Reset signature dialog state when closed
    useEffect(() => {
        if (!signatureDialogOpen) {
            setCanvasSignature(null);
            setSignatureError(null);
            setIsSubmittingSignature(false);
        }
    }, [signatureDialogOpen]);

    const formatTimeLeft = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCanvasSignatureChange = (signature: string | null) => {
        setCanvasSignature(signature);
        setSignatureError(null);
    };

    const handleSubmitCanvasSignature = async () => {
        if (!currentSignatureData || !canvasSignature) {
            setSignatureError('Please provide your signature');
            return;
        }

        if (timeLeft !== null && timeLeft <= 0) {
            setSignatureError('Signature request has expired');
            return;
        }

        setIsSubmittingSignature(true);
        setSignatureError(null);

        try {
            const request: SignatureConfirmRequest = {
                sessionId: currentSignatureData.sessionId,
                patronId: currentSignatureData.patronId,
                signature: canvasSignature, // Send canvas data
                staffDeviceId: currentSignatureData.staffDeviceId
            };

            console.log('🔄 Submitting canvas signature:', request);

            const response = await signatureApiService.submitSignature(request);

            if (response && response.success) {
                console.log('✅ Canvas signature submitted successfully:', response);
                handleSignatureSubmitted(currentSignatureData.sessionId);
                setSignatureDialogOpen(false);
            } else {
                const errorMsg = response?.message || 'Failed to submit signature';
                setSignatureError(errorMsg);
                handleSignatureError(errorMsg);
            }

        } catch (error) {
            let errorMessage = 'Failed to submit signature';

            if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String((error as any).message);
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            console.error('❌ Error submitting canvas signature:', error);
            setSignatureError(errorMessage);
            handleSignatureError(errorMessage);
        } finally {
            setIsSubmittingSignature(false);
        }
    };

    const handleCloseSignatureDialog = () => {
        if (!isSubmittingSignature) {
            setSignatureDialogOpen(false);
            setCurrentSignatureData(null);
        }
    };

    const isExpired = timeLeft !== null && timeLeft <= 0;

    return (
        <MainLayout>
            <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
                    📝 Signature Confirmation System
                </Typography>

                {/* System Status */}
                <Card elevation={3} sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            System Status
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {stepDescriptions[currentStep as keyof typeof stepDescriptions]}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={stepProgress[currentStep as keyof typeof stepProgress]}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                            <Chip
                                icon={registrationResult?.success ? <CheckCircle /> : <Error />}
                                label={registrationResult?.success ? 'Device Registered' : 'Not Registered'}
                                color={registrationResult?.success ? 'success' : 'default'}
                                variant={registrationResult?.success ? 'filled' : 'outlined'}
                            />
                            <Chip
                                icon={isConnectedToSignalR ? <Wifi /> : <WifiOff />}
                                label={isConnectedToSignalR ? 'Service Connected' : 'Service Disconnected'}
                                color={isConnectedToSignalR ? 'success' : 'default'}
                                variant={isConnectedToSignalR ? 'filled' : 'outlined'}
                            />
                            <Chip
                                icon={<Devices />}
                                label={isReady ? 'Ready for Signatures' : 'Initializing...'}
                                color={isReady ? 'success' : 'default'}
                                variant={isReady ? 'filled' : 'outlined'}
                            />
                            {totalRequests > 0 && (
                                <Chip
                                    label={`Total Requests: ${totalRequests}`}
                                    color="info"
                                    variant="outlined"
                                />
                            )}
                        </Stack>

                        {deviceError && (
                            <Alert severity="error" sx={{ mt: 2 }} action={
                                <Button color="inherit" size="small" onClick={retry}>
                                    Retry
                                </Button>
                            }>
                                {deviceError}
                            </Alert>
                        )}

                        {isReady && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    🎉 System is ready! Waiting for signature requests...
                                </Typography>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* User & Device Information */}
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1 }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Person />
                                    User Information
                                </Typography>

                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                        <Person />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Staff Member
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Device: {deviceInfo?.deviceName || 'Unknown Device'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Divider sx={{ my: 2 }} />

                                <Stack spacing={1}>
                                    <Typography variant="body2">
                                        <strong>Status:</strong> {isReady ? 'Active' : 'Initializing'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Location:</strong> {deviceInfo?.ipAddress || 'Unknown'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Last Activity:</strong> {lastHeartbeat ? lastHeartbeat.toLocaleTimeString() : 'Never'}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Devices />
                                    Device Information
                                </Typography>

                                {deviceInfo ? (
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
                                            <strong>Connection ID:</strong> {signalRConnectionId || 'Not connected'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Heartbeat:</strong> {isHeartbeatActive ? 'Active' : 'Inactive'}
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography color="text.secondary">
                                        Device information loading...
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Signature Dialog with Canvas */}
                <Dialog
                    open={signatureDialogOpen}
                    onClose={handleCloseSignatureDialog}
                    maxWidth="md"
                    fullWidth
                    disableEscapeKeyDown={isSubmittingSignature}
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Edit color="primary" />
                            <Typography variant="h6" component="span">
                                Digital Signature Request
                            </Typography>
                        </Box>

                        {timeLeft !== null && (
                            <Chip
                                icon={<Schedule />}
                                label={isExpired ? 'Expired' : `${formatTimeLeft(timeLeft)} remaining`}
                                color={isExpired ? 'error' : timeLeft < 60 ? 'warning' : 'success'}
                                size="small"
                            />
                        )}
                    </DialogTitle>

                    <DialogContent sx={{ pt: 2 }}>
                        {currentSignatureData && (
                            <Stack spacing={3}>
                                {/* Patron Information */}
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Person fontSize="small" />
                                        Customer Information
                                    </Typography>
                                    <Box sx={{ pl: 3 }}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Full Name:</strong> {currentSignatureData.patronData?.lastName} {currentSignatureData.patronData?.firstName}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>ID Card Number:</strong> {currentSignatureData.patronData?.idNumber}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>ID Card Type:</strong> {currentSignatureData.patronData?.idType}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Birthday:</strong> {currentSignatureData.patronData?.birthday}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Address:</strong> {currentSignatureData.patronData?.address}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Document Type:</strong> {currentSignatureData.documentType}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider />

                                {/* Message */}
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Assignment fontSize="small" />
                                        Important!
                                    </Typography>
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Please review your information and provide your signature below to confirm your identity.
                                    </Alert>
                                </Box>

                                {/* Signature Canvas */}
                                <Box>
                                    <SignatureCanvas
                                        width={600}
                                        height={250}
                                        onSignatureChange={handleCanvasSignatureChange}
                                        disabled={isSubmittingSignature || isExpired}
                                    />
                                </Box>

                                {/* Error Message */}
                                {signatureError && (
                                    <Alert severity="error">
                                        {signatureError}
                                    </Alert>
                                )}

                                {/* Request Info */}
                                {/* <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        <strong>Request ID:</strong> {currentSignatureData.requestId}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        <strong>Requested:</strong> {new Date(currentSignatureData.timestamp).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        <strong>Device:</strong> {deviceInfo?.deviceName || 'Unknown'}
                                    </Typography>
                                </Box> */}
                            </Stack>
                        )}
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                        <Button
                            onClick={handleCloseSignatureDialog}
                            disabled={isSubmittingSignature}
                            startIcon={<Close />}
                            color="inherit"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitCanvasSignature}
                            disabled={isSubmittingSignature || !canvasSignature || isExpired}
                            startIcon={<Send />}
                            variant="contained"
                            color="primary"
                            sx={{ minWidth: 140 }}
                        >
                            {isSubmittingSignature ? 'Submitting...' : 'Submit Signature'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout>
    );
}