import axios from "axios";
import CacheBuster from "../utils/cacheBuster";
import type { RegisterDeviceRequest, RegisterDeviceResponse, ReviewableSignatureResponse, SignatureConfirmRequest, SignatureConfirmResponse, UpdateConnectionRequest, UpdateConnectionResponse } from "../type";

const API_BASE = (window as any)._env_?.API_BASE;
const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" }
});

function unwrapApiEnvelope<T>(response: { data: any }): T {
    console.log('🔧 API Response unwrapping:', response.data);

    // Handle different response formats
    if (response.data) {
        // Format 1: { status, data, success }
        if (typeof response.data.success !== 'undefined') {
            if (!response.data.success) {
                throw new Error(response.data.message || "API call failed");
            }
            return response.data.data || response.data;
        }

        // Format 2: Direct data
        if (typeof response.data === 'object' && response.data !== null) {
            return response.data;
        }
    }

    // Format 3: Response itself is the data
    return response.data;
}

// Add request interceptor for cache busting on GET requests
api.interceptors.request.use((config) => {
    // Add cache busting to GET requests
    if (config.method === 'get' && config.url) {
        config.url = CacheBuster.addCacheBustToUrl(config.url);
    }
    return config;
});

export const signatureApiService = {
    registerDevice: async (deviceData: RegisterDeviceRequest): Promise<RegisterDeviceResponse> => {
        try {
            const response = await api.post('/api/PatronDevice/register-device', deviceData);
            return unwrapApiEnvelope(response);
        } catch (error) {
            console.error('Error registering device:', error);
            throw error;
        }
    },

    updateConnection: async (deviceData: UpdateConnectionRequest): Promise<UpdateConnectionResponse> => {
        try {
            const response = await api.post('/api/PatronDevice/update-connection', deviceData);
            return unwrapApiEnvelope(response);
        } catch (error) {
            console.error('Error updating connection:', error);
            throw error;
        }
    },

    getOnlineDevices: async (): Promise<RegisterDeviceResponse[]> => {
        try {
            const response = await api.get('/api/PatronDevice/online-devices');
            return unwrapApiEnvelope(response);
        } catch (error) {
            console.error('Error fetching online devices:', error);
            throw error;
        }
    },

    submitSignature: async (data: SignatureConfirmRequest): Promise<SignatureConfirmResponse> => {
        try {
            const response = await api.post('/api/CustomerSign/submit-signature', data);

            const result = unwrapApiEnvelope(response);
            // Ensure we return a properly formatted SignatureConfirmResponse
            if (result && typeof result === 'object') {
                const resultObj = result as any;
                return {
                    success: resultObj.success ?? true, // Default to true if success field missing
                    message: resultObj.message || 'Signature submitted successfully',
                    requestId: resultObj.requestId || data.sessionId,
                    timestamp: resultObj.timestamp || new Date().toISOString()
                };
            } else {
                return {
                    success: true,
                    message: 'Signature submitted successfully',
                    requestId: data.sessionId,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('❌ Error submitting signature:', error);

            // Check if it's an axios error with response
            if (axios.isAxiosError(error) && error.response) {
                return {
                    success: false,
                    message: error.response.data?.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
                    requestId: data.sessionId,
                    timestamp: new Date().toISOString()
                };
            }

            throw error;
        }
    },

    getReviewableSignatures: async (patronId: number): Promise<ReviewableSignatureResponse> => {
        try {
            const response = await api.get(`/api/CustomerSign/sign-review/${patronId}`);
            return unwrapApiEnvelope(response);
        } catch (error) {
            console.error('Error fetching reviewable signatures:', error);
            throw error;
        }
    }
};