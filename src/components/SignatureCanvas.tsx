import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, Typography, Stack, Alert, useTheme, useMediaQuery } from '@mui/material';
import { Clear, Edit } from '@mui/icons-material';

interface SignatureCanvasProps {
    width?: number;
    height?: number;
    onSignatureChange?: (signature: string | null) => void;
    disabled?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
    width,
    height,
    onSignatureChange,
    disabled = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

    // Calculate responsive canvas size
    useEffect(() => {
        const calculateSize = () => {
            let containerWidth = 700; // default width

            // Get actual container width if available
            if (containerRef.current) {
                containerWidth = containerRef.current.offsetWidth - 32; // Account for padding
            } else {
                const dialogPadding = 48;
                const availableWidth = window.innerWidth - dialogPadding;
                containerWidth = Math.min(availableWidth * 0.9, 700);
            }

            let newWidth = containerWidth;
            let newHeight = height || 200;

            // Responsive sizing based on screen size - use more of available width
            if (isMobile) {
                newWidth = containerWidth - 16; // Full width minus padding
                newHeight = 120; // Smaller height for mobile
            } else if (isTablet) {
                newWidth = containerWidth - 16; // Full width minus padding
                newHeight = 140; // Smaller height for tablet/iPad
            } else {
                newWidth = containerWidth - 16; // Full width minus padding
                newHeight = height || 180; // Smaller default height
            }

            setCanvasSize({ width: Math.max(newWidth, 300), height: newHeight });
        };

        // Initial calculation
        calculateSize();

        // Recalculate after a brief delay to ensure container is rendered
        const timer = setTimeout(calculateSize, 100);

        // Recalculate on window resize
        const handleResize = () => calculateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [width, height, isMobile, isTablet]);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        // Configure drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        setContext(ctx);
    }, [canvasSize.width, canvasSize.height]);

    // Get mouse/touch position with proper scaling
    const getPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        // Account for canvas scaling
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in event) {
            // Touch event
            const touch = event.touches[0] || event.changedTouches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
        } else {
            // Mouse event
            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
            };
        }
    }, []);

    // Start drawing
    const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (disabled || !context) return;

        // Only preventDefault for non-passive events
        if ('touches' in event) {
            // For touch events, rely on CSS touch-action: none instead
        } else {
            event.preventDefault();
        }

        const { x, y } = getPosition(event);

        setIsDrawing(true);
        context.beginPath();
        context.moveTo(x, y);
    }, [disabled, context, getPosition]);

    // Continue drawing
    const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled || !context) return;

        // Only preventDefault for non-passive events
        if ('touches' in event) {
            // For touch events, rely on CSS touch-action: none instead
        } else {
            event.preventDefault();
        }

        const { x, y } = getPosition(event);

        context.lineTo(x, y);
        context.stroke();

        if (isEmpty) {
            setIsEmpty(false);
        }
    }, [isDrawing, disabled, context, getPosition, isEmpty]);

    // Stop drawing
    const stopDrawing = useCallback(() => {
        if (!isDrawing) return;

        setIsDrawing(false);

        // Notify parent of signature change
        if (!isEmpty && onSignatureChange) {
            const canvas = canvasRef.current;
            if (canvas) {
                const dataURL = canvas.toDataURL('image/png');
                onSignatureChange(dataURL);
            }
        }
    }, [isDrawing, isEmpty, onSignatureChange]);

    // Clear signature
    const clearSignature = useCallback(() => {
        if (!context) return;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);

        setIsEmpty(true);

        if (onSignatureChange) {
            onSignatureChange(null);
        }
    }, [context, canvasSize.width, canvasSize.height, onSignatureChange]);

    return (
        <Box
            ref={containerRef}
            sx={{
                border: '1px solid #ddd',
                borderRadius: 1,
                p: { xs: 1, sm: 2 },
                bgcolor: 'background.paper',
                width: '100%'
            }}
        >
            {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                ✍️ Draw your signature anywhere in the box below
            </Typography> */}

            <Box sx={{
                border: '2px dashed #ccc',
                borderRadius: 1,
                cursor: disabled ? 'not-allowed' : 'crosshair',
                opacity: disabled ? 0.6 : 1,
                overflow: 'hidden',
                width: '100%',
                position: 'relative',
                bgcolor: '#fafafa',
                height: `${canvasSize.height}px`, // dynamic height matches actual canvas size
                transition: 'height 0.2s ease'
            }}>
                {/* Clear button inside canvas - top right corner */}
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Clear />}
                    onClick={clearSignature}
                    disabled={disabled || isEmpty}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        bgcolor: 'white',
                        minWidth: 'auto',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.75rem',
                        '&:hover': {
                            bgcolor: 'white'
                        }
                    }}
                >
                    Clear
                </Button>

                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        touchAction: 'none', // Prevent scrolling and enable preventDefault alternative
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        width: '100%',
                        height: '100%', // fill container height exactly
                        border: 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </Box>

            {/* {isEmpty && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Touch anywhere in the signature area above to start drawing
                </Typography>
            )} */}
        </Box>
    );
};