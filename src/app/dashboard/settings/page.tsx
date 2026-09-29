"use client";

import styles from "./page.module.css";
import { useState } from "react";

export default function SettingsPage() {
  const [autoDraft, setAutoDraft] = useState(true);
  const [autoCheck, setAutoCheck] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cài đặt Doanh nghiệp</h1>
        <p className={styles.subtitle}>Quản lý kết nối sàn thương mại điện tử và các quy tắc tự động hóa.</p>
      </div>

      {/* Connection Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kết nối Cửa hàng</h2>
        
        <div className={styles.connectionList}>
          <div className={styles.connectionCard}>
            <div className={styles.connectionInfo}>
              <div className={styles.connectionIcon}>🛒</div>
              <div>
                <div className={styles.connectionName}>Shopee: Tech Startup VN</div>
                <div className={styles.connectionStatus}>
                  <span className="badge badge-success">Đã kết nối</span>
                  <span>Đồng bộ cuối: 10 phút trước</span>
                </div>
              </div>
            </div>
            <button className="btn btn-secondary">Cấu hình lại</button>
          </div>

          <div className={styles.connectionCard}>
            <div className={styles.connectionInfo}>
              <div className={styles.connectionIcon} style={{ filter: 'grayscale(1)', opacity: 0.5 }}>🎵</div>
              <div style={{ opacity: 0.5 }}>
                <div className={styles.connectionName}>TikTok Shop</div>
                <div className={styles.connectionStatus}>
                  <span>Sắp ra mắt</span>
                </div>
              </div>
            </div>
            <button className="btn btn-secondary" disabled>Chưa hỗ trợ</button>
          </div>
        </div>
      </div>

      {/* AI Automation Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quy tắc Tự động hóa AI</h2>
        
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <div className={styles.settingName}>Tự động tạo bản nháp nội dung</div>
            <div className={styles.settingDesc}>AI sẽ tự viết tiêu đề, mô tả và chuẩn bị thẻ tag ngay khi có sản phẩm gốc mới.</div>
          </div>
          <div 
            className={`${styles.toggle} ${autoDraft ? styles.active : ''}`}
            onClick={() => setAutoDraft(!autoDraft)}
          >
            <div className={styles.toggleHandle}></div>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <div className={styles.settingName}>Tự động kiểm tra lỗi (Policy Gate)</div>
            <div className={styles.settingDesc}>AI tự động đối chiếu các quy định của Shopee để phát hiện lỗi thuộc tính.</div>
          </div>
          <div 
            className={`${styles.toggle} ${autoCheck ? styles.active : ''}`}
            onClick={() => setAutoCheck(!autoCheck)}
          >
            <div className={styles.toggleHandle}></div>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <div className={styles.settingName}>Tự động đồng bộ Đơn hàng & Tồn kho</div>
            <div className={styles.settingDesc}>App sẽ nhận đơn và tự động trừ tồn kho mà không cần chờ duyệt.</div>
          </div>
          <div 
            className={`${styles.toggle} ${autoSync ? styles.active : ''}`}
            onClick={() => setAutoSync(!autoSync)}
          >
            <div className={styles.toggleHandle}></div>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <div className={styles.settingName}>Tự động Đăng bài (Auto-Publish)</div>
            <div className={styles.settingDesc}>
              Bỏ qua bước duyệt thủ công. Bài viết sau khi qua <strong>Policy Gate</strong> sẽ tự đăng ngay.
              <br/><em>(Khuyến nghị: TẮT trong thời gian đầu để kiểm soát nội dung).</em>
            </div>
          </div>
          <div 
            className={`${styles.toggle} ${autoPublish ? styles.active : ''}`}
            onClick={() => setAutoPublish(!autoPublish)}
          >
            <div className={styles.toggleHandle}></div>
          </div>
        </div>
      </div>

    </div>
  );
}
