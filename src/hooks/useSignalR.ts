import { useEffect, useCallback, useState } from 'react';
import signalRService, { type PatronUpdateMessage, type ValidationResult } from '../services/signalRService';

export interface UseSignalROptions {
    autoConnect?: boolean;
    onPatronUpdate?: (message: PatronUpdateMessage) => void;
    onValidationResult?: (result: ValidationResult) => void;
    onIncomeValidation?: (patronId: number, isValid: boolean, message: string) => void;
}

export const useSignalR = (options: UseSignalROptions = {}) => {
    const {
        autoConnect = true,
        onPatronUpdate,
        onValidationResult,
        onIncomeValidation
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [connectionInfo, setConnectionInfo] = useState<any>(null);

    // Update connection info
    const updateConnectionInfo = useCallback(() => {
        const info = signalRService.getConnectionInfo();
        setConnectionInfo(info);
        return info;
    }, []);

    // Connect to SignalR
    const connect = useCallback(async () => {
        if (isConnecting || signalRService.isConnected()) return;

        setIsConnecting(true);
        setError(null);

        try {
            console.log('🔄 Attempting SignalR connection...');
            await signalRService.start();
            setIsConnected(true);
            const info = updateConnectionInfo();
            console.log('✅ SignalR connection established:', info);
        } catch (err: any) {
            const errorMessage = err.message || 'Unknown connection error';
            console.error('❌ SignalR connection failed:', errorMessage);
            setError(new Error(errorMessage));
            setIsConnected(false);
            updateConnectionInfo();
        } finally {
            setIsConnecting(false);
        }
    }, [isConnecting, updateConnectionInfo]);

    // Disconnect from SignalR
    const disconnect = useCallback(async () => {
        try {
            await signalRService.stop();
            setIsConnected(false);
        } catch (err) {
            setError(err as Error);
        }
    }, []);

    // Validate patron data
    const validatePatron = useCallback(async (patronData: any) => {
        try {
            await signalRService.validatePatron(patronData);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Validate income
    const validateIncome = useCallback(async (patronId: number, incomeData: any) => {
        try {
            await signalRService.validateIncome(patronId, incomeData);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Get patron status
    const getPatronStatus = useCallback(async (patronId: number) => {
        try {
            await signalRService.getPatronStatus(patronId);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    useEffect(() => {
        // Auto-connect if enabled
        if (autoConnect) {
            connect();
        }

        // Setup event listeners
        if (onPatronUpdate) {
            signalRService.onPatronUpdated(onPatronUpdate);
        }

        if (onValidationResult) {
            signalRService.onValidationResult(onValidationResult);
        }

        if (onIncomeValidation) {
            signalRService.onIncomeValidation(onIncomeValidation);
        }

        // Cleanup
        return () => {
            if (onPatronUpdate) {
                signalRService.off('ReceivePatronUpdate');
            }
            if (onValidationResult) {
                signalRService.off('ReceiveValidationResult');
            }
            if (onIncomeValidation) {
                signalRService.off('ReceiveIncomeValidation');
            }
        };
    }, [autoConnect, connect, onPatronUpdate, onValidationResult, onIncomeValidation]);

    return {
        isConnected,
        isConnecting,
        error,
        connectionInfo,
        connect,
        disconnect,
        validatePatron,
        validateIncome,
        getPatronStatus,
        updateConnectionInfo
    };
};