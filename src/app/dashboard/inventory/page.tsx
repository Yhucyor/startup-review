"use client";

import { useState } from "react";
import styles from "./page.module.css";

const MOCK_INVENTORY = [
  {
    id: "PROD-001",
    name: "Áo thun nam Basic",
    sku: "ATN-B-01",
    category: "Thời trang nam",
    price: "150.000đ",
    stock: 145,
    status: "good",
    platforms: ["Shopee", "Lazada", "TikTok"],
    lastUpdated: "2 giờ trước",
    location: "Kho A - Kệ 02"
  },
  {
    id: "PROD-002",
    name: "Giày Sneaker Thời Trang",
    sku: "SNEAK-01",
    category: "Giày dép",
    price: "890.000đ",
    stock: 12,
    status: "warning",
    platforms: ["Shopee", "TikTok"],
    lastUpdated: "1 ngày trước",
    location: "Kho B - Kệ 05"
  },
  {
    id: "PROD-003",
    name: "Trà Ô Long 500g",
    sku: "TEA-OL-01",
    category: "Thực phẩm",
    price: "250.000đ",
    stock: 0,
    status: "danger",
    platforms: ["Shopee", "Lazada"],
    lastUpdated: "Vừa xong",
    location: "Kho A - Kệ 01"
  }
];

export default function InventoryPage() {
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_INVENTORY[0] | null>(null);

  const getStockBadge = (status: string, stock: number) => {
    switch(status) {
      case 'good': return <span className={`${styles.stockBadge} ${styles['stock-good']}`}>{stock} - Tốt</span>;
      case 'warning': return <span className={`${styles.stockBadge} ${styles['stock-warning']}`}>{stock} - Sắp hết</span>;
      case 'danger': return <span className={`${styles.stockBadge} ${styles['stock-danger']}`}>Hết hàng</span>;
      default: return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kho Tồn (Inventory)</h1>
          <p className={styles.subtitle}>Quản lý và đồng bộ tồn kho đa nền tảng</p>
        </div>
        <button className="btn btn-primary">+ Thêm Sản Phẩm</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Sản phẩm</th>
              <th className={styles.th}>Danh mục</th>
              <th className={styles.th}>Giá bán</th>
              <th className={styles.th}>Tồn kho</th>
              <th className={styles.th}>Kênh bán</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVENTORY.map(product => (
              <tr key={product.id} className={styles.tr} onClick={() => setSelectedProduct(product)}>
                <td className={styles.td}>
                  <div className={styles.productName}>{product.name}</div>
                  <div className={styles.productSku}>SKU: {product.sku}</div>
                </td>
                <td className={styles.td}>{product.category}</td>
                <td className={styles.td}>{product.price}</td>
                <td className={styles.td}>{getStockBadge(product.status, product.stock)}</td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {product.platforms.map(p => (
                      <span key={p} style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{p}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel Drawer */}
      {selectedProduct && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>Chi tiết Sản phẩm</div>
              <button className={styles.closeBtn} onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Tên sản phẩm</div>
              <div className={styles.detailValue} style={{ fontSize: '18px' }}>{selectedProduct.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Mã SKU: {selectedProduct.sku}</div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Thông tin kho</div>
              <div className={styles.itemRow} style={{ borderBottom: 'none', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Vị trí lưu trữ:</span>
                <strong>{selectedProduct.location}</strong>
              </div>
              <div className={styles.itemRow} style={{ borderBottom: 'none', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tồn kho thực tế:</span>
                {getStockBadge(selectedProduct.status, selectedProduct.stock)}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Trạng thái đồng bộ (Đa sàn)</div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {selectedProduct.platforms.map((platform, idx) => (
                  <div key={platform} className={styles.itemRow} style={{ padding: '16px', borderBottom: idx === selectedProduct.platforms.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                      <strong>{platform}</strong>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Đã đồng bộ</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                Lần cuối: {selectedProduct.lastUpdated}
              </div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedProduct(null)}>Đóng</button>
              <button className="btn btn-primary" style={{ flex: 1 }}>Sửa & Đồng bộ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
