import axios from "axios";
import CacheBuster from "../utils/cacheBuster";
import type { RegisterDeviceRequest, RegisterDeviceResponse, SignatureConfirmRequest, SignatureConfirmResponse, UpdateConnectionRequest, UpdateConnectionResponse } from "../type";

const API_BASE = (window as any)._env_?.API_BASE;
const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" }
});

type ApiEnvelope<T> = {
    status: number;
    data: T;
    success: boolean;
};

function unwrapApiEnvelope<T>(response: { data: ApiEnvelope<T> }): T {
    if (!response.data.success) {
        throw new Error("API call failed");
    }
    return response.data.data;
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
            const response = await api.post('/api/PatronDevice/submit-signature', data);
            return unwrapApiEnvelope(response);
        } catch (error) {
            console.error('Error submitting signature:', error);
            throw error;
        }
    },
};