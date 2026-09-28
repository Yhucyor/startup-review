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
    // Giả lập gọi API đăng nhập/đăng ký
    setTimeout(() => {
      setLoading(false);
      // Chuyển hướng sang màn hình Dashboard (M03) hoặc Chọn doanh nghiệp (M02)
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.loginCard}`}>
        
        <div className={styles.header}>
          <div className={`${styles.logo} gradient-text-accent animate-float`}>
            AI Commerce Copilot
          </div>
          <p className={styles.subtitle}>
            Nền tảng quản lý bán hàng đa sàn thông minh
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
            <label className="input-label" htmlFor="email">Địa chỉ Email</label>
            <input 
              id="email"
              type="email" 
              className="input-field" 
              placeholder="ten@doanhnghiep.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Mật khẩu</label>
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
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <span>{isLogin ? "Đăng Nhập" : "Tạo Tài Khoản"}</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
