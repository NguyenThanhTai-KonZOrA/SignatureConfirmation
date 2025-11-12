import React, { useState, useCallback, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Chip,
    Stack,
    Divider
} from '@mui/material';
import {
    Edit,
    Send,
    Close,
    Person,
    Assignment,
    Schedule
} from '@mui/icons-material';
import { signatureApiService } from '../services/signatrueApiService';
import type { SignatureMessageData, SignatureConfirmRequest } from '../type';

interface SignatureRequestDialogProps {
    open: boolean;
    data: SignatureMessageData | null;
    deviceName: string;
    onClose: () => void;
    onSubmitted?: (requestId: string) => void;
    onError?: (error: string) => void;
}

export const SignatureRequestDialog: React.FC<SignatureRequestDialogProps> = ({
    open,
    data,
    deviceName,
    onClose,
    onSubmitted,
    onError
}) => {
    const [signature, setSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Calculate time left for signature request
    useEffect(() => {
        if (!data || !data.expiryMinutes) return;

        const requestTime = new Date(data.timestamp);
        const expiryTime = new Date(requestTime.getTime() + data.expiryMinutes * 60 * 1000);

        const updateTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setError('Signature request has expired');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [data]);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSignature('');
            setError(null);
            setIsSubmitting(false);
            setIsSubmitted(false);
        }
    }, [open]);

    // Auto-close dialog when successfully submitted
    useEffect(() => {
        if (isSubmitted && !isSubmitting) {
            console.log('🔒 Auto-closing dialog after successful submission');
            const timer = setTimeout(() => {
                onClose();
            }, 500); // Small delay to show success state
            return () => clearTimeout(timer);
        }
    }, [isSubmitted, isSubmitting, onClose]);

    const formatTimeLeft = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = useCallback(async () => {
        if (!data || !signature.trim()) {
            setError('Please enter your signature');
            return;
        }

        if (timeLeft !== null && timeLeft <= 0) {
            setError('Signature request has expired');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const request: SignatureConfirmRequest = {
                sessionId: data.sessionId,
                patronId: data.patronId,
                signature: signature.trim(),
                staffDeviceId: data.staffDeviceId
            };

            console.log('🔄 Submitting signature request:', request);
            
            const response = await signatureApiService.submitSignature(request);
            
            console.log('📥 Full API response:', response);
            console.log('📥 Response success:', response?.success);
            
            // Always check response exists first
            if (!response) {
                throw new Error('No response received from API');
            }

            // Check success field explicitly
            if (response.success === true) {
                console.log('✅ Signature submitted successfully:', response);
                
                // Mark as submitted
                setIsSubmitted(true);
                
                // Notify success callback first
                if (onSubmitted) {
                    try {
                        onSubmitted(data.sessionId);
                    } catch (callbackError) {
                        console.warn('⚠️ onSubmitted callback error:', callbackError);
                    }
                }
                
                // Force close dialog after short delay to ensure state updates
                setTimeout(() => {
                    console.log('🔒 Forcing dialog close');
                    onClose();
                }, 100);
                
            } else {
                const errorMsg = response.message || `API returned success=${response.success}`;
                console.log('❌ API returned non-success:', errorMsg, response);
                setError(errorMsg);
                if (onError) {
                    onError(errorMsg);
                }
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit signature';
            console.error('❌ Error submitting signature:', err);
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [data, signature, timeLeft, onSubmitted, onError, onClose]);

    const handleClose = useCallback(() => {
        console.log('🚪 Handle close called', { isSubmitting, isSubmitted });
        
        // Allow force close if submitted successfully or not submitting
        if (!isSubmitting || isSubmitted) {
            console.log('🚪 Closing dialog');
            onClose();
        } else {
            console.log('🚫 Prevented close - still submitting');
        }
    }, [isSubmitting, isSubmitted, onClose]);

    if (!data) return null;

    const isExpired = timeLeft !== null && timeLeft <= 0;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={isSubmitting}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Edit color="primary" />
                    <Typography variant="h6" component="span">
                        Signature Request
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
                <Stack spacing={3}>
                    {/* Patron Information */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" />
                            Patron Information
                        </Typography>
                        <Box sx={{ pl: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Name:</strong> {data.patronName}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>ID:</strong> {data.patronId}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Document Type:</strong> {data.documentType}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider />

                    {/* Message */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assignment fontSize="small" />
                            Message
                        </Typography>
                        <Alert severity="info" sx={{ mt: 1 }}>
                            {data.message}
                        </Alert>
                    </Box>

                    {/* Signature Input */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Your Signature *
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="Please enter your full name and signature here..."
                            disabled={isSubmitting || isExpired}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: 'cursive',
                                    fontSize: '1.1rem'
                                }
                            }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Please type your full name as your digital signature
                        </Typography>
                    </Box>

                    {/* Error Message */}
                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {/* Success Message */}
                    {isSubmitted && (
                        <Alert severity="success">
                            ✅ Signature submitted successfully! Dialog will close automatically...
                        </Alert>
                    )}

                    {/* Request Info */}
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            <strong>Request ID:</strong> {data.requestId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            <strong>Requested:</strong> {new Date(data.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            <strong>Device:</strong> {deviceName}
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={isSubmitting || isSubmitted}
                    startIcon={<Close />}
                    color="inherit"
                >
                    {isSubmitted ? 'Closing...' : 'Cancel'}
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSubmitted || !signature.trim() || isExpired}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <Send />}
                    variant="contained"
                    color={isSubmitted ? "success" : "primary"}
                    sx={{ minWidth: 120 }}
                >
                    {isSubmitted ? 'Submitted!' : isSubmitting ? 'Submitting...' : 'Submit Signature'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
