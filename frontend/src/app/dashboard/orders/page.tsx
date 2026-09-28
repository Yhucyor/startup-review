"use client";

import styles from "./page.module.css";

const MOCK_ORDERS = [
  { id: "ORD-2026-001", platform: "Shopee", date: "28/09/2026 14:30", items: 2, total: "170.000 ₫", status: "Chờ lấy hàng" },
  { id: "ORD-2026-002", platform: "Shopee", date: "28/09/2026 10:15", items: 1, total: "200.000 ₫", status: "Đang giao" },
  { id: "ORD-2026-003", platform: "Shopee", date: "27/09/2026 18:45", items: 5, total: "425.000 ₫", status: "Hoàn thành" },
];

export default function OrdersPage() {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Đơn hàng (Shopee)</h1>
        <button className="btn btn-secondary">Xuất báo cáo CSV</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Mã Đơn</th>
              <th className={styles.th}>Thời gian</th>
              <th className={styles.th}>Sản phẩm</th>
              <th className={styles.th}>Tổng tiền</th>
              <th className={styles.th}>Trạng thái</th>
              <th className={styles.th}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map((order) => (
              <tr key={order.id} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.orderId}>{order.id}</div>
                  <div className={styles.orderPlatform}>{order.platform}</div>
                </td>
                <td className={styles.td}>{order.date}</td>
                <td className={styles.td}>{order.items} mặt hàng</td>
                <td className={styles.td}>{order.total}</td>
                <td className={styles.td}>
                  <span className={`badge ${
                    order.status === "Hoàn thành" ? "badge-success" : 
                    order.status === "Chờ lấy hàng" ? "badge-warning" : "badge-default"
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className={styles.td}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
