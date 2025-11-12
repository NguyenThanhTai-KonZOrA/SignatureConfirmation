import * as signalR from '@microsoft/signalr';

export interface PatronUpdateMessage {
    patronId: number;
    membershipId?: string;
    status: string;
    message: string;
    timestamp: Date;
}

export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
    data?: any;
}

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;

    constructor() {
        this.initializeConnection();
    }

    private initializeConnection() {
        // Get API base URL from environment config
        const apiBase = (window as any)?._env_?.API_BASE || window.location.origin;
        const hubUrl = `${apiBase}/patronHub`;

        console.log('🔌 Initializing SignalR connection to:', hubUrl);

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                // Remove skipNegotiation to allow for better compatibility
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
                // Add headers for CORS if needed
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (retryContext) => {
                    if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
                        console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
                        return null; // Stop reconnecting
                    }
                    const delay = this.reconnectDelay * (retryContext.previousRetryCount + 1);
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${retryContext.previousRetryCount + 1}/${this.maxReconnectAttempts})`);
                    return delay;
                }
            })
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        if (!this.connection) return;

        this.connection.onreconnecting((error) => {
            console.warn('SignalR reconnecting...', error);
            this.reconnectAttempts++;
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR reconnected. Connection ID:', connectionId);
            this.reconnectAttempts = 0;
        });

        this.connection.onclose((error) => {
            console.error('SignalR connection closed:', error);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => this.start(), this.reconnectDelay);
            }
        });
    }

    public async start(): Promise<void> {
        if (!this.connection) {
            this.initializeConnection();
        }

        if (this.connection?.state === signalR.HubConnectionState.Disconnected) {
            try {
                console.log('🔄 Starting SignalR connection...');
                await this.connection.start();
                console.log('✅ SignalR Connected successfully');
                console.log('🔗 Connection ID:', this.connection.connectionId);
                console.log('🌐 Connection State:', signalR.HubConnectionState[this.connection.state]);
                this.reconnectAttempts = 0;
            } catch (error: any) {
                console.error('❌ SignalR Connection failed:', error);
                
                // Provide more detailed error information
                if (error.message) {
                    console.error('Error message:', error.message);
                }
                if (error.code) {
                    console.error('Error code:', error.code);
                }
                if (error.type) {
                    console.error('Error type:', error.type);
                }
                
                // Try to provide helpful debugging information
                const apiBase = (window as any)?._env_?.API_BASE;
                if (apiBase) {
                    console.log('📡 API Base from config:', apiBase);
                } else {
                    console.warn('⚠️ No API_BASE found in window._env_, using fallback');
                }
                
                throw new Error(`SignalR connection failed: ${error.message || 'Unknown error'}`);
            }
        }
    }

    public async stop(): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.stop();
                console.log('SignalR Disconnected');
            } catch (error) {
                console.error('Error stopping SignalR:', error);
            }
        }
    }

    // Subscribe to patron updates
    public onPatronUpdated(callback: (message: PatronUpdateMessage) => void): void {
        this.connection?.on('ReceivePatronUpdate', callback);
    }

    // Subscribe to validation results
    public onValidationResult(callback: (result: ValidationResult) => void): void {
        this.connection?.on('ReceiveValidationResult', callback);
    }

    // Subscribe to income validation
    public onIncomeValidation(callback: (patronId: number, isValid: boolean, message: string) => void): void {
        this.connection?.on('ReceiveIncomeValidation', callback);
    }

    // Send patron data for validation
    public async validatePatron(patronData: any): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) {
            throw new Error('SignalR not connected');
        }

        try {
            await this.connection.invoke('ValidatePatronData', patronData);
        } catch (error) {
            console.error('Error validating patron:', error);
            throw error;
        }
    }

    // Send income validation request
    public async validateIncome(patronId: number, incomeData: any): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) {
            throw new Error('SignalR not connected');
        }

        try {
            await this.connection.invoke('ValidateIncomeDocument', patronId, incomeData);
        } catch (error) {
            console.error('Error validating income:', error);
            throw error;
        }
    }

    // Request patron status
    public async getPatronStatus(patronId: number): Promise<void> {
        if (this.connection?.state !== signalR.HubConnectionState.Connected) {
            throw new Error('SignalR not connected');
        }

        try {
            await this.connection.invoke('GetPatronStatus', patronId);
        } catch (error) {
            console.error('Error getting patron status:', error);
            throw error;
        }
    }

    // Unsubscribe from events
    public off(eventName: string): void {
        this.connection?.off(eventName);
    }

    // Get connection state
    public getState(): signalR.HubConnectionState | undefined {
        return this.connection?.state;
    }

    // Check if connected
    public isConnected(): boolean {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }

    // Get detailed connection information for debugging
    public getConnectionInfo(): any {
        if (!this.connection) {
            return {
                hasConnection: false,
                state: 'No Connection Object',
                hubUrl: 'Not initialized',
                apiBase: (window as any)?._env_?.API_BASE || 'Not found'
            };
        }

        return {
            hasConnection: true,
            state: signalR.HubConnectionState[this.connection.state],
            connectionId: this.connection.connectionId,
            hubUrl: this.connection.baseUrl,
            apiBase: (window as any)?._env_?.API_BASE,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }

    // Test connection with ping
    public async testConnection(): Promise<boolean> {
        if (!this.isConnected()) {
            return false;
        }

        try {
            await this.connection!.invoke('Ping');
            console.log('✅ SignalR ping successful');
            return true;
        } catch (error) {
            console.error('❌ SignalR ping failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const signalRService = new SignalRService();
export default signalRService;