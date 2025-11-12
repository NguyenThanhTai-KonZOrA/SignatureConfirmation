# Device Manager Implementation

## Overview
Tôi đã implement complete Device Manager flow theo sơ đồ yêu cầu. System này quản lý device registration, SignalR connection, và heartbeat monitoring.

## Flow Implementation

### 🔥 Complete Flow (6 Steps)

```
┌─────────────────┐
│   iPad Opens    │
│      App        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. Get Device Info          │✅ IMPLEMENTED
│    - MAC Address            │
│    - IP Address             │
│    - Device Name            │
│    - Staff Device ID        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. POST /api/PatronDevice/  │✅ IMPLEMENTED
│         register            │
│    (Handles both new &      │
│     existing devices)       │
└────────┬────────────────────┘
         │
         ├─── New Device ──────► Creates in DB ✅
         │
         └─── Existing Device ─► Updates in DB ✅
         │
         ▼
┌─────────────────────────────┐
│ 3. Connect SignalR          │✅ IMPLEMENTED
│    URL: /patronSignatureHub │
│    ?deviceName=iPad_1       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. Hub.OnConnectedAsync()   │✅ IMPLEMENTED
│    Auto-updates ConnectionId│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. Invoke                   │✅ IMPLEMENTED
│    RegisterPatronDevice     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 6. Start Heartbeat          │✅ IMPLEMENTED
│    (Every 30s)              │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ ✅ Ready to receive         │✅ IMPLEMENTED
│    signature requests       │
└─────────────────────────────┘
```

## 📁 Files Created/Modified

### New Services
- `src/services/deviceManager.ts` - Main device management service
- `src/services/signatrueApiService.ts` - API service for device endpoints
- `src/utils/deviceInfo.ts` - Device information utilities

### New Hooks
- `src/hooks/useDeviceManager.ts` - React hook for device management

### New Components
- `src/components/DeviceManagerDemo.tsx` - Demo component with UI
- `src/pages/DeviceManagerPage.tsx` - Demo page

### Modified Files
- `src/services/signalRService.ts` - Added device name parameter support
- `src/App.tsx` - Added device manager route
- `src/pages/PatronForm.tsx` - Added navigation to device manager
- `src/type.ts` - Added device management types

## 🚀 API Endpoints Used

### 1. Device Registration
```typescript
POST /api/PatronDevice/register-device
Body: {
    DeviceName: string;
    MacAddress: string;
    IpAddress: string;
    StaffDeviceId: string;
}
```

### 2. Update Connection
```typescript
POST /api/PatronDevice/update-connection
Body: {
    DeviceName: string;
    ConnectionId: string;
    MacAddress: string;
    IpAddress: string;
}
```

### 3. Get Online Devices
```typescript
GET /api/PatronDevice/online-devices
Response: RegisterDeviceResponse[]
```

## 🎮 Usage

### Basic Usage
```typescript
import { useDeviceManager } from '../hooks/useDeviceManager';

const MyComponent = () => {
    const {
        isReady,
        currentStep,
        error,
        deviceInfo,
        registeredDevice,
        registerDevice,
        disconnect
    } = useDeviceManager({
        autoRegister: true,
        autoConnect: true,
        autoHeartbeat: true,
        heartbeatInterval: 30000
    });

    return (
        <div>
            <p>Status: {currentStep}</p>
            <p>Ready: {isReady ? 'Yes' : 'No'}</p>
            {error && <p>Error: {error}</p>}
        </div>
    );
};
```

### Manual Control
```typescript
const {
    registerDevice,
    connectToSignalR,
    startHeartbeat,
    stopHeartbeat,
    disconnect,
    retry
} = useDeviceManager({
    autoRegister: false,
    autoConnect: false,
    autoHeartbeat: false
});

// Manual flow
await registerDevice();
await connectToSignalR();
await startHeartbeat();
```

## 🔧 Device Information

Device info được generate tự động:

