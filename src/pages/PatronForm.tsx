import React, { useState, useCallback } from 'react';
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
    Divider
} from '@mui/material';
import {
    CheckCircle,
    Error,
    Wifi,
    WifiOff,
    PersonSearch,
    AttachMoney,
    Info as InfoIcon
} from '@mui/icons-material';
import { useSignalR } from '../hooks/useSignalR';
import { Toast, useToast } from '../components/Toast';
import { LoadingOverlay } from '../components/LoadingComponents';
import type { PatronUpdateMessage, ValidationResult } from '../services/signalRService';
import './PatronForm.css';

interface PatronFormProps {
    patronId?: number;
}

export const PatronForm: React.FC<PatronFormProps> = ({ patronId }) => {
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
        <div className="patron-form-container">
            <Container maxWidth="md">
                <Box sx={{ py: 4 }}>
                    {/* Header */}
                    <Paper
                        elevation={3}
                        sx={{
                            mb: 3,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                        }}
                    >
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                Patron Validation System
                            </Typography>
                            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                                Validate patron information and income documents
                            </Typography>
                        </Box>
                    </Paper>

                    {/* Connection Status Card */}
                    <Card className="status-card patron-form-card" sx={{ mb: 3, borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Wifi color={isConnected ? 'success' : 'disabled'} />
                                Connection Status
                            </Typography>
                            
                            {isConnecting && (
                                <Alert severity="info" sx={{ borderRadius: 2 }} icon={<CircularProgress size={20} />}>
                                    <Typography>Connecting to server...</Typography>
                                </Alert>
                            )}
                            
                            {isConnected && (
                                <Alert severity="success" sx={{ borderRadius: 2 }} icon={<Wifi />}>
                                    <Typography>Connected to server successfully</Typography>
                                </Alert>
                            )}
                            
                            {error && (
                                <Alert severity="error" sx={{ borderRadius: 2 }} icon={<WifiOff />}>
                                    <AlertTitle>Connection Error</AlertTitle>
                                    <Typography>{error.message}</Typography>
                                    
                                    {connectionInfo && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                                            <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                                                <strong>Debug Information:</strong>
                                            </Typography>
                                            <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                                                • API Base: {connectionInfo.apiBase || 'Not configured'}
                                            </Typography>
                                            <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                                                • State: {connectionInfo.state}
                                            </Typography>
                                            <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                                                • Hub URL: {connectionInfo.hubUrl || 'Not available'}
                                            </Typography>
                                            {connectionInfo.reconnectAttempts > 0 && (
                                                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                                                    • Reconnect attempts: {connectionInfo.reconnectAttempts}/{connectionInfo.maxReconnectAttempts}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => {
                                                updateConnectionInfo();
                                                connect();
                                            }}
                                            disabled={isConnecting}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            {isConnecting ? 'Connecting...' : 'Retry Connection'}
                                        </Button>
                                        <Button 
                                            size="small" 
                                            variant="text" 
                                            onClick={updateConnectionInfo}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Refresh Debug Info
                                        </Button>
                                    </Box>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Message Card */}
                    {statusMessage && (
                        <Card className="status-card patron-form-card" sx={{ mb: 3, borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Current Status
                                </Typography>
                                <Alert 
                                    severity={statusMessage.includes('✅') ? 'success' : 'warning'}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <Typography variant="body1">{statusMessage}</Typography>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Validation Errors Card */}
                    {validationErrors.length > 0 && (
                        <Card className="status-card patron-form-card" sx={{ mb: 3, borderRadius: 3 }}>
                            <CardContent>
                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                    <AlertTitle>
                                        <Typography variant="h6">Validation Errors</Typography>
                                    </AlertTitle>
                                    <List dense>
                                        {validationErrors.map((error, index) => (
                                            <ListItem key={index} className="validation-error-item" sx={{ py: 0 }}>
                                                <ListItemIcon>
                                                    <Error color="error" fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={error}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Income Validation Status */}
                    {incomeValidated && (
                        <Card className="status-card patron-form-card" sx={{ mb: 3, borderRadius: 3 }}>
                            <CardContent>
                                <Alert severity="success" sx={{ borderRadius: 2 }} icon={<CheckCircle />}>
                                    <Typography variant="body1">
                                        Income documents validated successfully! 🎉
                                    </Typography>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Buttons Card */}
                    <Card className="patron-form-card" sx={{ borderRadius: 3, boxShadow: 3 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                                Available Actions
                            </Typography>
                            
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={isProcessing ? <CircularProgress size={16} /> : <PersonSearch />}
                                    onClick={handleSubmit}
                                    disabled={!isConnected || isProcessing}
                                    className="action-button"
                                    sx={{ 
                                        minWidth: 180,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {isProcessing ? 'Validating...' : 'Validate Patron'}
                                </Button>

                                <Button
                                    variant="contained"
                                    color="success"
                                    size="large"
                                    startIcon={isProcessing ? <CircularProgress size={16} /> : <AttachMoney />}
                                    onClick={handleValidateIncome}
                                    disabled={!isConnected || !patronId || isProcessing}
                                    className="action-button"
                                    sx={{ 
                                        minWidth: 180,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {isProcessing ? 'Validating...' : 'Validate Income'}
                                </Button>

                                {patronId && (
                                    <Button
                                        variant="outlined"
                                        color="info"
                                        size="large"
                                        startIcon={<InfoIcon />}
                                        onClick={() => getPatronStatus(patronId)}
                                        disabled={!isConnected || isProcessing}
                                        className="action-button"
                                        sx={{ 
                                            minWidth: 160,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Get Status
                                    </Button>
                                )}
                            </Stack>

                            <Divider sx={{ my: 3 }} />

                            {/* Status Chips */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Chip
                                    icon={isConnected ? <Wifi /> : <WifiOff />}
                                    label={isConnected ? 'Online' : 'Offline'}
                                    color={isConnected ? 'success' : 'error'}
                                    variant="filled"
                                    className={isConnected ? 'connection-indicator' : ''}
                                    sx={{ fontWeight: 'bold' }}
                                />
                                {patronId && (
                                    <Chip
                                        label={`Patron ID: ${patronId}`}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                )}
                                {incomeValidated && (
                                    <Chip
                                        icon={<CheckCircle />}
                                        label="Income Validated"
                                        color="success"
                                        variant="filled"
                                        className="income-validated-chip"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
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
        </div>
    );
};