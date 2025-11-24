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
    DialogActions,
    useTheme,
    useMediaQuery,
    Checkbox,
    FormControlLabel
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
    Close,
    Description
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
    const [showSignaturePanel, setShowSignaturePanel] = useState(false);

    // Terms and Conditions states
    const [termsDialogOpen, setTermsDialogOpen] = useState(false);
    const [termsContent, setTermsContent] = useState<string>('');
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

    // Responsive design hooks
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

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
            setShowSignaturePanel(false);
            setHasAgreedToTerms(false);
        }
    }, [signatureDialogOpen]);

    // Load Terms and Conditions
    const loadTermsAndConditions = async (language: string = 'en') => {
        setIsLoadingTerms(true);
        setTermsDialogOpen(true);
        try {
            console.log('🔄 Fetching terms and conditions...');
            const response = await signatureApiService.getTermsAndConditions(language);
            console.log('✅ Terms and conditions response:', response);

            if (response && typeof response === 'object') {
                const termsData = (response as any).data || (response as any).htmlContent || (response as any).content;
                if (termsData) {
                    setTermsContent(termsData);
                } else {
                    console.warn('⚠️ No terms content in response:', response);
                    setTermsContent('<p>Terms and conditions not available</p>');
                }
            } else {
                console.warn('⚠️ Invalid terms response format:', response);
                setTermsContent('<p>Terms and conditions not available</p>');
            }
        } catch (error) {
            console.error('❌ Failed to fetch terms and conditions:', error);
            setTermsContent('<p>Failed to load terms and conditions</p>');
        } finally {
            setIsLoadingTerms(false);
        }
    };

    // Handle agree to terms
    const handleAgreeToTerms = () => {
        setHasAgreedToTerms(true);
        setTermsDialogOpen(false);
    };

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

        if (!hasAgreedToTerms) {
            setSignatureError('Please read and agree to the Terms and Conditions');
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
                    maxWidth="lg"
                    fullWidth
                    fullScreen={isMobile}
                    disableEscapeKeyDown={isSubmittingSignature}
                    PaperProps={{
                        sx: {
                            height: isMobile ? '100vh' : '90vh',
                            maxHeight: isMobile ? '100vh' : '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            m: isMobile ? 0 : 2
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 1, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {timeLeft !== null && (
                                <Chip
                                    icon={<Schedule />}
                                    label={isExpired ? 'Expired' : `${formatTimeLeft(timeLeft)} remaining`}
                                    color={isExpired ? 'error' : timeLeft < 60 ? 'warning' : 'success'}
                                    size="small"
                                />
                            )}
                        </Box>
                        <Button
                            onClick={handleCloseSignatureDialog}
                            disabled={isSubmittingSignature}
                            sx={{
                                minWidth: 'auto',
                                p: 1,
                                color: '#274549',
                                '&:hover': {
                                    bgcolor: 'rgba(39, 69, 73, 0.1)'
                                }
                            }}
                        >
                            <Close />
                        </Button>
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                                    Loading document...
                                </Typography>
                                <LinearProgress sx={{ width: '60%' }} />
                            </Box>
                        ) : currentSignatureData ? (
                            <>
                                {/* Full Screen Scrollable HTML Content Area */}
                                <Box sx={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    pr: 1,
                                    WebkitOverflowScrolling: 'touch',
                                    position: 'relative'
                                }}>
                                    {htmlContent ? (
                                        <Box
                                            sx={{
                                                p: 3,
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 2,
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
                                                    padding: '12px',
                                                    border: '1px solid #e0e0e0'
                                                },
                                                '& th': {
                                                    bgcolor: '#f5f5f5',
                                                    fontWeight: 'bold'
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                                        />
                                    ) : (
                                        <Alert severity="warning" sx={{ fontSize: '1.1rem' }}>
                                            No review content available
                                        </Alert>
                                    )}

                                    {/* Fixed Sign Button - Bottom Right Corner with hover expand */}
                                    {!showSignaturePanel && (
                                        <Button
                                            onClick={() => setShowSignaturePanel(true)}
                                            disabled={isExpired}
                                            variant="contained"
                                            size="large"
                                            startIcon={<Edit />}
                                            sx={{
                                                position: 'sticky',
                                                bottom: 16,
                                                right: 16,
                                                float: 'right',
                                                mt: 2,
                                                mb: 2,
                                                backgroundColor: '#274549',
                                                boxShadow: '0 4px 12px rgba(39, 69, 73, 0.3)',
                                                minWidth: 56,
                                                width: 56,
                                                transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
                                                overflow: 'hidden',
                                                '& .MuiButton-startIcon': {
                                                    margin: 0
                                                },
                                                '& .sign-label': {
                                                    opacity: 0,
                                                    width: 0,
                                                    transition: 'opacity 0.2s, width 0.3s',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden'
                                                },
                                                '&:hover': {
                                                    backgroundColor: '#1a3033',
                                                    boxShadow: '0 6px 16px rgba(39, 69, 73, 0.4)',
                                                    width: 140,
                                                    '& .sign-label': {
                                                        opacity: 1,
                                                        width: 'auto',
                                                        marginLeft: '8px'
                                                    }
                                                },
                                                zIndex: 10
                                            }}
                                        >
                                            <span className="sign-label">SIGN</span>
                                        </Button>
                                    )}

                                    {/* Show applied signature in review form */}
                                    {canvasSignature && !showSignaturePanel && (
                                        <Box sx={{ mt: 3, p: 2, border: '2px solid #274549', borderRadius: 2, bgcolor: '#f9f9f9' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                <Typography variant="body1" sx={{ color: '#274549', fontWeight: 'bold' }}>Your Signature:</Typography>
                                                <Box sx={{ border: '1px solid #274549', borderRadius: 1, bgcolor: '#fff', p: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    <img src={canvasSignature} alt="Signature Preview" style={{ height: 60, maxWidth: 300, display: 'block' }} />
                                                </Box>
                                                <Button
                                                    onClick={() => {
                                                        setCanvasSignature(null);
                                                        setSignatureError(null);
                                                        setShowSignaturePanel(true);
                                                    }}
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ color: '#274549', border: '1px solid #274549' }}
                                                >
                                                    Undo
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}
                                </Box>

                                {/* Signature Panel - Only show when Sign button clicked */}
                                {showSignaturePanel && (
                                    <Box
                                        className="signature-panel"
                                        sx={{
                                            flexShrink: 0,
                                            borderTop: '2px solid #274549',
                                            pt: isMobile ? 0.5 : 1,
                                            pb: 0,
                                            bgcolor: '#f9f9f9',
                                            minHeight: isMobile ? 'auto' : isTablet ? 250 : 300,
                                            maxHeight: isMobile ? '45vh' : isTablet ? '40vh' : '45vh',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            bottom: '10%',
                                            animation: 'slideUp 0.4s ease-out',
                                            '@keyframes slideUp': {
                                                '0%': {
                                                    transform: 'translateY(100%)',
                                                    opacity: 0
                                                },
                                                '100%': {
                                                    transform: 'translateY(-10%)',
                                                    opacity: 1
                                                }
                                            },
                                            '@keyframes slideDown': {
                                                '0%': {
                                                    transform: 'translateY(-10%)',
                                                    opacity: 1
                                                },
                                                '100%': {
                                                    transform: 'translateY(100%)',
                                                    opacity: 0
                                                }
                                            }
                                        }}
                                    >
                                        {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 0.5 : 1, px: isMobile ? 1 : 2, py: 0.5 }}>
                                            <Typography variant="body2" sx={{ color: '#274549', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                                                ✍️ {isMobile ? 'Sign below' : 'Please provide your signature below'}
                                            </Typography>
                                            <Button
                                                onClick={() => {
                                                    // Add slide-down animation before closing
                                                    const panel = document.querySelector('.signature-panel') as HTMLElement;
                                                    if (panel) {
                                                        panel.style.animation = 'slideDown 0.3s ease-in';
                                                        setTimeout(() => {
                                                            setShowSignaturePanel(false);
                                                            setCanvasSignature(null);
                                                            setSignatureError(null);
                                                        }, 250);
                                                    } else {
                                                        setShowSignaturePanel(false);
                                                        setCanvasSignature(null);
                                                        setSignatureError(null);
                                                    }
                                                }}
                                                size="small"
                                                sx={{ color: '#274549', fontSize: isMobile ? '0.7rem' : '0.8rem', minWidth: 'auto', p: 0.5 }}
                                            >
                                                {isMobile ? 'Back' : 'Back to Review'}
                                            </Button>
                                        </Box> */}

                                        <Box sx={{ px: isMobile ? 0.5 : 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                            <Box sx={{ flex: 0, mb: isMobile ? 0.5 : 1 }}>
                                                <SignatureCanvas
                                                    width={isMobile ? 340 : isTablet ? 500 : 700}
                                                    height={isMobile ? 120 : isTablet ? 140 : 180}
                                                    onSignatureChange={handleCanvasSignatureChange}
                                                    disabled={isSubmittingSignature || isExpired}
                                                />
                                            </Box>

                                            {/* Show signature preview and Undo in panel */}
                                            {/* {canvasSignature && (
                                                <Box sx={{ mt: isMobile ? 0.5 : 1, p: isMobile ? 0.75 : 1.5, border: '1px solid #274549', borderRadius: 1, bgcolor: '#fff' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.5 : 1, flexWrap: 'wrap', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                                                        <Typography variant="caption" sx={{ color: '#274549', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Preview:</Typography>
                                                        <Box sx={{ border: '1px solid #274549', borderRadius: 1, bgcolor: '#fff', p: isMobile ? 0.25 : 0.5 }}>
                                                            <img src={canvasSignature} alt="Signature Preview" style={{ height: isMobile ? 30 : 40, maxWidth: isMobile ? 150 : 200, display: 'block' }} />
                                                        </Box>
                                                        <Button
                                                            onClick={() => {
                                                                setCanvasSignature(null);
                                                                setSignatureError(null);
                                                            }}
                                                            variant="outlined"
                                                            size="small"
                                                            sx={{ color: '#274549', border: '1px solid #274549', minHeight: isMobile ? 28 : 32, fontSize: isMobile ? '0.65rem' : '0.75rem', px: isMobile ? 1 : 1.5 }}
                                                        >
                                                            Undo
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            )} */}
                                        </Box>

                                        {/* Error Message */}
                                        {signatureError && (
                                            <Alert severity="error" sx={{ mt: isMobile ? 0.5 : 1, mx: isMobile ? 0.5 : 2, py: isMobile ? 0.25 : 0.5 }}>
                                                <Typography variant="caption" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>{signatureError}</Typography>
                                            </Alert>
                                        )}

                                        {/* Terms and Conditions Checkbox */}
                                        <Box sx={{
                                            px: isMobile ? 1 : 2, pt: isMobile ? 1 : 1.5,
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={hasAgreedToTerms}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                loadTermsAndConditions('en');
                                                            } else {
                                                                setHasAgreedToTerms(false);
                                                            }
                                                        }}
                                                        sx={{
                                                            color: '#274549',
                                                            '&.Mui-checked': {
                                                                color: '#274549'
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="h6" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                                                        I agree to the {' '}
                                                        <Button
                                                            onClick={() => loadTermsAndConditions('en')}
                                                            sx={{
                                                                textTransform: 'none',
                                                                p: 0,
                                                                minWidth: 'auto',
                                                                color: '#274549',
                                                                textDecoration: 'underline',
                                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                                '&:hover': {
                                                                    bgcolor: 'transparent',
                                                                    textDecoration: 'underline'
                                                                }
                                                            }}
                                                        >
                                                            Terms and Conditions
                                                        </Button>
                                                    </Typography>
                                                }
                                            />
                                        </Box>

                                        {/* Actions when signature panel is shown */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: isMobile ? 1 : 1.5,
                                            mt: 'auto',
                                            pt: isMobile ? 1 : 1.5,
                                            pb: isMobile ? 1 : 1.5,
                                            flexDirection: 'row',
                                            px: isMobile ? 1 : 2,
                                            flexWrap: 'nowrap',
                                            borderTop: '1px solid #e0e0e0',
                                            bgcolor: '#ffffff',
                                            boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
                                            position: 'sticky',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            zIndex: 10
                                        }}>
                                            <Button
                                                onClick={() => {
                                                    // Add slide-down animation before closing
                                                    const panel = document.querySelector('.signature-panel') as HTMLElement;
                                                    if (panel) {
                                                        panel.style.animation = 'slideDown 0.3s ease-in';
                                                        setTimeout(() => {
                                                            setShowSignaturePanel(false);
                                                        }, 250);
                                                    } else {
                                                        setShowSignaturePanel(false);
                                                    }
                                                }}
                                                disabled={isSubmittingSignature}
                                                variant="outlined"
                                                size={isMobile ? 'small' : 'medium'}
                                                sx={{
                                                    minWidth: isMobile ? 100 : isTablet ? 120 : 140,
                                                    flex: isMobile || isTablet ? 1.5 : 'none',
                                                    border: '1px solid #274549',
                                                    color: '#274549',
                                                    fontSize: isMobile ? '0.8rem' : '1rem',
                                                    height: isMobile ? 36 : 40
                                                }}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                onClick={handleSubmitCanvasSignature}
                                                disabled={isSubmittingSignature || !canvasSignature || isExpired || !hasAgreedToTerms}
                                                startIcon={isMobile ? null : <Send />}
                                                variant="contained"
                                                size={isMobile ? 'small' : 'medium'}
                                                sx={{
                                                    minWidth: isMobile ? 100 : isTablet ? 120 : 140,
                                                    flex: isMobile || isTablet ? 1.5 : 'none',
                                                    backgroundColor: '#274549',
                                                    fontSize: isMobile ? '0.8rem' : '1rem',
                                                    height: isMobile ? 36 : 40,
                                                    '&:hover': {
                                                        backgroundColor: '#1a3033'
                                                    }
                                                }}
                                            >
                                                {isSubmittingSignature ? (isMobile ? 'Sending...' : 'Submitting...') : (isMobile ? 'Submit Signature' : 'Submit Signature')}
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                            </>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Terms and Conditions Dialog */}
                <Dialog
                    open={termsDialogOpen}
                    onClose={() => setTermsDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                    fullScreen={isMobile}
                    PaperProps={{
                        sx: {
                            height: isMobile ? '100vh' : '80vh',
                            maxHeight: isMobile ? '100vh' : '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            m: isMobile ? 0 : 2
                        }
                    }}
                >
                    <DialogTitle sx={{
                        pb: 1,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: '#274549',
                        color: 'white'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Description />
                            <Typography variant="h6">Terms and Conditions</Typography>
                        </Box>
                        <Button
                            onClick={() => setTermsDialogOpen(false)}
                            sx={{
                                minWidth: 'auto',
                                p: 1,
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            <Close />
                        </Button>
                    </DialogTitle>

                    <DialogContent sx={{
                        pt: 2,
                        pb: 2,
                        flex: 1,
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {isLoadingTerms ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                                    Loading terms and conditions...
                                </Typography>
                                <LinearProgress sx={{ width: '60%' }} />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    p: 3,
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2,
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
                                        padding: '12px',
                                        border: '1px solid #e0e0e0'
                                    },
                                    '& th': {
                                        bgcolor: '#f5f5f5',
                                        fontWeight: 'bold'
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: termsContent }}
                            />
                        )}
                    </DialogContent>

                    <DialogActions sx={{
                        p: 2,
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#f9f9f9'
                    }}>
                        <Button
                            onClick={() => setTermsDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                border: '1px solid #274549',
                                color: '#274549',
                                '&:hover': {
                                    border: '1px solid #1a3033',
                                    bgcolor: 'rgba(39, 69, 73, 0.05)'
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAgreeToTerms}
                            variant="contained"
                            disabled={isLoadingTerms}
                            startIcon={<CheckCircle />}
                            sx={{
                                backgroundColor: '#274549',
                                '&:hover': {
                                    backgroundColor: '#1a3033'
                                }
                            }}
                        >
                            Agree & Continue
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout>
    );
}