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
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isLoadingHtml, setIsLoadingHtml] = useState(false);

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
        onSignatureRequest: async (data) => {
            console.log('📝 New signature request received:', data);
            setCurrentSignatureData(data);

            // Call getReviewableSignatures API
            setIsLoadingHtml(true);
            try {
                console.log('🔄 Fetching reviewable signatures for patronId:', data.patronId);
                const response = await signatureApiService.getReviewableSignatures(data.patronId);
                console.log('✅ Reviewable signatures response:', response);

                // Handle response format: { data: 'htmlcontent', message: ..., status: ..., success: ... }
                if (response && typeof response === 'object') {
                    const htmlData = (response as any).data || (response as any).htmlContent;
                    if (htmlData) {
                        setHtmlContent(htmlData);
                    } else {
                        console.warn('⚠️ No HTML content in response:', response);
                        setHtmlContent('');
                    }
                } else {
                    console.warn('⚠️ Invalid response format:', response);
                    setHtmlContent('');
                }
            } catch (error) {
                console.error('❌ Failed to fetch reviewable signatures:', error);
                setSignatureError('Failed to load signature details');
                setHtmlContent('');
            } finally {
                setIsLoadingHtml(false);
            }

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
            setHtmlContent('');
            setIsLoadingHtml(false);
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

    // Debug logging for dialog rendering
    useEffect(() => {
        if (signatureDialogOpen) {
            console.log('🔍 Dialog opened with:', {
                isLoadingHtml,
                hasCurrentData: !!currentSignatureData,
                htmlContentLength: htmlContent?.length,
                htmlContentPreview: htmlContent?.substring(0, 100)
            });
        }
    }, [signatureDialogOpen, isLoadingHtml, currentSignatureData, htmlContent]);

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
                    PaperProps={{
                        sx: {
                            height: '85vh',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 1, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Edit sx={{ color: '#274549' }} />
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

                    <DialogContent sx={{
                        pt: 2,
                        pb: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        flex: 1
                    }}>
                        {isLoadingHtml ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Loading signature details...
                                </Typography>
                                <LinearProgress sx={{ width: '100%' }} />
                            </Box>
                        ) : currentSignatureData ? (
                            <>
                                {/* Scrollable HTML Content Area */}
                                <Box sx={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    mb: 2,
                                    pr: 1
                                }}>
                                    {/* Render HTML Content from API */}
                                    {htmlContent ? (
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom color="primary">
                                                <Alert severity="info" sx={{ mt: 1 , color: 'info.main' }}>
                                                    Please review your information and provide your signature below to confirm your identity.
                                                </Alert>
                                            </Typography>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper',
                                                    '& img': {
                                                        maxWidth: '100%',
                                                        height: 'auto'
                                                    },
                                                    '& table': {
                                                        width: '100%',
                                                        borderCollapse: 'collapse'
                                                    },
                                                    '& td, & th': {
                                                        padding: '8px',
                                                        border: '1px solid #e0e0e0'
                                                    }
                                                }}
                                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                                            />
                                        </Box>
                                    ) : (
                                        <Alert severity="warning">
                                            No review content available
                                        </Alert>
                                    )}

                                    {/* <Divider sx={{ my: 2 }} /> */}

                                    {/* Message */}
                                    {/* <Box>
                                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Assignment fontSize="small" />
                                            Important!
                                        </Typography>
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Please review your information and provide your signature below to confirm your identity.
                                        </Alert>
                                    </Box> */}
                                </Box>

                                {/* Fixed Signature Canvas Area */}
                                <Box sx={{
                                    flexShrink: 0,
                                    borderTop: '0.5px solid #274549',
                                    pt: 2,
                                    pb: 1,
                                    bgcolor: 'background.paper'
                                }}>
                                    <SignatureCanvas
                                        width={600}
                                        height={180}
                                        onSignatureChange={handleCanvasSignatureChange}
                                        disabled={isSubmittingSignature || isExpired}
                                    />

                                    {/* Error Message */}
                                    {signatureError && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            {signatureError}
                                        </Alert>
                                    )}
                                </Box>
                            </>
                        ) : null}
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 2, pt: 1, flexShrink: 0, borderTop: '1px solid #e0e0e0' }}>
                        <Button
                            sx={{ border: '1px solid #274549' }}
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
                            sx={{ minWidth: 140, backgroundColor: '#274549' }}
                        >
                            {isSubmittingSignature ? 'Submitting...' : 'Submit Signature'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout>
    );
}