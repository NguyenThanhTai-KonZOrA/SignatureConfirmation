// PatronForm related types
export interface PatronData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    dateOfBirth?: string;
    idNumber?: string;
}

export interface IncomeData {
    documentType: string;
    documentNumber?: string;
    expiryDate?: string;
    amount?: number;
    currency?: string;
}

export interface NotificationState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
}

// SignalR Message types
export interface PatronUpdateMessage {
    patronId: number;
    message: string;
    status: 'success' | 'error' | 'info' | 'warning';
    timestamp: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    patronId?: number;
}

export interface SignalRError {
    message: string;
    code?: string;
    details?: any;
}

// Connection states
export interface ConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    error?: SignalRError;
    lastConnected?: Date;
    reconnectAttempts?: number;
}