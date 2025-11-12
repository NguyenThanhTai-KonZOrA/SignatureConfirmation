import React from 'react';
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Typography,
    Backdrop,
    Fade,
    Button
} from '@mui/material';

interface LoadingOverlayProps {
    open: boolean;
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    open,
    message = 'Processing...'
}) => {
    return (
        <Backdrop
            open={open}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(2px)'
            }}
        >
            <Fade in={open}>
                <Card
                    sx={{
                        minWidth: 200,
                        textAlign: 'center',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <CardContent sx={{ py: 4 }}>
                        <CircularProgress
                            size={40}
                            thickness={4}
                            sx={{ mb: 2 }}
                        />
                        <Typography variant="body1" color="text.secondary">
                            {message}
                        </Typography>
                    </CardContent>
                </Card>
            </Fade>
        </Backdrop>
    );
};

// Loading button component
interface LoadingButtonProps {
    loading: boolean;
    children: React.ReactNode;
    loadingText?: string;
    [key: string]: any; // Allow other props to be passed through
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    loading,
    children,
    loadingText,
    disabled,
    ...props
}) => {
    return (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Button
                {...props}
                disabled={disabled || loading}
                sx={{
                    ...props.sx,
                    ...(loading && {
                        color: 'transparent'
                    })
                }}
            >
                {loading ? loadingText || children : children}
            </Button>
            {loading && (
                <CircularProgress
                    size={24}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                    }}
                />
            )}
        </Box>
    );
};
