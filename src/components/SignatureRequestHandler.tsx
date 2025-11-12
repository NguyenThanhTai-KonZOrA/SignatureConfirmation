import React from 'react';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { useDeviceManagerContext } from '../contexts/deviceManagerContext';

/**
 * Global signature request handler component
 * This component should be placed at app level to handle signature requests globally
 * Uses shared device manager context to avoid multiple instances
 * NOTE: Dialog is disabled here - SignatureConfirmation page handles the UI
 */
export const SignatureRequestHandler: React.FC = () => {
    const { 
        deviceInfo, 
        isReady, 
        error,
        currentStep 
    } = useDeviceManagerContext();
    
    // Initialize signature request handling (for logging only)
    useSignatureRequest({
        onSignatureRequest: (data) => {
            console.log('📝 New signature request received (handled by SignatureConfirmation page):', data);
        },
        onSignatureSubmitted: (requestId) => {
            console.log('✅ Signature submitted successfully:', requestId);
        },
        onSignatureError: (error, requestId) => {
            console.error('❌ Signature submission failed:', error, requestId);
        },
        autoShowDialog: false // Disabled - SignatureConfirmation page handles dialog
    });

    // Log current status for debugging
    React.useEffect(() => {
        console.log('🔧 Device Manager Status:', {
            currentStep,
            isReady,
            error,
            deviceName: deviceInfo?.deviceName
        });
    }, [currentStep, isReady, error, deviceInfo]);

    // No dialog rendered - SignatureConfirmation page handles the UI
    return null;
};
