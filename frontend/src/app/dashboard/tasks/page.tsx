"use client";

import styles from "./page.module.css";
import { useState } from "react";

export default function TasksPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Việc cần duyệt & Xử lý</h1>
        <button className="btn btn-secondary">Đánh dấu đã đọc tất cả</button>
      </div>

      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${activeFilter === "all" ? styles.active : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          Tất cả (3)
        </button>
        <button 
          className={`${styles.filterBtn} ${activeFilter === "ai" ? styles.active : ""}`}
          onClick={() => setActiveFilter("ai")}
        >
          AI Đề xuất (2)
        </button>
        <button 
          className={`${styles.filterBtn} ${activeFilter === "error" ? styles.active : ""}`}
          onClick={() => setActiveFilter("error")}
        >
          Lỗi đồng bộ (1)
        </button>
      </div>

      <div className={styles.taskList}>
        
        {/* Task 1 */}
        <div className={styles.taskCard}>
          <div className={`${styles.taskIcon} ${styles.ai}`}>✨</div>
          <div className={styles.taskContent}>
            <div className={styles.taskHeader}>
              <div>
                <div className={styles.taskTitle}>AI đã tạo nội dung: Cà phê Rang Xay Nguyên Chất 250g</div>
                <div className={styles.taskMeta}>Phát sinh: 30 phút trước • Cửa hàng: Shopee Tech Startup</div>
              </div>
              <span className="badge badge-default">Cần duyệt đăng</span>
            </div>
            
            <div className={styles.taskDiff}>
              <div><strong>Tiêu đề:</strong></div>
              <div><span className={styles.diffRemoved}>Cà phê đen 250g</span></div>
              <div style={{ marginBottom: '8px' }}><span className={styles.diffAdded}>Cà phê Rang Xay Nguyên Chất 250g - Chuẩn Vị Đậm Đà (Robusta)</span></div>
              
              <div><strong>Hashtag đề xuất:</strong></div>
              <div><span className={styles.diffAdded}>#capherangxay #caphenguyenchat #robusta #cafe</span></div>
            </div>

            <div className={styles.taskActions}>
              <button className="btn btn-primary">Duyệt và Đăng lên Shopee</button>
              <button className="btn btn-secondary">Chỉnh sửa thủ công</button>
              <button className="btn btn-secondary">Từ chối</button>
            </div>
          </div>
        </div>

        {/* Task 2 */}
        <div className={styles.taskCard}>
          <div className={`${styles.taskIcon} ${styles.warning}`}>⚠️</div>
          <div className={styles.taskContent}>
            <div className={styles.taskHeader}>
              <div>
                <div className={styles.taskTitle}>Shopee từ chối bài đăng: Trà Ô Long Cao Cấp 500g</div>
                <div className={styles.taskMeta}>Phát sinh: 2 giờ trước • Mã SKU: TEA-OL-01</div>
              </div>
              <span className="badge badge-error">Lỗi thuộc tính</span>
            </div>
            
            <div className={styles.taskDiff}>
              <div style={{ color: 'var(--error)' }}>
                <strong>Lý do từ chối:</strong> Bắt buộc phải có thuộc tính "Thương hiệu". Hiện tại sản phẩm đang để trống.
              </div>
            </div>

            <div className={styles.taskActions}>
              <button className="btn btn-primary">Bổ sung thuộc tính</button>
              <button className="btn btn-secondary">Xóa bài đăng</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