```typescript
interface DeviceInfo {
    deviceName: string;      // "iPad_ABC12345"
    macAddress: string;      // "XX:XX:XX:XX:XX:XX"
    ipAddress: string;       // "192.168.1.100"
    staffDeviceId: string;   // "STAFF_timestamp_random"
}
```

### Device Name Generation
- Format: `iPad_{8_character_id}`
- Consistent across app sessions
- Stored in localStorage

### MAC Address Simulation
- Format: `XX:XX:XX:XX:XX:XX`
- Consistent across app sessions
- Stored in localStorage for web demo

### IP Address Detection
- Uses WebRTC for real IP detection
- Fallback to simulated IP if WebRTC fails
- Cached in sessionStorage

## 💓 Heartbeat System

- **Interval**: Configurable (default 30 seconds)
- **Method**: Calls `getOnlineDevices()` API
- **Validation**: Checks if device exists and is online
- **Error Handling**: Automatic retry and offline detection
- **Callbacks**: `onHeartbeatFailed`, `onDeviceOffline`

## 🎯 Demo Page

Truy cập `/device-manager` để xem demo:

### Features
- ✅ Visual progress tracking (6 steps)
- ✅ Real-time status updates
- ✅ Device information display
- ✅ Online devices list
- ✅ Manual controls (start/stop/retry)
- ✅ Error handling and display
- ✅ Debug information

### Demo Controls
- **Start Registration Flow**: Bắt đầu complete flow
- **Retry**: Restart lại toàn bộ flow
- **Disconnect**: Ngắt kết nối và cleanup
- **Get Online Devices**: Lấy list devices online
- **Clear Device Info**: Xóa stored device info (để test new device)

## 🔍 Debug & Testing

### View Debug Info
```javascript
// In browser console
localStorage.getItem('device_mac_address')
localStorage.getItem('staff_device_id')
sessionStorage.getItem('device_ip_address')
```

### Clear Device Info
```javascript
// Reset device for testing
import { clearDeviceInfo } from '../utils/deviceInfo';
clearDeviceInfo();
```

### Monitor Flow
All steps được log to console với emojis:
- 🔍 Step 1: Getting device info
- 📡 Step 2: Registering with API  
- 🔗 Step 3: Connecting SignalR
- 🔄 Step 4: Updating connection ID
- 💓 Step 6: Starting heartbeat
- ✅ Ready!

## 🚨 Error Handling

- **Network errors**: Auto retry with exponential backoff
- **Registration failure**: Clear error messages
- **SignalR disconnect**: Automatic reconnection
- **Heartbeat failure**: Offline detection
- **API errors**: Detailed error reporting

## 🔄 State Management

Hook return đầy đủ state:

```typescript
interface DeviceManagerState {
    // Registration
    isRegistering: boolean;
    registrationResult?: DeviceRegistrationResult;
    deviceInfo?: DeviceInfo;
    registeredDevice?: RegisterDeviceResponse;
    
    // Connection  
    isConnectedToSignalR: boolean;
    signalRConnectionId?: string;
    
    // Heartbeat
    isHeartbeatActive: boolean;
    lastHeartbeat?: Date;
    
    // Overall
    isReady: boolean;
    error?: string;
    currentStep: string;
}
```

## 🎊 Ready State

Device được consider "ready" khi:
- ✅ Device registered successfully
- ✅ SignalR connected with connection ID
- ✅ Connection ID updated in database
- ✅ Heartbeat started and active
- ✅ `isReady = true`

Lúc này device sẵn sàng nhận signature requests!

## 🔗 Navigation

- Từ main app: Click "Device Manager" button
- URL: `/device-manager`
- Back to main: Browser back button

## 🎁 Bonus Features

- 🎨 Beautiful UI với Material-UI
- 📊 Real-time progress tracking
- 🔄 Auto-retry mechanisms
- 💾 Persistent device storage
- 🐛 Comprehensive debugging
- 📱 Mobile-friendly design
- 🌐 Multi-language ready

Toàn bộ flow đã được implement theo đúng sơ đồ và ready để test! 🚀
