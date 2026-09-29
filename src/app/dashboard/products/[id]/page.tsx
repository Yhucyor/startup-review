"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { use } from "react";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  // Mock data for the UI
  const product = {
    id: unwrappedParams.id,
    sku: "TEA-OL-01",
    title: "Trà Ô Long Cao Cấp 500g",
    desc: "Trà Ô Long được hái tay từ những búp trà tươi ngon nhất, sấy lạnh giữ nguyên hương vị tự nhiên. Phù hợp làm quà biếu hoặc sử dụng hàng ngày.",
    stock: 120,
    price: "250.000đ",
    revenue: "15.5M",
  };

  return (
    <div className={styles.container}>
      <Link href="/dashboard/products" className={styles.backLink}>
        ← Quay lại danh sách sản phẩm
      </Link>

      {/* Hero Header */}
      <div className={styles.headerCard}>
        <div className={styles.imageSection}>
          🍵
        </div>
        <div className={styles.infoSection}>
          <div className={styles.skuBadge}>SKU: {product.sku}</div>
          <h1 className={styles.title}>{product.title}</h1>
          <p className={styles.desc}>{product.desc}</p>
          
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Tồn kho hiện tại</span>
              <span className={styles.statValue}>{product.stock}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Giá bán lẻ</span>
              <span className={styles.statValue}>{product.price}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Doanh thu ước tính</span>
              <span className={`${styles.statValue} ${styles.highlight}`}>{product.revenue}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        
        {/* Platform Sync Status */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🌐 Trạng thái Đồng bộ Sàn</h2>
          <div className={styles.platformList}>
            
            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: '#f97316' }}>🛍️</div>
                <div>
                  <div className={styles.platformName}>Shopee (Tech Startup VN)</div>
                  <div className={styles.syncWarning}>
                    <span className="animate-pulse">⚠️</span> Bị từ chối: Thiếu thuộc tính "Thương hiệu"
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary">Khắc phục</button>
            </div>

            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: '#06b6d4' }}>🎵</div>
                <div>
                  <div className={styles.platformName}>TikTok Shop</div>
                  <div className={styles.syncSuccess}>
                    <span>✓</span> Đã đồng bộ 5 phút trước
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary" disabled>Đồng bộ lại</button>
            </div>

            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: '#3b82f6' }}>💙</div>
                <div>
                  <div className={styles.platformName}>Lazada</div>
                  <div className={styles.syncSuccess}>
                    <span>✓</span> Đã đồng bộ 2 giờ trước
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary" disabled>Đồng bộ lại</button>
            </div>

          </div>
        </div>

        {/* AI Content Optimization */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.aiGlow}>✨ AI Copilot Tối ưu hóa</span>
          </h2>
          
          <div className={styles.diffBox}>
            <h4>Tiêu đề (Shopee SEO)</h4>
            <div><span className={styles.diffRemoved}>Trà Ô Long Cao Cấp 500g</span></div>
            <div style={{ marginTop: '4px' }}>
              <span className={styles.diffAdded}>Trà Ô Long Thượng Hạng 500g - Giảm Cân, Thanh Lọc Cơ Thể (Hộp Quà Tặng)</span>
            </div>

            <div style={{ margin: '20px 0', borderTop: '1px dashed rgba(255,255,255,0.1)' }}></div>

            <h4>Hashtag đề xuất (TikTok)</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-default">#traolong</span>
              <span className="badge badge-default">#trangiamcan</span>
              <span className="badge badge-default">#thanhloc</span>
              <span className="badge badge-default">#quatang</span>
              <span className="badge badge-default" style={{ borderColor: '#c084fc', color: '#c084fc' }}>+ AI Generated</span>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button className="btn btn-secondary">Chỉnh sửa</button>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }}>
              Áp dụng & Cập nhật lên Sàn
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
