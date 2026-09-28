"use client";

import styles from "./page.module.css";
import { useState } from "react";

const INITIAL_INVENTORY = [
  { id: 1, name: "Cà phê Rang Xay 250g", sku: "CF-250G", stock: 120, lowStock: 20, syncStatus: "Đồng bộ" },
  { id: 2, name: "Trà Ô Long 500g", sku: "TEA-OL-01", stock: 15, lowStock: 20, syncStatus: "Đang đồng bộ" },
  { id: 3, name: "Hạt Điều Rang Muối", sku: "NUT-01", stock: 0, lowStock: 10, syncStatus: "Lỗi đồng bộ" },
];

export default function InventoryPage() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Tồn kho & Giá</h1>
        <button className="btn btn-primary">Lưu thay đổi</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Sản phẩm / Biến thể (SKU)</th>
              <th className={styles.th}>Số lượng có thể bán</th>
              <th className={styles.th}>Ngưỡng cảnh báo thấp</th>
              <th className={styles.th}>Trạng thái đồng bộ (Sàn)</th>
              <th className={styles.th}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.skuName}>{item.name}</div>
                  <div className={styles.skuCode}>{item.sku}</div>
                </td>
                <td className={styles.td}>
                  <input 
                    type="number" 
                    className={styles.stockInput} 
                    value={item.stock} 
                    onChange={(e) => {
                      const newInventory = [...inventory];
                      const idx = newInventory.findIndex(i => i.id === item.id);
                      newInventory[idx].stock = Number(e.target.value);
                      setInventory(newInventory);
                    }}
                  />
                </td>
                <td className={styles.td}>{item.lowStock}</td>
                <td className={styles.td}>
                  <span className={`badge ${
                    item.syncStatus === "Đồng bộ" ? "badge-success" : 
                    item.syncStatus === "Lỗi đồng bộ" ? "badge-error" : "badge-warning"
                  }`}>
                    {item.syncStatus}
                  </span>
                </td>
                <td className={styles.td}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Thử đồng bộ lại
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
