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
import { signatureApiService } from '../services/signatureApiService';
import type { SignatureMessageData, SignatureConfirmRequest, DeviceMappingResponse } from '../type';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import NetworkAlert from '../components/NetworkAlert';

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
    const VIETNAM_COUNTRY_ID = '704';
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
    const [hasScrolledToBottomTerms, setHasScrolledToBottomTerms] = useState(false);

    // Notification states
    const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
    const [notificationContent, setNotificationContent] = useState<string>('');
    const [isLoadingNotification, setIsLoadingNotification] = useState(false);
    const [hasAgreedToNotification, setHasAgreedToNotification] = useState(false);

    // Personal Notification states
    const [personalNotificationDialogOpen, setPersonalNotificationDialogOpen] = useState(false);
    const [personalNotificationContent, setPersonalNotificationContent] = useState<string>('');
    const [isLoadingPersonalNotification, setIsLoadingPersonalNotification] = useState(false);
    const [hasAgreedToPersonalNotification, setHasAgreedToPersonalNotification] = useState(false);

    // Current Patron nationality
    const [currentPatronNationality, setCurrentPatronNationality] = useState<string>('');

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

    // Network status monitoring
    const networkStatus = useNetworkStatus();
    const [wasOffline, setWasOffline] = useState(false);

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
                        //if (!patronOnline) offlineDevices.push('PatronDevice');
                        if (!staffOnline) offlineDevices.push('StaffDevice');

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

    // Handle network status changes - auto reconnect when online
    useEffect(() => {
        const handleNetworkChange = async () => {
            if (!networkStatus.isOnline || !networkStatus.isConnected) {
                // Network lost
                console.log('❌ Network connection lost');
                setWasOffline(true);
            } else if (wasOffline && networkStatus.isOnline && networkStatus.isConnected) {
                // Network restored - auto reconnect
                console.log('✅ Network connection restored - attempting auto reconnect...');
                setWasOffline(false);

                // Clear any existing error messages
                if (deviceError) {
                    console.log('🧹 Clearing previous errors after network restore');
                }

                // Clear device mapping error
                setDeviceMappingError(null);
                console.log('🧹 Clearing device mapping errors after network restore');

                // Wait a moment for network to stabilize
                setTimeout(async () => {
                    try {
                        console.log('🔄 Auto-retrying connection after network restore...');
                        await retry();
                        console.log('✅ Auto-reconnect successful!');
                    } catch (error) {
                        console.error('❌ Auto-reconnect failed:', error);
                    }
                }, 1000);
            }
        };

        handleNetworkChange();
    }, [networkStatus.isOnline, networkStatus.isConnected, wasOffline, deviceError, retry]);

    // Signature Request Hook
    const {
        totalRequests,
        handleSignatureSubmitted,
        handleSignatureError
    } = useSignatureRequest({
        onSignatureRequest: async (data) => {
            console.log('📝 New signature request received:', data);
            setCurrentSignatureData(data);

            // Auto change language based on patron nationality
            let realNationality = 'en';
            if (data && data.patronData && data.patronData.nationality === VIETNAM_COUNTRY_ID) {
                // Vietnam nationality - switch to Vietnamese
                console.log('🇻🇳 Patron is Vietnamese - switching to Vietnamese language');
                setCurrentPatronNationality(data.patronData.nationality);
                realNationality = "vi";
                i18n.changeLanguage('vi'); // Auto switch to Vietnamese
            } else {
                // Other nationalities - switch to English
                console.log('🌍 Patron is non-Vietnamese - switching to English language');
                setCurrentPatronNationality(data?.patronData?.nationality || '');
                realNationality = "en";
                i18n.changeLanguage('en'); // Auto switch to English
            }

            // Call getReviewableSignatures API
            setIsLoadingHtml(true);
            try {
                console.log('🔄 Fetching reviewable signatures for patronId:', data.patronId, 'language:', realNationality);

                const response = await signatureApiService.getReviewableSignatures(data.patronId, realNationality);
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
            setHasAgreedToNotification(false);
            setHasAgreedToPersonalNotification(false);
        }
    }, [signatureDialogOpen]);

    // Load Terms and Conditions
    const loadTermsAndConditions = async () => {
        setIsLoadingTerms(true);
        setTermsDialogOpen(true);
        setHasScrolledToBottomTerms(false);
        try {
            console.log('🔄 Fetching terms and conditions for language:', selectedLanguage);
            let request = {
                Lang: selectedLanguage,
                PatronId: currentSignatureData?.patronId || 0,
                SignatureDataUrl: canvasSignature || ''
            };
            const response = await signatureApiService.getTermsAndConditionsV2(request);
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

    // Handle scroll in Terms and Conditions dialog
    const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 5; // 5px threshold
        if (bottom) {
            setHasScrolledToBottomTerms(true);
        }
    };

    // Handle agree to terms
    const handleAgreeToTerms = () => {
        setHasAgreedToTerms(true);
        setTermsDialogOpen(false);
        setHasScrolledToBottomTerms(false); // Reset for next time
    };

    // Handle agree to notification on personal data protection
    // Load Notification
    const loadNotification = async () => {
        setIsLoadingNotification(true);
        setNotificationDialogOpen(true);
        try {
            console.log('🔄 Fetching notification for language:', selectedLanguage);
            let request = {
                Lang: selectedLanguage,
                PatronId: currentSignatureData?.patronId || 0,
                SignatureDataUrl: canvasSignature || ''
            };
            const response = await signatureApiService.getNotification(request);
            console.log('✅ Notification response:', response);

            if (response && typeof response === 'object') {
                const notificationData = (response as any).data || (response as any).htmlContent || (response as any).content;
                if (notificationData) {
                    setNotificationContent(notificationData);
                } else {
                    console.warn('⚠️ No notification content in response:', response);
                    setNotificationContent('<p>Notification not available</p>');
                }
            } else {
                console.warn('⚠️ Invalid notification response format:', response);
                setNotificationContent('<p>Notification not available</p>');
            }
        } catch (error) {
            console.error('❌ Failed to fetch notification:', error);
            setNotificationContent('<p>Failed to load notification</p>');
        } finally {
            setIsLoadingNotification(false);
        }
    };

    // Handle agree to notification on personal data protection
    const handleAgreeToNotification = () => {
        setHasAgreedToNotification(true);
        setNotificationDialogOpen(false);
    };

    // Handle load personal Notification
    const loadPersonalNotification = async () => {
        setIsLoadingPersonalNotification(true);
        setPersonalNotificationDialogOpen(true);
        try {
            console.log('🔄 Fetching personal notification for language:', selectedLanguage);
            let request = {
                Lang: selectedLanguage,
                PatronId: currentSignatureData?.patronId || 0,
                SignatureDataUrl: canvasSignature || ''
            };
            const response = await signatureApiService.getPersonalNotification(request);
            console.log('✅ Personal notification response:', response);

            if (response && typeof response === 'object') {
                const personalNotificationData = (response as any).data || (response as any).htmlContent || (response as any).content;
                if (personalNotificationData) {
                    setPersonalNotificationContent(personalNotificationData);
                } else {
                    console.warn('⚠️ No personal notification content in response:', response);
                    setPersonalNotificationContent('<p>Personal notification not available</p>');
                }
            } else {
                console.warn('⚠️ Invalid personal notification response format:', response);
                setPersonalNotificationContent('<p>Personal notification not available</p>');
            }
        } catch (error) {
            console.error('❌ Failed to fetch personal notification:', error);
            setPersonalNotificationContent('<p>Failed to load personal notification</p>');
        } finally {
            setIsLoadingPersonalNotification(false);
        }
    };

    // Handle agree to notification on personal data protection
    const handleAgreeToPersonalNotification = () => {
        setHasAgreedToPersonalNotification(true);
        setPersonalNotificationDialogOpen(false);
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

        // Check if first form is signed
        const hasSignedFirstForm = currentPatronNationality === VIETNAM_COUNTRY_ID
            ? hasAgreedToPersonalNotification
            : hasAgreedToNotification;

        if (!hasSignedFirstForm) {
            setSignatureError(t("PleaseSignFirstFormBeforeTerms"));
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
                setHasScrolledToBottomTerms(false);
            } else {
                const errorMsg = response?.message || 'Failed to submit signature';
                setSignatureError(errorMsg);
                handleSignatureError(errorMsg);
                setHasScrolledToBottomTerms(false);
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
            setHasScrolledToBottomTerms(false);
        }
    };

    const handleCloseSignatureDialog = () => {
        setHasScrolledToBottomTerms(false);
        setHasAgreedToNotification(false);
        setHasAgreedToPersonalNotification(false);
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
            {/* Network Status Alert */}
            <NetworkAlert
                isOnline={networkStatus.isOnline}
                isConnected={networkStatus.isConnected}
                connectionType={networkStatus.connectionType}
            />

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
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                pb: 1,
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
                                        p: 2,
                                        bgcolor: '#f8f9fa',
                                        borderRadius: 2,
                                        border: '1px solid #e0e0e0'
                                    }}>
                                        <Typography variant="subtitle1" sx={{
                                            fontWeight: 700,
                                            color: '#274549',
                                            mb: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            fontSize: '1rem'
                                        }}>
                                            💼 {t("StaffDevice") || "Staff Device"}
                                        </Typography>

                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                            gap: 2,
                                            mb: 2
                                        }}>
                                            {/* Device Name */}
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    fontWeight: 600,
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontSize: '0.7rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    🖥️ {t("DeviceName") || "Device Name"}
                                                </Typography>
                                                <Typography variant="body2" sx={{
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {deviceMapping.staffDevice?.deviceName || 'N/A'}
                                                </Typography>
                                            </Box>

                                            {/* Status */}
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    fontWeight: 600,
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontSize: '0.7rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    📡 {t("Status") || "Status"}
                                                </Typography>
                                                <Chip
                                                    label={deviceMapping.staffDevice?.isOnline ? t("Online") || "Online" : t("Offline") || "Offline"}
                                                    color={deviceMapping.staffDevice?.isOnline ? 'success' : 'error'}
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        px: 1,
                                                        '& .MuiChip-label': {
                                                            px: 0.5
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        </Box>

                                        {/* System Status - Integrated */}
                                        <Box sx={{
                                            pt: 2,
                                            borderTop: '1px solid #e0e0e0'
                                        }}>
                                            <Typography variant="caption" color="text.secondary" sx={{
                                                fontWeight: 600,
                                                display: 'block',
                                                mb: 1,
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                ⚙️ {t("SystemStatus") || "System Status"}
                                            </Typography>

                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                flexWrap="wrap"
                                                sx={{ gap: 1 }}
                                            >
                                                <Chip
                                                    size="small"
                                                    icon={registrationResult?.success ? <CheckCircle /> : <Error />}
                                                    label={registrationResult?.success ? t("DeviceRegistered") : t("NotRegistered")}
                                                    color={registrationResult?.success ? 'success' : 'default'}
                                                    variant={registrationResult?.success ? 'filled' : 'outlined'}
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '0.7rem',
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
                                                        height: 24,
                                                        fontSize: '0.7rem',
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
                                                        height: 24,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </Stack>

                                            {/* Device Error Alert */}
                                            {deviceError && (
                                                <Alert
                                                    severity="error"
                                                    sx={{
                                                        mt: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 1,
                                                        fontSize: '0.75rem'
                                                    }}
                                                    action={
                                                        <Button color="inherit" size="small" onClick={retry} sx={{ fontSize: '0.7rem' }}>
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
                            height: isMobile ? '90vh' : '90vh',
                            maxHeight: isMobile ? '90vh' : '90vh',
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

                                    {/* Checkboxes Section - Placed after HTML Content */}
                                    <Box sx={{
                                        mt: 3,
                                        p: 3,
                                        border: '2px solid #274549',
                                        borderRadius: 2,
                                        bgcolor: '#f9f9f9',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2
                                    }}>
                                        <Typography variant="h6" sx={{ color: '#274549', fontWeight: 600, mb: 1 }}>
                                            {t("RequiredAgreements")}
                                        </Typography>

                                        {/* 1. Personal Notification Checkbox - For Vietnamese */}
                                        {currentPatronNationality === VIETNAM_COUNTRY_ID && (
                                            <Box sx={{
                                                p: 2,
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 1,
                                                bgcolor: hasAgreedToPersonalNotification ? '#e8f5e9' : 'white'
                                            }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={hasAgreedToPersonalNotification}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    loadPersonalNotification();
                                                                } else {
                                                                    setHasAgreedToPersonalNotification(false);
                                                                    setNotificationDialogOpen(false);
                                                                    setCanvasSignature(null);
                                                                    setHasScrolledToBottomTerms(false);
                                                                }
                                                            }}
                                                            sx={{
                                                                color: '#274549',
                                                                '&.Mui-checked': {
                                                                    color: '#4caf50'
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {t("IAgreeToThePersonalNotification")}
                                                            </Typography>
                                                            <Button
                                                                onClick={() => loadPersonalNotification()}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    p: 0,
                                                                    minWidth: 'auto',
                                                                    color: '#274549',
                                                                    textDecoration: 'underline',
                                                                    fontSize: '0.9rem',
                                                                    '&:hover': {
                                                                        bgcolor: 'transparent',
                                                                        textDecoration: 'underline'
                                                                    }
                                                                }}
                                                            >
                                                                ({t("ViewDocument")})
                                                            </Button>
                                                        </Box>
                                                    }
                                                />
                                            </Box>
                                        )}

                                        {/* 2. Notification Checkbox - For Non-Vietnamese */}
                                        {currentPatronNationality !== VIETNAM_COUNTRY_ID && (
                                            <Box sx={{
                                                p: 2,
                                                border: '1px solid #e0e0e0',
                                                borderRadius: 1,
                                                bgcolor: hasAgreedToNotification ? '#e8f5e9' : 'white'
                                            }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={hasAgreedToNotification}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    loadNotification();
                                                                } else {
                                                                    setHasAgreedToNotification(false);
                                                                    setNotificationDialogOpen(false);
                                                                    setCanvasSignature(null);
                                                                    setHasScrolledToBottomTerms(false);
                                                                }
                                                            }}
                                                            sx={{
                                                                color: '#274549',
                                                                '&.Mui-checked': {
                                                                    color: '#4caf50'
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {t("IAgreeToTheNotificationOnPersonalDataProtection")}
                                                            </Typography>
                                                            <Button
                                                                onClick={() => loadNotification()}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    p: 0,
                                                                    minWidth: 'auto',
                                                                    color: '#274549',
                                                                    textDecoration: 'underline',
                                                                    fontSize: '0.9rem',
                                                                    '&:hover': {
                                                                        bgcolor: 'transparent',
                                                                        textDecoration: 'underline'
                                                                    }
                                                                }}
                                                            >
                                                                ({t("ViewDocument")})
                                                            </Button>
                                                        </Box>
                                                    }
                                                />
                                            </Box>
                                        )}

                                        {/* 3. Terms and Conditions Checkbox */}
                                        <Box sx={{
                                            p: 2,
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 1,
                                            bgcolor: hasAgreedToTerms ? '#e8f5e9' : 'white',
                                            opacity: (currentPatronNationality === VIETNAM_COUNTRY_ID && !hasAgreedToPersonalNotification) ||
                                                (currentPatronNationality !== VIETNAM_COUNTRY_ID && !hasAgreedToNotification) ? 0.5 : 1
                                        }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={hasAgreedToTerms}
                                                        onChange={(e) => {
                                                            // Check if first form is signed
                                                            const hasSignedFirstForm = currentPatronNationality === VIETNAM_COUNTRY_ID
                                                                ? hasAgreedToPersonalNotification
                                                                : hasAgreedToNotification;

                                                            if (!hasSignedFirstForm) {
                                                                setSignatureError(t("PleaseSignFirstFormBeforeTerms"));
                                                                return;
                                                            }

                                                            if (e.target.checked) {
                                                                loadTermsAndConditions();
                                                            } else {
                                                                setHasAgreedToTerms(false);
                                                            }
                                                        }}
                                                        disabled={(currentPatronNationality === VIETNAM_COUNTRY_ID && !hasAgreedToPersonalNotification) ||
                                                            (currentPatronNationality !== VIETNAM_COUNTRY_ID && !hasAgreedToNotification)}
                                                        sx={{
                                                            color: '#274549',
                                                            '&.Mui-checked': {
                                                                color: '#4caf50'
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {t("IAgreeToTheTermsAndConditions")}
                                                        </Typography>
                                                        <Button
                                                            onClick={() => {
                                                                const hasSignedFirstForm = currentPatronNationality === VIETNAM_COUNTRY_ID
                                                                    ? hasAgreedToPersonalNotification
                                                                    : hasAgreedToNotification;

                                                                if (!hasSignedFirstForm) {
                                                                    setSignatureError(t("PleaseSignFirstFormBeforeTerms"));
                                                                    return;
                                                                }
                                                                loadTermsAndConditions();
                                                            }}
                                                            disabled={(currentPatronNationality === VIETNAM_COUNTRY_ID && !hasAgreedToPersonalNotification) ||
                                                                (currentPatronNationality !== VIETNAM_COUNTRY_ID && !hasAgreedToNotification)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                p: 0,
                                                                minWidth: 'auto',
                                                                color: '#274549',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                '&:hover': {
                                                                    bgcolor: 'transparent',
                                                                    textDecoration: 'underline'
                                                                }
                                                            }}
                                                        >
                                                            ({t("ViewDocument")})
                                                        </Button>
                                                        {((currentPatronNationality === VIETNAM_COUNTRY_ID && !hasAgreedToPersonalNotification) ||
                                                            (currentPatronNationality !== VIETNAM_COUNTRY_ID && !hasAgreedToNotification)) && (
                                                                <Typography variant="caption" sx={{ display: 'block', color: 'error.main', mt: 0.5 }}>
                                                                    {t("PleaseSignFirstFormBeforeTerms")}
                                                                </Typography>
                                                            )}
                                                    </Box>
                                                }
                                            />
                                        </Box>
                                    </Box>

                                    {/* Error Display */}
                                    {signatureError && (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            {signatureError}
                                        </Alert>
                                    )}

                                    {/* Submit Button */}
                                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, paddingBottom: 3 }}>
                                        <Button
                                            onClick={() => {
                                                handleCloseSignatureDialog();
                                            }}
                                            disabled={isSubmittingSignature}
                                            variant="outlined"
                                            size="large"
                                            sx={{
                                                border: '1px solid #274549',
                                                color: '#274549',
                                                minWidth: 140,
                                                '&:hover': {
                                                    border: '1px solid #1a3033',
                                                    bgcolor: 'rgba(39, 69, 73, 0.05)'
                                                }
                                            }}
                                        >
                                            {t("Cancel")}
                                        </Button>
                                        <Button
                                            onClick={handleSubmitCanvasSignature}
                                            disabled={
                                                isSubmittingSignature ||
                                                !hasAgreedToTerms ||
                                                isExpired ||
                                                (currentPatronNationality === VIETNAM_COUNTRY_ID && !hasAgreedToPersonalNotification) ||
                                                (currentPatronNationality !== VIETNAM_COUNTRY_ID && !hasAgreedToNotification)
                                            }
                                            variant="contained"
                                            size="large"
                                            startIcon={<Send />}
                                            sx={{
                                                backgroundColor: '#274549',
                                                minWidth: 140,
                                                '&:hover': {
                                                    backgroundColor: '#1a3033'
                                                }
                                            }}
                                        >
                                            {isSubmittingSignature ? t("Submitting") : t("SubmitSignature")}
                                        </Button>
                                    </Box>
                                </Box>
                            </>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Terms and Conditions Dialog */}
                <Dialog
                    open={termsDialogOpen}
                    onClose={() => {
                        setTermsDialogOpen(false);
                        setHasScrolledToBottomTerms(false);
                    }}
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
                            onClick={() => {
                                setTermsDialogOpen(false);
                                setHasScrolledToBottomTerms(false);
                            }}
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

                    <DialogContent
                        onScroll={handleTermsScroll}
                        sx={{
                            pt: 2,
                            pb: 2,
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
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
                        bgcolor: '#f9f9f9',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: 1
                    }}>
                        {!hasScrolledToBottomTerms && !isLoadingTerms && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'warning.main',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5
                                }}
                            >
                                {t("PleaseScrollToBottom") || "Please scroll to the bottom to continue"}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                onClick={() => {
                                    setTermsDialogOpen(false);
                                    setHasScrolledToBottomTerms(false);
                                }}
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
                                disabled={isLoadingTerms || !hasScrolledToBottomTerms}
                                startIcon={<CheckCircle />}
                                sx={{
                                    backgroundColor: '#274549',
                                    '&:hover': {
                                        backgroundColor: '#1a3033'
                                    },
                                    '&.Mui-disabled': {
                                        bgcolor: '#cccccc',
                                        color: '#666666'
                                    }
                                }}
                            >
                                {t("AgreeAndContinue")}
                            </Button>
                        </Box>
                    </DialogActions>
                </Dialog>

                {/* Notification Dialog */}
                <Dialog
                    open={notificationDialogOpen}
                    onClose={() => setNotificationDialogOpen(false)}
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
                            <Typography variant="h6">{t("NotificationOnPersonalDataProtection")}</Typography>
                        </Box>
                        <Button
                            onClick={() => {
                                setNotificationDialogOpen(false);
                                // setCanvasSignature(null);
                                // setHasScrolledToBottomTerms(false);
                                // setHasAgreedToNotification(false);
                                // setHasAgreedToPersonalNotification(false);
                            }}
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
                        {isLoadingNotification ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                                    {t("LoadingDocument")}
                                </Typography>
                                <LinearProgress sx={{ width: '60%' }} />
                            </Box>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        wordSpacing: '0.15em',
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        mb: 3,
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
                                    dangerouslySetInnerHTML={{ __html: notificationContent }}
                                />

                                {/* Signature Canvas for Notification */}
                                <Box sx={{
                                    p: 2,
                                    border: '2px solid #274549',
                                    borderRadius: 2,
                                    bgcolor: '#f9f9f9'
                                }}>
                                    <Typography variant="h6" sx={{ mb: 2, color: '#274549', fontWeight: 600 }}>
                                        ✍️ {t("PleaseSignBelow")}
                                    </Typography>
                                    <SignatureCanvas
                                        width={isMobile ? 340 : 600}
                                        height={isMobile ? 120 : 180}
                                        onSignatureChange={handleCanvasSignatureChange}
                                        disabled={false}
                                    />
                                </Box>
                            </>
                        )}
                    </DialogContent>

                    <DialogActions sx={{
                        p: 2,
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#f9f9f9'
                    }}>
                        <Button
                            onClick={() => {
                                setNotificationDialogOpen(false);
                                setCanvasSignature(null);
                                setHasScrolledToBottomTerms(false);
                                setHasAgreedToNotification(false);
                                setHasAgreedToPersonalNotification(false);
                            }}
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
                            onClick={handleAgreeToNotification}
                            variant="contained"
                            disabled={isLoadingNotification || !canvasSignature}
                            startIcon={<CheckCircle />}
                            sx={{
                                backgroundColor: '#274549',
                                '&:hover': {
                                    backgroundColor: '#1a3033'
                                }
                            }}
                        >
                            {t("SignAndAgree")}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Personal Notification Dialog */}
                <Dialog
                    open={personalNotificationDialogOpen}
                    onClose={() => {
                        setPersonalNotificationDialogOpen(false);
                        // setCanvasSignature(null);
                        // setHasScrolledToBottomTerms(false);
                        // setHasAgreedToNotification(false);
                        // setHasAgreedToPersonalNotification(false);
                    }}
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
                            <Typography variant="h6">{t("PersonalNotification")}</Typography>
                        </Box>
                        <Button
                            onClick={() => {
                                setPersonalNotificationDialogOpen(false);
                                // setCanvasSignature(null);
                                // setHasScrolledToBottomTerms(false);
                                // setHasAgreedToNotification(false);
                                // setHasAgreedToPersonalNotification(false);
                            }}
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
                        {isLoadingPersonalNotification ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                                    {t("LoadingDocument")}
                                </Typography>
                                <LinearProgress sx={{ width: '60%' }} />
                            </Box>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        wordSpacing: '0.15em',
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        mb: 3,
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
                                    dangerouslySetInnerHTML={{ __html: personalNotificationContent }}
                                />

                                {/* Signature Canvas for Personal Notification */}
                                <Box sx={{
                                    p: 2,
                                    border: '2px solid #274549',
                                    borderRadius: 2,
                                    bgcolor: '#f9f9f9'
                                }}>
                                    <Typography variant="h6" sx={{ mb: 2, color: '#274549', fontWeight: 600 }}>
                                        ✍️ {t("PleaseSignBelow")}
                                    </Typography>
                                    <SignatureCanvas
                                        width={isMobile ? 340 : 600}
                                        height={isMobile ? 120 : 180}
                                        onSignatureChange={handleCanvasSignatureChange}
                                        disabled={false}
                                    />
                                </Box>
                            </>
                        )}
                    </DialogContent>

                    <DialogActions sx={{
                        p: 2,
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#f9f9f9'
                    }}>
                        <Button
                            onClick={() => {
                                setPersonalNotificationDialogOpen(false);
                                setCanvasSignature(null);
                                setHasScrolledToBottomTerms(false);
                                setHasAgreedToNotification(false);
                                setHasAgreedToPersonalNotification(false);
                            }}
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
                            onClick={handleAgreeToPersonalNotification}
                            variant="contained"
                            disabled={isLoadingPersonalNotification || !canvasSignature}
                            startIcon={<CheckCircle />}
                            sx={{
                                backgroundColor: '#274549',
                                '&:hover': {
                                    backgroundColor: '#1a3033'
                                }
                            }}
                        >
                            {t("SignAndAgree")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout >
    );
}