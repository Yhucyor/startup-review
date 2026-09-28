"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Vui lòng nhập một email hợp lệ.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className={styles.container}>
      
      {/* Left side: Futuristic Sci-Fi Intro */}
      <div className={styles.introSection}>
        <div className={styles.gridOverlay}></div>
        <div className={styles.scanner}></div>
        
        {/* Holographic AI Core Effect */}
        <div className={styles.aiCore}>
          
          {/* Orbiting Platforms */}
          <div className={styles.orbitContainer}>
            <div className={`${styles.platformNode} ${styles.nodeShopee}`}>
              <div className={styles.platformInner}>
                <span style={{ fontSize: '24px' }}>🛍️</span>
                <span style={{ fontSize: '9px' }}>Shopee</span>
              </div>
            </div>
            
            <div className={`${styles.platformNode} ${styles.nodeTiktok}`}>
              <div className={styles.platformInner}>
                <span style={{ fontSize: '24px', filter: 'drop-shadow(2px 2px 0px #ff0050)' }}>🎵</span>
                <span style={{ fontSize: '9px' }}>TikTok</span>
              </div>
            </div>
            
            <div className={`${styles.platformNode} ${styles.nodeLazada}`}>
              <div className={styles.platformInner}>
                <span style={{ fontSize: '24px' }}>💙</span>
                <span style={{ fontSize: '9px' }}>Lazada</span>
              </div>
            </div>
            
            <div className={`${styles.platformNode} ${styles.nodeFb}`}>
              <div className={styles.platformInner}>
                <span style={{ fontSize: '24px' }}>🌐</span>
                <span style={{ fontSize: '9px' }}>Facebook</span>
              </div>
            </div>
          </div>

          <div className={`${styles.ring} ${styles.ring3}`}></div>
          <div className={`${styles.ring} ${styles.ring2}`}></div>
          <div className={`${styles.ring} ${styles.ring1}`}></div>
          <div className={styles.orb}></div>
        </div>

        <div className={styles.introContent}>
          <h1 className={styles.introTitle}>AI NATIVE<br/>COPILOT</h1>
          <p className={styles.introDesc}>
            Kích hoạt hệ thống mạng nơ-ron nhân tạo. Tự động hóa quy trình quản lý, tối ưu hoá danh mục và điều phối kinh doanh đa nền tảng với tốc độ tương lai.
          </p>
        </div>
      </div>

      {/* Right side: Cyberpunk style Auth Form */}
      <div className={styles.authSection}>
        <div className={`animate-fade-in ${styles.loginCard}`}>
          
          <div className={styles.header}>
            <div className={styles.logo}>
              HỆ THỐNG VẬN HÀNH
            </div>
            <p className={styles.subtitle}>
              Xác thực truy cập không gian làm việc
            </p>
          </div>

          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${isLogin ? styles.active : ""}`}
              onClick={() => { setIsLogin(true); setError(""); }}
              type="button"
            >
              Đăng nhập
            </button>
            <button 
              className={`${styles.tab} ${!isLogin ? styles.active : ""}`}
              onClick={() => { setIsLogin(false); setError(""); }}
              type="button"
            >
              Đăng ký
            </button>
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="email" style={{color: 'rgba(255,255,255,0.7)'}}>MÃ ĐỊNH DANH (EMAIL)</label>
              <input 
                id="email"
                type="email" 
                className={`input-field ${styles.passwordInput}`}
                placeholder="system@corp.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password" style={{color: 'rgba(255,255,255,0.7)'}}>MÃ BẢO MẬT</label>
              <div className={styles.passwordWrapper}>
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  className={`input-field ${styles.passwordInput}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "ẨN" : "HIỆN"}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading}
              style={{ color: 'white', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <span>ĐANG XÁC THỰC...</span>
              ) : (
                <span>{isLogin ? "BẮT ĐẦU KẾT NỐI" : "KHỞI TẠO TÀI KHOẢN"}</span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
