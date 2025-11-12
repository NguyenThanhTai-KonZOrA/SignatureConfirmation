import React from 'react';
import { useSignatureRequest } from '../hooks/useSignatureRequest';
import { SignatureRequestDialog } from './SignatureRequestDialog';
import { useDeviceManager } from '../hooks/useDeviceManager';

/**
 * Global signature request handler component
 * This component should be placed at app level to handle signature requests globally
 */
export const SignatureRequestHandler: React.FC = () => {
    const { deviceInfo } = useDeviceManager({ autoRegister: false });
    
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
