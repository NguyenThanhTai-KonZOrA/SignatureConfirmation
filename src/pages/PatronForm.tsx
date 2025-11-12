import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Alert,
    AlertTitle,
    Typography,
    Chip,
    CircularProgress,
    Stack,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Container,
    Paper,
    Divider,
    Slide,
    Grow
} from '@mui/material';
import {
    CheckCircle,
    Error,
    Wifi,
    WifiOff,
    PersonSearch,
    AttachMoney,
    Info as InfoIcon,
    Settings
} from '@mui/icons-material';
import { useSignalR } from '../hooks/useSignalR';
import { Toast, useToast } from '../components/Toast';
import { LoadingOverlay } from '../components/LoadingComponents';
import type { PatronUpdateMessage, ValidationResult } from '../services/signalRService';
import MainLayout from '../layout/MainLayout';

interface PatronFormProps {
    patronId?: number;
}

export const PatronForm: React.FC<PatronFormProps> = ({ patronId }) => {
    const navigate = useNavigate();
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [incomeValidated, setIncomeValidated] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Use toast hook for notifications
    const { open, message, severity, showToast, hideToast } = useToast();

    // Handle patron updates
    const handlePatronUpdate = useCallback((message: PatronUpdateMessage) => {
        console.log('Patron updated:', message);
        setStatusMessage(message.message);

        // Show toast notification
        showToast(
            message.message,
            message.status === 'success' ? 'success' : 'info'
        );
    }, [showToast]);

    // Handle validation results
    const handleValidationResult = useCallback((result: ValidationResult) => {
        console.log('Validation result:', result);

        if (result.isValid) {
            setValidationErrors([]);
            setStatusMessage('✅ Validation passed!');
            showToast('Validation passed successfully!', 'success');
        } else {
            setValidationErrors(result.errors || []);
            setStatusMessage('❌ Validation failed');
            showToast('Validation failed. Please check the errors below.', 'error');
        }
    }, [showToast]);

    // Handle income validation
    const handleIncomeValidation = useCallback((
        patronId: number,
        isValid: boolean,
        message: string
    ) => {
        console.log('Income validation:', { patronId, isValid, message });
        setIncomeValidated(isValid);

        showToast(
            message,
            isValid ? 'success' : 'error'
        );
    }, [showToast]);

    // Setup SignalR with handlers
    const {
        isConnected,
        isConnecting,
        error,
        connectionInfo,
        validatePatron,
        validateIncome,
        getPatronStatus,
        connect,
        updateConnectionInfo
    } = useSignalR({
        autoConnect: true,
        onPatronUpdate: handlePatronUpdate,
        onValidationResult: handleValidationResult,
        onIncomeValidation: handleIncomeValidation
    });

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        const patronData = {
            firstName: (document.getElementById('FirstName') as HTMLInputElement)?.value,
            lastName: (document.getElementById('LastName') as HTMLInputElement)?.value,
            phone: (document.getElementById('Phone') as HTMLInputElement)?.value,
            // ... other fields
        };

        try {
            await validatePatron(patronData);
            showToast('Patron validation request sent successfully!', 'info');
        } catch (err) {
            console.error('Validation failed:', err);
            showToast('Failed to send validation request. Please try again.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle income validation
    const handleValidateIncome = async () => {
        if (!patronId) return;
        setIsProcessing(true);

        const incomeData = {
            documentType: 'A',
            documentNumber: (document.getElementById('IncomeDocument') as HTMLInputElement)?.value,
            expiryDate: (document.getElementById('IncomeExpiryDate') as HTMLInputElement)?.value
        };

        try {
            await validateIncome(patronId, incomeData);
            showToast('Income validation request sent successfully!', 'info');
        } catch (err) {
            console.error('Income validation failed:', err);
            showToast('Failed to send income validation request. Please try again.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <MainLayout>
            <Box
                sx={{
                    background: '#ffffff',
                    minHeight: '100vh',
                    py: { xs: 2, sm: 4 },
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 50%, rgba(33, 150, 243, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(156, 39, 176, 0.03) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }
                }}
            >
                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack spacing={3}>
                        {/* Header */}

                        {/* Connection Status Card */}
                        <Slide direction="up" in timeout={1000}>
                            <Card
                                elevation={3}
                                sx={{
                                    borderRadius: 3,
                                    background: 'rgba(255, 255, 255, 1)',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                background: isConnected
                                                    ? 'linear-gradient(135deg, #4caf50, #8bc34a)'
                                                    : 'linear-gradient(135deg, #f44336, #e57373)',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                ...(isConnected && {
                                                    animation: 'pulse 2s infinite',
                                                    '@keyframes pulse': {
                                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                                        '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                                                        '100%': { transform: 'scale(1)', opacity: 1 }
                                                    }
                                                })
                                            }}
                                        >
                                            {isConnected ? <Wifi /> : <WifiOff />}
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            Connection Status
                                        </Typography>
                                    </Box>

                                    {isConnecting && (
                                        <Alert
                                            severity="info"
                                            sx={{
                                                borderRadius: 2,
                                                '& .MuiAlert-icon': {
                                                    animation: 'rotate 1s linear infinite',
                                                    '@keyframes rotate': {
                                                        '0%': { transform: 'rotate(0deg)' },
                                                        '100%': { transform: 'rotate(360deg)' }
                                                    }
                                                }
                                            }}
                                            icon={<CircularProgress size={20} />}
                                        >
                                            <Typography fontWeight={500}>Connecting to server...</Typography>
                                        </Alert>
                                    )}

                                    {isConnected && (
                                        <Alert
                                            severity="success"
                                            sx={{
                                                borderRadius: 2,
                                                background: 'rgba(76, 175, 80, 0.08)',
                                                border: '1px solid rgba(76, 175, 80, 0.2)'
                                            }}
                                            icon={<Wifi />}
                                        >
                                            <Typography fontWeight={500}>Connected to server successfully</Typography>
                                        </Alert>
                                    )}

                                    {error && (
                                        <Alert
                                            severity="error"
                                            sx={{
                                                borderRadius: 2,
                                                background: 'rgba(244, 67, 54, 0.08)',
                                                border: '1px solid rgba(244, 67, 54, 0.2)'
                                            }}
                                            icon={<WifiOff />}
                                        >
                                            <AlertTitle sx={{ fontWeight: 600 }}>Connection Error</AlertTitle>
                                            <Typography>{error.message}</Typography>

                                            {connectionInfo && (
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        mt: 2,
                                                        p: 2,
                                                        bgcolor: 'rgba(0,0,0,0.02)',
                                                        borderRadius: 2,
                                                        border: '1px solid rgba(0,0,0,0.08)'
                                                    }}
                                                >
                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                                                        Debug Information:
                                                    </Typography>
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                            • API Base: {connectionInfo.apiBase || 'Not configured'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                            • State: {connectionInfo.state}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                            • Hub URL: {connectionInfo.hubUrl || 'Not available'}
                                                        </Typography>
                                                        {connectionInfo.reconnectAttempts > 0 && (
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                                • Reconnect attempts: {connectionInfo.reconnectAttempts}/{connectionInfo.maxReconnectAttempts}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </Paper>
                                            )}

                                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => {
                                                        updateConnectionInfo();
                                                        connect();
                                                    }}
                                                    disabled={isConnecting}
                                                    sx={{
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        background: '#2196f3',
                                                        '&:hover': {
                                                            background: '#1976d2',
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                                                        }
                                                    }}
                                                >
                                                    {isConnecting ? 'Connecting...' : 'Retry Connection'}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={updateConnectionInfo}
                                                    sx={{
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        '&:hover': {
                                                            transform: 'translateY(-1px)'
                                                        }
                                                    }}
                                                >
                                                    Refresh Debug Info
                                                </Button>
                                            </Stack>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Slide>

                        {/* Status Message Card */}
                        {statusMessage && (
                            <Grow in timeout={600}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 3,
                                        background: 'rgba(255, 255, 255, 1)',
                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                        boxShadow: '0 2px 15px rgba(0, 0, 0, 0.06)',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 6px 25px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                                            Current Status
                                        </Typography>
                                        <Alert
                                            severity={statusMessage.includes('✅') ? 'success' : 'warning'}
                                            sx={{
                                                borderRadius: 2,
                                                fontWeight: 500,
                                                '& .MuiAlert-message': {
                                                    fontSize: '1rem'
                                                }
                                            }}
                                        >
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{statusMessage}</Typography>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Grow>
                        )}

                        {/* Validation Errors Card */}
                        {validationErrors.length > 0 && (
                            <Slide direction="left" in timeout={800}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 3,
                                        background: 'rgba(255, 255, 255, 1)',
                                        border: '1px solid rgba(244, 67, 54, 0.15)',
                                        boxShadow: '0 2px 15px rgba(244, 67, 54, 0.1)',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 6px 25px rgba(244, 67, 54, 0.15)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Alert
                                            severity="error"
                                            sx={{
                                                borderRadius: 2,
                                                background: 'rgba(244, 67, 54, 0.08)',
                                                border: '1px solid rgba(244, 67, 54, 0.2)'
                                            }}
                                        >
                                            <AlertTitle>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Validation Errors</Typography>
                                            </AlertTitle>
                                            <List dense sx={{ mt: 1 }}>
                                                {validationErrors.map((error, index) => (
                                                    <ListItem
                                                        key={index}
                                                        sx={{
                                                            py: 0.5,
                                                            animation: 'slideInLeft 0.3s ease-out',
                                                            animationDelay: `${index * 0.1}s`,
                                                            animationFillMode: 'both',
                                                            '@keyframes slideInLeft': {
                                                                from: {
                                                                    opacity: 0,
                                                                    transform: 'translateX(-20px)'
                                                                },
                                                                to: {
                                                                    opacity: 1,
                                                                    transform: 'translateX(0)'
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                                            <Error color="error" fontSize="small" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={error}
                                                            primaryTypographyProps={{
                                                                variant: 'body2',
                                                                fontWeight: 500,
                                                                color: 'error.main'
                                                            }}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Slide>
                        )}

                        {/* Income Validation Status */}
                        {incomeValidated && (
                            <Grow in timeout={1000}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 3,
                                        background: 'rgba(255, 255, 255, 1)',
                                        border: '1px solid rgba(76, 175, 80, 0.15)',
                                        boxShadow: '0 2px 15px rgba(76, 175, 80, 0.1)',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 6px 25px rgba(76, 175, 80, 0.15)'
                                        },
                                        animation: 'bounceIn 0.5s ease-out',
                                        '@keyframes bounceIn': {
                                            '0%': {
                                                opacity: 0,
                                                transform: 'scale(0.3)'
                                            },
                                            '50%': {
                                                opacity: 1,
                                                transform: 'scale(1.05)'
                                            },
                                            '70%': {
                                                transform: 'scale(0.9)'
                                            },
                                            '100%': {
                                                opacity: 1,
                                                transform: 'scale(1)'
                                            }
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Alert
                                            severity="success"
                                            sx={{
                                                borderRadius: 2,
                                                background: 'rgba(76, 175, 80, 0.08)',
                                                border: '1px solid rgba(76, 175, 80, 0.2)',
                                                fontSize: '1.1rem'
                                            }}
                                            icon={<CheckCircle sx={{ fontSize: 28 }} />}
                                        >
                                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                Income documents validated successfully! 🎉
                                            </Typography>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Grow>
                        )}

                        {/* Action Buttons Card */}
                        <Slide direction="up" in timeout={1200}>
                            <Card
                                elevation={4}
                                sx={{
                                    borderRadius: 4,
                                    background: 'rgba(255, 255, 255, 1)',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'text.primary',
                                                mb: 1
                                            }}
                                        >
                                            Available Actions
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                            Choose an action to perform on the patron data
                                        </Typography>
                                    </Box>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <PersonSearch />}
                                            onClick={handleSubmit}
                                            disabled={!isConnected || isProcessing}
                                            sx={{
                                                minWidth: 200,
                                                minHeight: 56,
                                                borderRadius: 3,
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                background: '#2196f3',
                                                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    background: '#1976d2',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)'
                                                },
                                                '&:disabled': {
                                                    background: '#e0e0e0'
                                                }
                                            }}
                                        >
                                            {isProcessing ? 'Validating...' : 'Validate Patron'}
                                        </Button>

                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <AttachMoney />}
                                            onClick={handleValidateIncome}
                                            disabled={!isConnected || !patronId || isProcessing}
                                            sx={{
                                                minWidth: 200,
                                                minHeight: 56,
                                                borderRadius: 3,
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                background: '#4caf50',
                                                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    background: '#388e3c',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)'
                                                },
                                                '&:disabled': {
                                                    background: '#e0e0e0'
                                                }
                                            }}
                                        >
                                            {isProcessing ? 'Validating...' : 'Validate Income'}
                                        </Button>

                                        {patronId && (
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                startIcon={<InfoIcon />}
                                                onClick={() => getPatronStatus(patronId)}
                                                disabled={!isConnected || isProcessing}
                                                sx={{
                                                    minWidth: 180,
                                                    minHeight: 56,
                                                    borderRadius: 3,
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    fontSize: '1.1rem',
                                                    borderWidth: 2,
                                                    borderColor: '#9c27b0',
                                                    color: '#9c27b0',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        borderWidth: 2,
                                                        borderColor: '#7b1fa2',
                                                        background: 'rgba(156, 39, 176, 0.08)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 4px 15px rgba(156, 39, 176, 0.25)'
                                                    }
                                                }}
                                            >
                                                Get Status
                                            </Button>
                                        )}

                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="large"
                                            startIcon={<Settings />}
                                            onClick={() => navigate('/device-manager')}
                                            sx={{
                                                minWidth: 180,
                                                minHeight: 56,
                                                borderRadius: 3,
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                borderWidth: 2,
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    borderWidth: 2,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 15px rgba(156, 39, 176, 0.25)'
                                                }
                                            }}
                                        >
                                            Device Manager
                                        </Button>
                                    </Stack>

                                    <Divider sx={{ my: 4, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)' }} />

                                    {/* Status Chips */}
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                        <Chip
                                            icon={isConnected ? <Wifi /> : <WifiOff />}
                                            label={isConnected ? 'Online' : 'Offline'}
                                            color={isConnected ? 'success' : 'error'}
                                            variant="filled"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                height: 36,
                                                borderRadius: 3,
                                                boxShadow: isConnected ? '0 2px 8px rgba(76, 175, 80, 0.25)' : '0 2px 8px rgba(244, 67, 54, 0.25)',
                                                ...(isConnected && {
                                                    position: 'relative',
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: -2,
                                                        left: -2,
                                                        right: -2,
                                                        bottom: -2,
                                                        background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                                                        borderRadius: 3,
                                                        animation: 'pulse 2s infinite',
                                                        zIndex: -1,
                                                        '@keyframes pulse': {
                                                            '0%': { transform: 'scale(1)', opacity: 1 },
                                                            '50%': { transform: 'scale(1.05)', opacity: 0.7 },
                                                            '100%': { transform: 'scale(1)', opacity: 1 }
                                                        }
                                                    }
                                                })
                                            }}
                                        />
                                        {patronId && (
                                            <Chip
                                                label={`Patron ID: ${patronId}`}
                                                color="primary"
                                                variant="outlined"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    height: 36,
                                                    borderRadius: 3,
                                                    borderWidth: 2,
                                                    '&:hover': {
                                                        borderWidth: 2,
                                                        background: 'rgba(33, 150, 243, 0.1)'
                                                    }
                                                }}
                                            />
                                        )}
                                        {incomeValidated && (
                                            <Chip
                                                icon={<CheckCircle />}
                                                label="Income Validated"
                                                color="success"
                                                variant="filled"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    height: 36,
                                                    borderRadius: 3,
                                                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                                                    animation: 'bounceIn 0.5s ease-out',
                                                    '@keyframes bounceIn': {
                                                        '0%': {
                                                            opacity: 0,
                                                            transform: 'scale(0.3)'
                                                        },
                                                        '50%': {
                                                            opacity: 1,
                                                            transform: 'scale(1.05)'
                                                        },
                                                        '70%': {
                                                            transform: 'scale(0.9)'
                                                        },
                                                        '100%': {
                                                            opacity: 1,
                                                            transform: 'scale(1)'
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Slide>
                    </Stack>
                </Container>

                {/* Loading Overlay */}
                <LoadingOverlay
                    open={isProcessing}
                    message="Processing your request..."
                />

                {/* Toast Notification */}
                <Toast
                    open={open}
                    message={message}
                    severity={severity}
                    onClose={hideToast}
                    position={{ vertical: 'bottom', horizontal: 'right' }}
                />
            </Box>
        </MainLayout>

    );
};