import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, Typography, Stack, Alert } from '@mui/material';
import { Clear, Edit } from '@mui/icons-material';

interface SignatureCanvasProps {
    width?: number;
    height?: number;
    onSignatureChange?: (signature: string | null) => void;
    disabled?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
    width = 500,
    height = 200,
    onSignatureChange,
    disabled = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Configure drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        setContext(ctx);
    }, [width, height]);

    // Get mouse/touch position
    const getPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        
        if ('touches' in event) {
            // Touch event
            const touch = event.touches[0] || event.changedTouches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        } else {
            // Mouse event
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
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
        context.fillRect(0, 0, width, height);
        
        setIsEmpty(true);
        
        if (onSignatureChange) {
            onSignatureChange(null);
        }
    }, [context, width, height, onSignatureChange]);

    return (
        <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Edit fontSize="small" />
                Digital Signature Canvas
            </Typography>
            
            <Box sx={{ 
                border: '2px dashed #ccc', 
                borderRadius: 1, 
                mb: 2,
                cursor: disabled ? 'not-allowed' : 'crosshair',
                opacity: disabled ? 0.6 : 1
            }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        touchAction: 'none', // Prevent scrolling and enable preventDefault alternative
                        userSelect: 'none', // Prevent text selection
                        WebkitUserSelect: 'none', // Safari support
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

            <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Clear />}
                    onClick={clearSignature}
                    disabled={disabled || isEmpty}
                    size="small"
                >
                    Clear
                </Button>
                {!isEmpty && (
                    <Alert severity="success" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="caption">
                            ✓ Signature captured
                        </Typography>
                    </Alert>
                )}
            </Stack>
            
            {isEmpty && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Please draw your signature above
                </Typography>
            )}
        </Box>
    );
};