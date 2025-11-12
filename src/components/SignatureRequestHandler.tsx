import React from 'react';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { SignatureRequestDialog } from './SignatureRequestDialog';
import { useDeviceManagerContext } from '../contexts/deviceManagerContext';

/**
 * Global signature request handler component
 * This component should be placed at app level to handle signature requests globally
 * Uses shared device manager context to avoid multiple instances
 */
export const SignatureRequestHandler: React.FC = () => {
    const { 
        deviceInfo, 
        isReady, 
        error,
        currentStep 
    } = useDeviceManagerContext();
    
    const {
        currentRequest,
        isDialogOpen,
        closeSignatureDialog,
        handleSignatureSubmitted,
        handleSignatureError
    } = useSignatureRequest({
        onSignatureRequest: (data) => {
            console.log('📝 New signature request received:', data);
        },
        onSignatureSubmitted: (requestId) => {
            console.log('✅ Signature submitted successfully:', requestId);
        },
        onSignatureError: (error, requestId) => {
            console.error('❌ Signature submission failed:', error, requestId);
        },
        autoShowDialog: true
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

    return (
        <SignatureRequestDialog
            open={isDialogOpen}
            data={currentRequest}
            deviceName={deviceInfo?.deviceName || 'Unknown Device'}
            onClose={closeSignatureDialog}
            onSubmitted={handleSignatureSubmitted}
            onError={handleSignatureError}
        />
    );
};
