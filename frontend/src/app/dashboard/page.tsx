"use client";

import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Xin chào, Nam! 👋</h1>
          <p className={styles.subtitle}>Cập nhật lần cuối: Vừa xong</p>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-secondary">Xem đơn hàng</button>
          <button className="btn btn-primary">+ Thêm sản phẩm</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span>Đơn mới hôm nay</span>
            <span className="badge badge-success">Thực tế</span>
          </div>
          <div className={styles.statValue}>12</div>
          <div className={styles.statFooter}>+2 so với hôm qua</div>
        </div>

        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span>Sản phẩm sắp hết</span>
            <span className="badge badge-warning">Cảnh báo</span>
          </div>
          <div className={styles.statValue}>3</div>
          <div className={styles.statFooter}>Cần nhập thêm hàng</div>
        </div>

        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span>Bài đăng lỗi</span>
            <span className="badge badge-error">Cần xử lý</span>
          </div>
          <div className={styles.statValue}>1</div>
          <div className={styles.statFooter}>Shopee từ chối nội dung</div>
        </div>

        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span>Kết nối cửa hàng</span>
            <span className="badge badge-success">Ổn định</span>
          </div>
          <div className={styles.statValue}>1/1</div>
          <div className={styles.statFooter}>Shopee kết nối bình thường</div>
        </div>
      </div>

      <div className={styles.dashboardContent}>
        {/* Task List */}
        <div className={`glass-panel ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Việc cần duyệt & Xử lý (3)</h2>
          <div className={styles.taskList}>
            
            <div className={styles.taskItem}>
              <div className={`${styles.taskIcon} ${styles.ai}`}>✨</div>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle}>AI đã chuẩn bị xong bản nháp: Cà phê Rang Xay 250g</div>
                <div className={styles.taskDesc}>
                  AI đã phân tích ảnh và tối ưu tiêu đề, mô tả chuẩn SEO cho Shopee. Cần bạn duyệt trước khi đăng bài.
                </div>
                <div className={styles.taskAction}>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Xem & Duyệt
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.taskItem}>
              <div className={`${styles.taskIcon} ${styles.urgent}`}>⚠️</div>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle}>Lỗi đồng bộ sản phẩm: Trà Ô Long (SKU: TEA-OL-01)</div>
                <div className={styles.taskDesc}>
                  Thiếu thuộc tính bắt buộc "Thương hiệu" theo yêu cầu mới nhất của Shopee.
                </div>
                <div className={styles.taskAction}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Cập nhật thuộc tính
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.taskItem}>
              <div className={styles.taskIcon}>📦</div>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle}>Xác nhận: Có 2 đơn hàng mới từ Shopee</div>
                <div className={styles.taskDesc}>
                  App đã tự động trừ 2 sản phẩm khỏi tồn kho. Hãy kiểm tra và xác nhận đóng gói.
                </div>
                <div className={styles.taskAction}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Xem đơn hàng
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* AI Copilot Status */}
        <div className={`glass-panel ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Hoạt động AI gần đây</h2>
          <div className={styles.taskList}>
            <div className={styles.taskItem} style={{ padding: '12px' }}>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle} style={{ fontSize: '13px' }}>Đồng bộ 12 đơn hàng</div>
                <div className={styles.taskDesc} style={{ fontSize: '12px' }}>Vừa xong • Không có lỗi</div>
              </div>
            </div>
            <div className={styles.taskItem} style={{ padding: '12px' }}>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle} style={{ fontSize: '13px' }}>Tạo bản nháp nội dung</div>
                <div className={styles.taskDesc} style={{ fontSize: '12px' }}>15 phút trước • Cà phê Rang Xay 250g</div>
              </div>
            </div>
            <div className={styles.taskItem} style={{ padding: '12px' }}>
              <div className={styles.taskInfo}>
                <div className={styles.taskTitle} style={{ fontSize: '13px' }}>Kiểm tra lỗi tồn kho</div>
                <div className={styles.taskDesc} style={{ fontSize: '12px' }}>1 giờ trước • Cảnh báo 3 sản phẩm hết hàng</div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              Hỏi Trợ Lý AI 🤖
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
