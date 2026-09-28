"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const navItems = [
  { label: "Tổng quan", path: "/dashboard", icon: "📊" },
  { label: "Việc cần duyệt", path: "/dashboard/tasks", icon: "✅" },
  { label: "Trợ lý AI", path: "/dashboard/ai", icon: "🤖" },
  { label: "Sản phẩm", path: "/dashboard/products", icon: "📦" },
  { label: "Đơn hàng", path: "/dashboard/orders", icon: "🛒" },
  { label: "Tồn kho", path: "/dashboard/inventory", icon: "📋" },
  { label: "Kết nối sàn", path: "/dashboard/integrations", icon: "🔗" },
  { label: "Cài đặt", path: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', marginBottom: '24px' }}>
          <Image 
            src="/logo.png" 
            alt="SYNCHRO.VN Logo" 
            width={180} 
            height={60} 
            style={{ objectFit: 'contain' }} 
            priority
          />
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                href={item.path} 
                key={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.workspace}>
            <span className={styles.workspaceName}>Doanh nghiệp: Tech Startup VN</span>
            <span className="badge badge-warning">Dùng thử</span>
          </div>
          <div className={styles.profile}>
            <span className={styles.notificationIcon}>🔔</span>
            <div className={styles.avatar}>A</div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
