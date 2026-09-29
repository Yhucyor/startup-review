"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function IntegrationsPage() {
  const [inputValue, setInputValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  
  const [platforms, setPlatforms] = useState([
    {
      id: 1,
      name: "Shopee",
      icon: "🛍️",
      status: "connected",
      shopName: "Tech Startup VN",
      lastSync: "Vừa xong",
      color: "#f97316"
    },
    {
      id: 2,
      name: "TikTok Shop",
      icon: "🎵",
      status: "disconnected",
      shopName: "---",
      lastSync: "---",
      color: "#000000"
    },
    {
      id: 3,
      name: "Lazada",
      icon: "💙",
      status: "disconnected",
      shopName: "---",
      lastSync: "---",
      color: "#3b82f6"
    }
  ]);

  const handleAutoConnect = async () => {
    if (!inputValue) return;
    
    setIsScanning(true);
    setScanLogs([]);
    
    // Simulate AI scanning and processing
    const logs = [
      "Khởi tạo AI Copilot Connection...",
      "Đang phân tích cú pháp chuỗi đầu vào...",
      "Phát hiện định dạng: TikTok Shop API Token (Phiên bản 2.0)",
      "Trích xuất Merchant ID: 893***142",
      "Đang thiết lập kênh giao tiếp an toàn (SSL/TLS)...",
      "Xác thực Token với máy chủ TikTok...",
      "Thành công! Đang ánh xạ danh mục và cấu hình tồn kho..."
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanLogs(prev => [...prev, logs[i]]);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update TikTok status to connected
    setPlatforms(prev => prev.map(p => {
      if (p.name === "TikTok Shop") {
        return { ...p, status: "connected", shopName: "Tech Startup TikTok", lastSync: "Vừa xong" };
      }
      return p;
    }));
    
    setIsScanning(false);
    setInputValue("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Kết nối Sàn (Integrations)</h1>
        <p className={styles.subtitle}>Quản lý kết nối các gian hàng thương mại điện tử bằng AI Copilot.</p>
      </div>

      <div className={styles.aiSection}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>✨ AI Auto-Connect</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Dán đường link gian hàng, mã Access Token, hoặc API Key của bất kỳ sàn nào. AI sẽ tự động phân tích và cấu hình kết nối cho bạn trong vài giây.
          </p>
        </div>

        <div className={styles.aiInputWrapper}>
          <input 
            type="text" 
            className={styles.aiInput}
            placeholder="Ví dụ: shp_12345_token... hoặc link cửa hàng..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isScanning}
          />
          <button 
            className={styles.aiButton}
            onClick={handleAutoConnect}
            disabled={!inputValue || isScanning}
          >
            {isScanning ? "Đang xử lý..." : "Cấu hình tự động"}
          </button>
        </div>

        {(isScanning || scanLogs.length > 0) && (
          <div className={styles.scannerBox}>
            {scanLogs.map((log, index) => (
              <div key={index} className={styles.scanLine} style={{ animationDelay: '0s' }}>
                <span style={{ color: '#10b981' }}>{'>'}</span> {log}
              </div>
            ))}
            {isScanning && (
              <div className={styles.scanLine} style={{ animation: 'pulse 1s infinite' }}>
                <span style={{ color: '#10b981' }}>{'>'}</span> <span style={{ width: '8px', height: '14px', background: '#38bdf8', display: 'inline-block' }}></span>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '20px', marginTop: '16px' }}>Các sàn hỗ trợ</h2>
      <div className={styles.grid}>
        {platforms.map(platform => (
          <div key={platform.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>{platform.icon}</div>
              <div className={styles.cardInfo}>
                <div className={styles.platformName}>{platform.name}</div>
                <div className={`${styles.platformStatus} ${
                  platform.status === 'connected' ? styles.statusConnected : styles.statusDisconnected
                }`}>
                  <span style={{ 
                    width: '8px', height: '8px', borderRadius: '50%', 
                    background: platform.status === 'connected' ? '#10b981' : '#94a3b8' 
                  }}></span>
                  {platform.status === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'}
                </div>
              </div>
            </div>

            <div className={styles.cardDetails}>
              <div className={styles.cardDetailRow}>
                <span>Tên gian hàng:</span>
                <span className={styles.cardDetailValue}>{platform.shopName}</span>
              </div>
              <div className={styles.cardDetailRow}>
                <span>Đồng bộ cuối:</span>
                <span className={styles.cardDetailValue}>{platform.lastSync}</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button 
                className={styles.btnConfigure}
                onClick={() => setSelectedPlatform(platform)}
              >
                {platform.status === 'connected' ? 'Cấu hình gian hàng' : 'Chi tiết kết nối'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side Panel Drawer */}
      {selectedPlatform && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedPlatform(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                {selectedPlatform.icon} Cấu hình {selectedPlatform.name}
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedPlatform(null)}>✕</button>
            </div>
            
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Trạng thái hiện tại</div>
              <div className={styles.detailValue} style={{ 
                color: selectedPlatform.status === 'connected' ? '#10b981' : '#f59e0b',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ 
                  width: '10px', height: '10px', borderRadius: '50%', 
                  background: selectedPlatform.status === 'connected' ? '#10b981' : '#f59e0b' 
                }}></span>
                {selectedPlatform.status === 'connected' ? 'Hoạt động bình thường' : 'Đang chờ kết nối'}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Thông tin cửa hàng</div>
              <div className={styles.itemRow} style={{ borderBottom: 'none', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tên gian hàng:</span>
                <strong>{selectedPlatform.shopName}</strong>
              </div>
              <div className={styles.itemRow} style={{ borderBottom: 'none', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ID Cửa hàng:</span>
                <strong>{selectedPlatform.status === 'connected' ? '893452142' : '---'}</strong>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Tùy chọn đồng bộ</div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Tự động đồng bộ Tồn kho (Auto-sync)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Đồng bộ Đơn hàng theo thời gian thực</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={false} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Gửi tin nhắn tự động chăm sóc KH</span>
                </label>
              </div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedPlatform(null)}>Đóng</button>
              <button className="btn btn-primary" style={{ flex: 1 }}>
                {selectedPlatform.status === 'connected' ? 'Cập nhật cấu hình' : 'Bắt đầu kết nối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
