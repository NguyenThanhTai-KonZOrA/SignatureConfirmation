import { useState, useCallback, useEffect } from 'react';
import signalRService from '../services/signalRService';
import type { SignatureMessageData } from '../type';

export interface SignatureRequestState {
    currentRequest: SignatureMessageData | null;
    isDialogOpen: boolean;
    requestHistory: SignatureMessageData[];
    totalRequests: number;
}

export interface UseSignatureRequestOptions {
    onSignatureRequest?: (data: SignatureMessageData) => void;
    onSignatureSubmitted?: (requestId: string) => void;
    onSignatureError?: (error: string, requestId?: string) => void;
    autoShowDialog?: boolean;
}

/**
 * Hook to handle signature requests from SignalR
 * Manages signature request state and provides handlers for UI
 */
export const useSignatureRequest = (options: UseSignatureRequestOptions = {}) => {
    const {
        onSignatureRequest,
        onSignatureSubmitted,
        onSignatureError,
        autoShowDialog = true
    } = options;

    const [state, setState] = useState<SignatureRequestState>({
        currentRequest: null,
        isDialogOpen: false,
        requestHistory: [],
        totalRequests: 0
    });

    // Handle incoming signature requests from SignalR
    const handleSignatureRequest = useCallback((data: SignatureMessageData) => {
        console.log('📝 Received signature request:', data);
        
        setState(prev => ({
            ...prev,
            currentRequest: data,
            isDialogOpen: autoShowDialog,
            requestHistory: [data, ...prev.requestHistory].slice(0, 10), // Keep last 10 requests
            totalRequests: prev.totalRequests + 1
        }));

        // Call custom handler if provided
        onSignatureRequest?.(data);
        debugger
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Signature Request', {
                body: `Signature requested for ${data.patronData?.firstName} ${data.patronData?.lastName}`,
                icon: '/images/TheGrandHoTram.png'
            });
        }

    }, [autoShowDialog, onSignatureRequest]);

    // Open signature dialog manually
    const openSignatureDialog = useCallback((data?: SignatureMessageData) => {
        if (data) {
            setState(prev => ({
                ...prev,
                currentRequest: data,
                isDialogOpen: true
            }));
        } else if (state.currentRequest) {
            setState(prev => ({
                ...prev,
                isDialogOpen: true
            }));
        }
    }, [state.currentRequest]);

    // Close signature dialog
    const closeSignatureDialog = useCallback(() => {
        setState(prev => ({
            ...prev,
            isDialogOpen: false
        }));
    }, []);

    // Clear current request
    const clearCurrentRequest = useCallback(() => {
        setState(prev => ({
            ...prev,
            currentRequest: null,
            isDialogOpen: false
        }));
    }, []);

    // Handle signature submitted successfully
    const handleSignatureSubmitted = useCallback((requestId: string) => {
        console.log('✅ Signature submitted for request:', requestId);
        
        // Update request history to mark as completed
        setState(prev => ({
            ...prev,
            requestHistory: prev.requestHistory.map(req => 
                req.requestId === requestId 
                    ? { ...req, completed: true } as SignatureMessageData & { completed: boolean }
                    : req
            ),
            currentRequest: null,
            isDialogOpen: false
        }));

        onSignatureSubmitted?.(requestId);

        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Signature Submitted', {
                body: 'Your signature has been submitted successfully',
                icon: '/images/TheGrandHoTram.png'
            });
        }

    }, [onSignatureSubmitted]);

    // Handle signature submission error
    const handleSignatureError = useCallback((error: string, requestId?: string) => {
        console.error('❌ Signature submission error:', error, requestId);
        onSignatureError?.(error, requestId);

        // Show error notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Signature Error', {
                body: error,
                icon: '/images/TheGrandHoTram.png'
            });
        }
    }, [onSignatureError]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('📱 Notification permission:', permission);
            return permission;
        }
        return Notification.permission;
    }, []);

    // Get request by ID
    const getRequestById = useCallback((requestId: string): SignatureMessageData | undefined => {
        return state.requestHistory.find(req => req.requestId === requestId);
    }, [state.requestHistory]);

    // Clear request history
    const clearHistory = useCallback(() => {
        setState(prev => ({
            ...prev,
            requestHistory: []
        }));
    }, []);

    // Setup SignalR event listener
    useEffect(() => {
        // Subscribe to signature requests
        signalRService.onSignatureRequest(handleSignatureRequest);

        // Request notification permission on first mount
        requestNotificationPermission();

        // Cleanup
        return () => {
            signalRService.off('ShowSignatureRequest');
        };
    }, [handleSignatureRequest, requestNotificationPermission]);

    return {
        // State
        ...state,
        
        // Actions
        openSignatureDialog,
        closeSignatureDialog,
        clearCurrentRequest,
        handleSignatureSubmitted,
        handleSignatureError,
        requestNotificationPermission,
        getRequestById,
        clearHistory,

        // Computed
        hasActiveRequest: !!state.currentRequest,
        unreadRequestsCount: state.requestHistory.filter(req => 
            !(req as SignatureMessageData & { completed?: boolean }).completed
        ).length
    };
};
