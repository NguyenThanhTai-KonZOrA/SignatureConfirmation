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

export interface RegisterDeviceRequest {
    DeviceName: string;
    MacAddress: string;
    IpAddress: string;
    StaffDeviceId?: string;
}

export interface RegisterDeviceResponse {
    id: string;
    deviceName: string;
    connectionId: string;
    isOnline: boolean;
    isAvailable: boolean;
    macAddress: string;
    ipAddress: string;
}

export interface UpdateConnectionRequest {
    DeviceName: string;
    ConnectionId: string;
    MacAddress: string;
    IpAddress: string;
}

export interface UpdateConnectionResponse {
    id: string;
    deviceName: string;
    connectionId: string;
    isOnline: boolean;
}

export interface GetOnlineDevicesResponse {
    id: string;
    deviceName: string;
    connectionId: string;
    isOnline: boolean;
    isAvailable: boolean;
    macAddress: string;
    ipAddress: string;
    lastHeartbeat: string;
    staffDeviceId?: string
}

// Signature Request types
export interface SignatureMessageData {
    patronId: number;
    requestId: string;
    patronName: string;
    documentType: string;
    message: string;
    timestamp: string;
    expiryMinutes?: number;
    sessionId: string;
    staffDeviceId: string;
}

export interface SignatureConfirmRequest {
    sessionId: string;
    patronId: number;
    signature: string;
    staffDeviceId: string;
}

export interface SignatureConfirmResponse {
    success: boolean;
    message: string;
    requestId: string;
    timestamp: string;
}