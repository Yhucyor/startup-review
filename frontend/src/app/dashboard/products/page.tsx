"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MOCK_PRODUCTS = [
  { id: 1, name: "Cà phê Rang Xay Nguyên Chất 250g", sku: "CF-250G", price: "85.000 ₫", stock: 120, status: "Đang bán", posts: 1 },
  { id: 2, name: "Trà Ô Long Cao Cấp 500g", sku: "TEA-OL-01", price: "150.000 ₫", stock: 15, status: "Lỗi đồng bộ", posts: 1 },
  { id: 3, name: "Hạt Điều Rang Muối Bình Phước", sku: "NUT-01", price: "200.000 ₫", stock: 0, status: "Hết hàng", posts: 0 },
];

export default function ProductsPage() {
  const router = useRouter();
  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Sản phẩm</h1>
        <div className={styles.actions}>
          <button className="btn btn-secondary">Nhập CSV</button>
          <button className="btn btn-primary">+ Thêm Sản phẩm</button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input 
          type="text" 
          className={styles.search} 
          placeholder="Tìm kiếm theo tên sản phẩm, SKU..." 
        />
        <button className="btn btn-secondary">Lọc trạng thái</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Sản phẩm</th>
              <th className={styles.th}>Giá bán</th>
              <th className={styles.th}>Tồn kho</th>
              <th className={styles.th}>Trạng thái</th>
              <th className={styles.th}>Bài đăng sàn</th>
              <th className={styles.th}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PRODUCTS.map((prod) => (
              <tr key={prod.id} className={styles.tr} onClick={() => router.push(`/dashboard/products/${prod.id}`)} style={{ cursor: 'pointer' }}>
                <td className={styles.td}>
                  <div className={styles.productInfo}>
                    <div className={styles.productImage}>☕</div>
                    <div>
                      <div className={styles.productName}>{prod.name}</div>
                      <div className={styles.productSku}>{prod.sku}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>{prod.price}</td>
                <td className={styles.td}>{prod.stock}</td>
                <td className={styles.td}>
                  <span className={`badge ${
                    prod.status === "Đang bán" ? "badge-success" : 
                    prod.status === "Hết hàng" ? "badge-warning" : "badge-error"
                  }`}>
                    {prod.status}
                  </span>
                </td>
                <td className={styles.td}>{prod.posts} (Shopee)</td>
                <td className={styles.td}>
                  <Link href={`/dashboard/products/${prod.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
