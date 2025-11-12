# SignalR Connection Troubleshooting Guide

## 🔧 Cách khắc phục lỗi "SignalR not connected"

### 1. Kiểm tra cấu hình API Base
Đảm bảo file `public/env-config.js` có đúng API base URL:
```javascript
window._env_ = {
  API_BASE: 'http://10.21.10.1:8088', // Địa chỉ server của bạn
  // ...
};
```

### 2. Kiểm tra server SignalR Hub
- Server cần expose SignalR Hub tại endpoint `/patronHub`
- URL đầy đủ sẽ là: `http://10.21.10.1:8088/patronHub`

### 3. Sử dụng tính năng Debug trong UI
PatronForm hiện có tính năng debug tích hợp:
- Khi có lỗi connection, nhấn nút "Refresh Debug Info" để xem thông tin chi tiết
- Nút "Retry Connection" để thử kết nối lại
- Thông tin debug bao gồm:
  - API Base URL
  - Hub URL 
  - Connection State
  - Số lần thử reconnect

### 4. Kiểm tra Console Log
Mở Developer Tools (F12) và xem Console tab:
```
✅ SignalR Connected successfully
🔗 Connection ID: xxx
🌐 Connection State: Connected
```

Hoặc lỗi:
```
❌ SignalR Connection failed: [Chi tiết lỗi]
📡 API Base from config: http://10.21.10.1:8088
```

### 5. Các lỗi thường gặp và cách sửa

#### Lỗi: "Failed to complete negotiation"
- **Nguyên nhân**: Server không chạy hoặc không có SignalR Hub
- **Giải pháp**: Đảm bảo server ASP.NET Core đang chạy và có configure SignalR

#### Lỗi: "CORS policy" 
- **Nguyên nhân**: Server chặn CORS
- **Giải pháp**: Configure CORS trên server để allow origin của client

#### Lỗi: "Connection timeout"
- **Nguyên nhân**: Mạng chậm hoặc server không phản hồi
- **Giải pháp**: Kiểm tra kết nối mạng và tăng timeout

### 6. Server Configuration cần thiết (ASP.NET Core)

```csharp
// Startup.cs hoặc Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSignalR();
    services.AddCors(options =>
    {
        options.AddPolicy("AllowAll",
            builder =>
            {
                builder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            });
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseCors("AllowAll");
    app.UseRouting();
    
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapHub</patronHub>("/patronHub");
    });
}
```

### 7. Kiểm tra kết nối thủ công
Bạn có thể test kết nối bằng cách truy cập:
- `http://10.21.10.1:8088/patronHub/negotiate` (POST request)
- Nếu trả về JSON với `connectionToken` thì server đang hoạt động

### 8. Tính năng tự động reconnect
Client đã được config để tự động reconnect:
- Tối đa 5 lần thử
- Delay tăng dần: 3s, 6s, 9s, 12s, 15s
- Sau khi hết lần thử, cần manual retry

### 9. Network & Firewall
Đảm bảo:
- Port 8088 không bị firewall chặn
- Client có thể ping được địa chỉ `10.21.10.1`
- WebSocket connections được allow qua proxy/firewall

### 10. Development vs Production
- **Development**: Có thể dùng `http://localhost:5000/patronHub`  
- **Production**: Cần dùng địa chỉ IP thực: `http://10.21.10.1:8088/patronHub`

---

## 🛠️ Quick Fix Commands

```bash
# Build và chạy client
npm run build
npm run dev

# Kiểm tra env config
cat public/env-config.js

# Test kết nối tới server
curl -X POST http://10.21.10.1:8088/patronHub/negotiate
```

## 📞 Contact Support
Nếu vẫn không kết nối được, hãy:
1. Chụp màn hình UI với thông tin debug
2. Copy toàn bộ console log 
3. Xác nhận server đang chạy và địa chỉ IP
