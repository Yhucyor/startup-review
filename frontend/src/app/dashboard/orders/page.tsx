"use client";

import { useState } from "react";
import styles from "./page.module.css";

const MOCK_ORDERS = [
  {
    id: "ORD-SP-9821",
    platform: "Shopee",
    date: "28/10/2026 14:30",
    customer: "Nguyễn Văn A",
    total: "450.000đ",
    status: "new",
    items: [
      { name: "Áo thun nam Basic", qty: 2, price: "150.000đ" },
      { name: "Quần Short Kaki", qty: 1, price: "150.000đ" }
    ],
    address: "123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
    notes: "Giao trong giờ hành chính"
  },
  {
    id: "ORD-TZ-5512",
    platform: "TikTok Shop",
    date: "28/10/2026 10:15",
    customer: "Trần Thị B",
    total: "890.000đ",
    status: "processing",
    items: [
      { name: "Giày Sneaker Thời Trang", qty: 1, price: "890.000đ" }
    ],
    address: "45 Ngõ 200, Thái Hà, Đống Đa, Hà Nội",
    notes: ""
  },
  {
    id: "ORD-LZ-1102",
    platform: "Lazada",
    date: "27/10/2026 16:45",
    customer: "Lê Văn C",
    total: "210.000đ",
    status: "completed",
    items: [
      { name: "Cốc giữ nhiệt", qty: 1, price: "210.000đ" }
    ],
    address: "Khu công nghệ cao, TP Thủ Đức, TP.HCM",
    notes: "Nhờ bưu tá gọi trước khi giao"
  }
];

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_ORDERS[0] | null>(null);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'new': return <span className={`${styles.statusBadge} ${styles['status-new']}`}>Chờ xác nhận</span>;
      case 'processing': return <span className={`${styles.statusBadge} ${styles['status-processing']}`}>Đang xử lý</span>;
      case 'completed': return <span className={`${styles.statusBadge} ${styles['status-completed']}`}>Đã hoàn thành</span>;
      default: return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Đơn hàng</h1>
          <p className={styles.subtitle}>Danh sách đơn hàng đồng bộ từ các sàn</p>
        </div>
        <button className="btn btn-primary">Xuất danh sách</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Mã Đơn / Sàn</th>
              <th className={styles.th}>Ngày tạo</th>
              <th className={styles.th}>Khách hàng</th>
              <th className={styles.th}>Tổng tiền</th>
              <th className={styles.th}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map(order => (
              <tr key={order.id} className={styles.tr} onClick={() => setSelectedOrder(order)}>
                <td className={styles.td}>
                  <div className={styles.orderId}>{order.id}</div>
                  <div className={styles.orderPlatform}>{order.platform}</div>
                </td>
                <td className={styles.td}>{order.date}</td>
                <td className={styles.td}>{order.customer}</td>
                <td className={styles.td}>{order.total}</td>
                <td className={styles.td}>{getStatusBadge(order.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel Drawer */}
      {selectedOrder && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedOrder(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>Chi tiết đơn {selectedOrder.id}</div>
              <button className={styles.closeBtn} onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Nguồn đơn</div>
              <div className={styles.detailValue}>{selectedOrder.platform}</div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Thông tin giao hàng</div>
              <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                <strong>{selectedOrder.customer}</strong><br/>
                {selectedOrder.address}<br/>
                {selectedOrder.notes && <em style={{color: 'var(--warning)'}}>Lưu ý: {selectedOrder.notes}</em>}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Sản phẩm ({selectedOrder.items.length})</div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <span>{item.qty}x {item.name}</span>
                    <strong>{item.price}</strong>
                  </div>
                ))}
                <div className={styles.itemRow} style={{ border: 'none', paddingTop: '16px', marginTop: '8px', borderTop: '2px solid var(--border-color)' }}>
                  <span>Tổng thanh toán</span>
                  <strong style={{ fontSize: '18px', color: 'var(--accent-primary)' }}>{selectedOrder.total}</strong>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedOrder(null)}>Đóng</button>
              <button className="btn btn-primary" style={{ flex: 1 }}>In vận đơn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
