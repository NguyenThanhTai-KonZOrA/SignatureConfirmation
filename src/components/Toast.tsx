import React from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import type { AlertColor, SlideProps } from '@mui/material';

interface ToastProps {
    open: boolean;
    message: string;
    severity?: AlertColor;
    duration?: number;
    onClose: () => void;
    position?: {
        vertical: 'top' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
}

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="up" />;
}

export const Toast: React.FC<ToastProps> = ({
    open,
    message,
    severity = 'info',
    duration = 4000,
    onClose,
    position = { vertical: 'bottom', horizontal: 'right' }
}) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={duration}
            onClose={onClose}
            anchorOrigin={position}
            TransitionComponent={SlideTransition}
            sx={{
                '& .MuiSnackbarContent-root': {
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }
            }}
        >
            <Alert
                onClose={onClose}
                severity={severity}
                variant="filled"
                sx={{
                    width: '100%',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& .MuiAlert-icon': {
                        fontSize: '1.2rem',
                    },
                    '& .MuiAlert-message': {
                        padding: '4px 0',
                        alignItems: 'center',
                        display: 'flex',
                    }
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

// Hook để sử dụng toast dễ dàng hơn
export const useToast = () => {
    const [toastState, setToastState] = React.useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const showToast = React.useCallback((
        message: string, 
        severity: AlertColor = 'info'
    ) => {
        setToastState({
            open: true,
            message,
            severity
        });
    }, []);

    const hideToast = React.useCallback(() => {
        setToastState(prev => ({ ...prev, open: false }));
    }, []);

    return {
        ...toastState,
        showToast,
        hideToast
    };
};
