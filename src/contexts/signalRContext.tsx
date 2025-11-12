import React, { createContext, useContext, type ReactNode } from 'react';
import { useSignalR, type UseSignalROptions } from '../hooks/useSignalR';

interface SignalRContextType {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    validatePatron: (patronData: any) => Promise<void>;
    validateIncome: (patronId: number, incomeData: any) => Promise<void>;
    getPatronStatus: (patronId: number) => Promise<void>;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ 
    children: ReactNode;
    options?: UseSignalROptions;
}> = ({ children, options }) => {
    const signalR = useSignalR(options);

    return (
        <SignalRContext.Provider value={signalR}>
            {children}
        </SignalRContext.Provider>
    );
};

export const useSignalRContext = () => {
    const context = useContext(SignalRContext);
    if (!context) {
        throw new Error('useSignalRContext must be used within SignalRProvider');
    }
    return context;
};