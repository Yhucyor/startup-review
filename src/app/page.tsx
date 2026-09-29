"use client";

import Link from "next/link";
import styles from "./page.module.css";
import Particles from "./Particles";
import LogoOrbit from "./LogoOrbit";

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Space Background Elements */}
      <Particles />
      <div className={styles.starsContainer}>
        <div className={styles.stars}></div>
        <div className={`${styles.stars} ${styles.stars2}`}></div>
        <div className={`${styles.stars} ${styles.stars3}`}></div>
      </div>
      <div className={styles.nebulaOverlay}></div>

      {/* Top Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🚀</span> SYNCHRO.VN
          </div>
        </div>
        <div className={styles.navCenter}>
          <Link href="#" className={styles.navLink}>Trang chủ</Link>
          <Link href="#" className={styles.navLink}>Giải pháp ⏷</Link>
          <Link href="#" className={styles.navLink}>Bảng giá</Link>
          <Link href="#" className={styles.navLink}>Tài liệu</Link>
        </div>
        <div className={styles.navRight}>
          <button className={styles.searchBtn}>🔍</button>
          <Link href="/dashboard" className={styles.loginBtn}>Đăng nhập</Link>
          <Link href="/dashboard" className={styles.registerBtn}>Bắt đầu miễn phí</Link>
        </div>
      </nav>

      {/* Main Content Split */}
      <main className={styles.mainContent}>
        
        {/* Left Side: Text and CTA */}
        <div className={styles.leftSection}>
          <div className={styles.pillTag}>
            THẾ HỆ THƯƠNG MẠI ĐIỆN TỬ 4.0
          </div>
          
          <h1 className={styles.heroTitle}>
            Kết Nối Toàn Cầu,<br/>
            <span className={styles.heroTitleGradient}>Vươn Tầm Vũ Trụ</span>
          </h1>
          
          <p className={styles.heroDesc}>
            Giải pháp tích hợp đa nền tảng tối ưu cho doanh nghiệp. SYNCHRO.VN kết nối Shopee, Lazada, Tiki và TikTok Shop vào một hệ sinh thái duy nhất, giúp bạn quản lý dòng chảy dữ liệu quy mô toàn cầu.
          </p>

          <div className={styles.buttonGroup}>
            <Link href="/dashboard" className={styles.primaryBtn}>
              Bắt đầu ngay <span className={styles.arrow}>→</span>
            </Link>
            <button className={styles.secondaryBtn}>
              Xem demo kỹ thuật
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <h3 className={styles.statNumber}>500+</h3>
              <p className={styles.statLabel}>Đối tác lớn</p>
            </div>
            <div className={styles.statItem}>
              <h3 className={styles.statNumber}>99.9%</h3>
              <p className={styles.statLabel}>Thời gian hoạt động</p>
            </div>
          </div>
        </div>

        {/* Right Side: Orbital Graphic */}
        <div className={styles.rightSection}>
          <div className={styles.aiCore}>
            <LogoOrbit />
            <div className={`${styles.ring} ${styles.ring3}`}></div>
            <div className={`${styles.ring} ${styles.ring2}`}></div>
            <div className={`${styles.ring} ${styles.ring1}`}></div>
            <div className={styles.orb}></div>
          </div>
        </div>
      </main>
    </div>
  );
}
