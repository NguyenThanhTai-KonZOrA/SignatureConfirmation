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
    Description,
    Hotel,
    Stars,
    BeachAccess
} from '@mui/icons-material';
import MainLayout from "../layout/MainLayout";
import { useDeviceManagerContext } from '../contexts/deviceManagerContext';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { signatureApiService } from '../services/signatrueApiService';
import type { SignatureMessageData, SignatureConfirmRequest, DeviceMappingResponse } from '../type';
import { useTranslation } from 'react-i18next';

const stepDescriptions = {
    'idle': 'Initializing system...',
    'getting-device-info': '🔍 Getting device information',
    'registering': '📡 Registering device with server',
    'connecting-signalr': '🔗 Connecting to signature service',
    'updating-connection': '🔄 Updating connection',
    'starting-heartbeat': '💓 Starting monitoring',
    'ready': ''
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

    // Current hostname state
    const [currentHostName, setCurrentHostName] = useState<string>('');
    const [currentHostIP, setCurrentHostIP] = useState<string>('');

    // Device mapping information state
    const [deviceMapping, setDeviceMapping] = useState<DeviceMappingResponse | null>(null);
    const [isLoadingDeviceMapping, setIsLoadingDeviceMapping] = useState(false);
    const [deviceMappingError, setDeviceMappingError] = useState<string | null>(null);

    // Responsive design hooks
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
    const { t, i18n } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language || 'en');

    // Sync language when i18n language changes
    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            setSelectedLanguage(lng);
        };
        i18n.on('languageChanged', handleLanguageChange);
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    // Load current hostname on mount
    useEffect(() => {
        const loadCurrentHostName = async () => {
            try {
                console.log('🔄 Fetching current hostname...');
                const response = await signatureApiService.getCurrentHostName();
                console.log('✅ Current hostname response:', response);

                if (response) {
                    setCurrentHostName(response.computerName || '');
                    setCurrentHostIP(response.ip || '');
                }
            } catch (error) {
                console.error('❌ Failed to fetch current hostname:', error);
            }
        };

        loadCurrentHostName();
    }, []);

    // Load device mapping information on mount
    useEffect(() => {
        const loadDeviceMapping = async () => {
            setIsLoadingDeviceMapping(true);
            setDeviceMappingError(null);
            try {
                console.log('🔄 Fetching patron device information...');
                const response = await signatureApiService.getPatronDeviceInformation();
                console.log('✅ Patron device information response:', response);

                if (response) {
                    setDeviceMapping(response);

                    // Check if both devices are online
                    const patronOnline = response.patronDevice?.isOnline;
                    const staffOnline = response.staffDevice?.isOnline;

                    if (!staffOnline) {
                        const offlineDevices = [];
                        if (!patronOnline) offlineDevices.push('PatronDevice');
                        //if (!staffOnline) offlineDevices.push('StaffDevice');

                        setDeviceMappingError(`${t(offlineDevices.join(' and '))} ${t('Offline')}. ${t('PleaseConnect')}`);
                    }
                }
            } catch (error) {
                console.error('❌ Failed to fetch patron device information:', error);
                setDeviceMappingError(t('Failed to load device information'));
            } finally {
                setIsLoadingDeviceMapping(false);
            }
        };

        loadDeviceMapping();

        // Refresh device mapping every 30 seconds
        const interval = setInterval(loadDeviceMapping, 30000);

        return () => clearInterval(interval);
    }, []);

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
                console.log('🔄 Fetching reviewable signatures for patronId:', data.patronId, 'language:', selectedLanguage);
                const response = await signatureApiService.getReviewableSignatures(data.patronId, selectedLanguage);
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
    const loadTermsAndConditions = async () => {
        setIsLoadingTerms(true);
        setTermsDialogOpen(true);
        try {
            console.log('🔄 Fetching terms and conditions for language:', selectedLanguage);
            const response = await signatureApiService.getTermsAndConditions(selectedLanguage);
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
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f5f7fa'
            }}>
                {/* Welcome Banner */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #274549 0%, #1a3033 100%)',
                    color: 'white',
                    py: { xs: 6, md: 8 },
                    px: 3,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'url(/images/TheGrandHoTram.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.1,
                        zIndex: 0
                    }
                }}>
                    <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 800, mx: 'auto' }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            mb: 2
                        }}>
                            {/* <Hotel sx={{ fontSize: { xs: 40, md: 56 } }} /> */}
                            <Stars sx={{ fontSize: { xs: 32, md: 40 }, color: '#ffd700' }} />
                            <Stars sx={{ fontSize: { xs: 32, md: 40 }, color: '#ffd700' }} />
                            <Stars sx={{ fontSize: { xs: 32, md: 40 }, color: '#ffd700' }} />
                            <Stars sx={{ fontSize: { xs: 32, md: 40 }, color: '#ffd700' }} />
                            <Stars sx={{ fontSize: { xs: 32, md: 40 }, color: '#ffd700' }} />
                        </Box>

                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '2rem', md: '2rem' },
                                mb: 2,
                                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {t("WelcomeToTheGrandHoTram") || "Welcome to The Grand Hồ Tràm"}
                        </Typography>

                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 300,
                                fontSize: { xs: '2rem', md: '1.5rem' },
                                mb: 3,
                                opacity: 0.95,
                                lineHeight: 1.6
                            }}
                        >
                            {t("SignatureConfirmationSystem") || "Digital Signature Confirmation System"}
                        </Typography>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            flexWrap: 'wrap'
                        }}>
                            {/* <Typography variant="h5"
                                sx={{
                                    fontWeight: 300,
                                    fontSize: { xs: '1.1rem', md: '1.5rem' },
                                    mb: 3,
                                    opacity: 0.95,
                                    lineHeight: 1.6
                                }}>
                                {t("LuxuryResortExperience") || "Luxury Resort Experience"}
                            </Typography> */}
                            {/* {isReady && (
                                <Chip 
                                    icon={<CheckCircle />}
                                    label={t("SystemReady") || "System Ready"}
                                    sx={{ 
                                        bgcolor: 'rgba(76, 175, 80, 0.9)',
                                        color: 'white',
                                        backdropFilter: 'blur(10px)',
                                        fontWeight: 500,
                                        fontSize: '0.9rem',
                                        py: 2.5,
                                        px: 1
                                    }}
                                />
                            )} */}
                        </Box>

                        {!isReady && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                                    {stepDescriptions[currentStep as keyof typeof stepDescriptions]}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={stepProgress[currentStep as keyof typeof stepProgress]}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        '& .MuiLinearProgress-bar': {
                                            bgcolor: 'white',
                                            borderRadius: 4
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Main Content Area */}
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    py: { xs: 4, md: 6 },
                    px: 3,
                    gap: 3
                }}>
                    {/* Status Card */}
                    {isReady ? (
                        <Card
                            elevation={0}
                            sx={{
                                maxWidth: 600,
                                width: '100%',
                                textAlign: 'center',
                                borderRadius: 4,
                                border: '2px dashed #274549',
                                bgcolor: 'white',
                                p: { xs: 4, md: 6 }
                            }}
                        >
                            <Assignment sx={{ fontSize: 60, color: '#274549', mb: 3 }} />
                            <Typography variant="h6" sx={{ fontWeight: 500, color: '#274549', mb: 2 }}>
                                {t("WaitingForSignatureRequest") || "Waiting for Signature Request"}
                            </Typography>
                        </Card>
                    ) : (
                        <Card
                            elevation={0}
                            sx={{
                                maxWidth: 600,
                                width: '100%',
                                textAlign: 'center',
                                borderRadius: 4,
                                bgcolor: 'white',
                                p: { xs: 4, md: 6 },
                                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                        >
                            <Box sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: '#f5f7fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3
                            }}>
                                <Devices sx={{ fontSize: 40, color: '#274549' }} />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: '#274549', mb: 2 }}>
                                {t("InitializingSystem") || "Initializing System..."}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {t("PleaseWait") || "Please wait while we set up your device for signature confirmation."}
                            </Typography>

                            {deviceError && (
                                <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }} action={
                                    <Button color="inherit" size="small" onClick={retry}>
                                        {t("Retry")}
                                    </Button>
                                }>
                                    {deviceError}
                                </Alert>
                            )}
                        </Card>
                    )}

                    {/* Device Information - Separate Row */}
                    {deviceMapping && (
                        <Card
                            elevation={3}
                            sx={{
                                maxWidth: 600,
                                width: '100%',
                                borderRadius: 3,
                                border: deviceMappingError ? '2px solid #274549' : '2px solid #e0e0e0',
                                bgcolor: 'white',
                                p: { xs: 3, md: 4 },
                                boxShadow: deviceMappingError
                                    ? '0 4px 20px rgba(244, 67, 54, 0.2)'
                                    : '0 4px 12px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Typography variant="h6" sx={{
                                fontWeight: 600,
                                color: '#274549',
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                pb: 2,
                                borderBottom: '2px solid #f0f0f0'
                            }}>
                                <Devices sx={{ fontSize: 28 }} />
                                {t("DeviceInformation") || "Device Information"}
                            </Typography>

                            {isLoadingDeviceMapping ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <LinearProgress sx={{ width: '100%' }} />
                                </Box>
                            ) : (
                                <>
                                    {/* Location */}
                                    {/* <Box sx={{
                                        mb: 3,
                                        p: 2.5,
                                        bgcolor: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%)',
                                        borderRadius: 2,
                                        border: '1px solid #e0e0e0'
                                    }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                                            📍 {t("Location") || "Location"}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#274549' }}>
                                            {deviceMapping.location || 'N/A'}
                                        </Typography>
                                    </Box> */}

                                    {/* Staff Device - Full Width */}
                                    <Box sx={{
                                        p: 3,
                                        bgcolor: '#f8f9fa',
                                        borderRadius: 2,
                                        border: '1px solid #e0e0e0'
                                    }}>
                                        <Typography variant="subtitle1" sx={{
                                            fontWeight: 700,
                                            color: '#274549',
                                            mb: 3,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            fontSize: '1.2rem'
                                        }}>
                                            💼 {t("StaffDevice") || "Staff Device"}
                                        </Typography>

                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                            gap: 3,
                                            mb: 3
                                        }}>
                                            {/* Device Name */}
                                            <Box sx={{
                                                p: 2.5,
                                                bgcolor: 'white',
                                                borderRadius: 2,
                                                border: '1px solid #e0e0e0',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}>
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    fontWeight: 600,
                                                    display: 'block',
                                                    mb: 1.5,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {t("DeviceName") || "Device Name"}
                                                </Typography>
                                                <Typography variant="h6" sx={{
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {deviceMapping.staffDevice?.deviceName || 'N/A'}
                                                </Typography>
                                            </Box>

                                            {/* Status */}
                                            <Box sx={{
                                                p: 2.5,
                                                bgcolor: 'white',
                                                borderRadius: 2,
                                                border: '1px solid #e0e0e0',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    fontWeight: 600,
                                                    display: 'block',
                                                    mb: 1.5,
                                                    fontSize: '0.875rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {t("Status") || "Status"}
                                                </Typography>
                                                <Chip
                                                    label={deviceMapping.staffDevice?.isOnline ? t("Online") || "Online" : t("Offline") || "Offline"}
                                                    color={deviceMapping.staffDevice?.isOnline ? 'success' : 'error'}
                                                    sx={{
                                                        height: 36,
                                                        fontSize: '1rem',
                                                        fontWeight: 700,
                                                        px: 2,
                                                        '& .MuiChip-label': {
                                                            px: 1
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        </Box>

                                        {/* System Status - Integrated */}
                                        <Box sx={{
                                            pt: 3,
                                            borderTop: '2px solid #e0e0e0'
                                        }}>
                                            <Typography variant="caption" color="text.secondary" sx={{
                                                fontWeight: 600,
                                                display: 'block',
                                                mb: 2,
                                                fontSize: '0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                ⚙️ {t("SystemStatus") || "System Status"}
                                            </Typography>

                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1.5}
                                                flexWrap="wrap"
                                                sx={{ gap: 1.5 }}
                                            >
                                                <Chip
                                                    size="small"
                                                    icon={registrationResult?.success ? <CheckCircle /> : <Error />}
                                                    label={registrationResult?.success ? t("DeviceRegistered") : t("NotRegistered")}
                                                    color={registrationResult?.success ? 'success' : 'default'}
                                                    variant={registrationResult?.success ? 'filled' : 'outlined'}
                                                    sx={{ 
                                                        height: 28,
                                                        fontSize: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                />

                                                <Chip
                                                    size="small"
                                                    icon={isConnectedToSignalR ? <Wifi /> : <WifiOff />}
                                                    label={isConnectedToSignalR ? t("ServiceConnected") : t("ServiceDisconnected")}
                                                    color={isConnectedToSignalR ? 'success' : 'default'}
                                                    variant={isConnectedToSignalR ? 'filled' : 'outlined'}
                                                    sx={{
                                                        height: 28,
                                                        fontSize: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                />

                                                <Chip
                                                    size="small"
                                                    icon={<Devices />}
                                                    label={isReady ? t("ReadyForSignatures") : t("Initializing")}
                                                    color={isReady ? 'success' : 'default'}
                                                    variant={isReady ? 'filled' : 'outlined'}
                                                    sx={{
                                                        height: 28,
                                                        fontSize: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </Stack>

                                            {/* Device Error Alert */}
                                            {deviceError && (
                                                <Alert
                                                    severity="error"
                                                    sx={{
                                                        mt: 2,
                                                        borderRadius: 2,
                                                        fontSize: '0.85rem'
                                                    }}
                                                    action={
                                                        <Button color="inherit" size="small" onClick={retry}>
                                                            {t("Retry")}
                                                        </Button>
                                                    }
                                                >
                                                    {deviceError}
                                                </Alert>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Warning Alert if any device is offline */}
                                    {deviceMappingError && (
                                        <Alert
                                            severity="warning"
                                            sx={{
                                                mt: 3,
                                                borderRadius: 2,
                                                fontWeight: 500,
                                                fontSize: '0.95rem'
                                            }}
                                            icon={<Error sx={{ fontSize: 24 }} />}
                                        >
                                            {deviceMappingError}
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Card>
                    )}
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
                                    {t("LoadingDocument")}
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
                                            {t("NoReviewContentAvailable")}
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
                                            <span className="sign-label">{t("Sign")}</span>
                                        </Button>
                                    )}

                                    {/* Show applied signature in review form */}
                                    {canvasSignature && !showSignaturePanel && (
                                        <Box sx={{ mt: 3, p: 2, border: '2px solid #274549', borderRadius: 2, bgcolor: '#f9f9f9' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                <Typography variant="body1" sx={{ color: '#274549', fontWeight: 'bold' }}>{t("YourSignature")}:</Typography>
                                                <Box sx={{ border: '1px solid #274549', borderRadius: 1, bgcolor: '#fff', p: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    <img src={canvasSignature} alt={t("SignaturePreview")} style={{ height: 60, maxWidth: 300, display: 'block' }} />
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
                                                    {t("Undo")}
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
                                            px: isMobile ? 1 : 2,
                                            pt: isMobile ? 1 : 1.5,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            borderTop: '1px solid #e0e0e0',
                                            bgcolor: '#ffffff',
                                            boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
                                        }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={hasAgreedToTerms}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                loadTermsAndConditions();
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
                                                    <Typography variant="body1" sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>
                                                        {t("IAgreeToTheTermsAndConditions")} {' '}
                                                        <Button
                                                            onClick={() => loadTermsAndConditions()}
                                                            sx={{
                                                                textTransform: 'none',
                                                                p: 0,
                                                                minWidth: 'auto',
                                                                color: '#274549',
                                                                textDecoration: 'underline',
                                                                fontSize: isMobile ? '0.8rem' : '1rem',
                                                                '&:hover': {
                                                                    bgcolor: 'transparent',
                                                                    textDecoration: 'underline'
                                                                }
                                                            }}
                                                        >
                                                        </Button>
                                                    </Typography>
                                                }
                                            />
                                            {canvasSignature && !hasAgreedToTerms && (
                                                <Typography
                                                    variant={isMobile ? 'caption' : 'body2'}
                                                    sx={{
                                                        color: 'error.main',
                                                        mt: 0.5,
                                                        fontWeight: 550,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {t("PleaseReadTermsAndConditionsBeforeSubmitting")}
                                                </Typography>
                                            )}
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
                                                {t("Back")}
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
                                                {isSubmittingSignature ? (isMobile ? t("Sending") : t("Submitting")) : (isMobile ? t("SubmitSignature") : t("SubmitSignature"))}
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
                            height: isMobile ? '95vh' : '80vh',
                            maxHeight: isMobile ? '95vh' : '80vh',
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
                            <Typography variant="h6">{t("TermsAndConditions")}</Typography>
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
                                    {t("LoadingTermsAndConditions")}
                                </Typography>
                                <LinearProgress sx={{ width: '60%' }} />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    wordSpacing: '0.15em',
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
                            {t("Cancel")}
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
                            {t("AgreeAndContinue")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout >
    );
}