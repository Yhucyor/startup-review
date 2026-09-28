"use client";

import styles from "./page.module.css";
import { useState } from "react";

export default function AICopilotPage() {
  const [inputText, setInputText] = useState("");

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className="gradient-text-accent">AI Copilot</span>
        </h1>
        <p className={styles.subtitle}>Trợ lý thông minh điều phối và quản lý bán hàng đa sàn.</p>
      </div>

      <div className={styles.chatArea}>
        <div className={styles.messages}>
          
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={`${styles.avatar} ${styles.ai}`}>AI</div>
            <div className={styles.bubble}>
              Xin chào! Hôm nay tôi đã giúp bạn đồng bộ 12 đơn hàng và chuẩn bị 2 bản nháp nội dung sản phẩm.
              <br /><br />
              Hiện tại có <strong>3 công việc cần bạn duyệt</strong> (1 lỗi đồng bộ và 2 bản nháp). Bạn muốn xem chi tiết công việc nào?
            </div>
          </div>

          <div className={`${styles.message} ${styles.user}`}>
            <div className={`${styles.avatar} ${styles.user}`}>N</div>
            <div className={styles.bubble}>
              Tại sao bài đăng Trà Ô Long lại bị từ chối trên Shopee?
            </div>
          </div>

          <div className={`${styles.message} ${styles.ai}`}>
            <div className={`${styles.avatar} ${styles.ai}`}>AI</div>
            <div className={styles.bubble}>
              Bài đăng <strong>Trà Ô Long Cao Cấp 500g (SKU: TEA-OL-01)</strong> bị Shopee từ chối vì thiếu thuộc tính bắt buộc <code>Thương hiệu</code> theo quy định mới của danh mục "Đồ Uống". 
              <br /><br />
              Tôi đã tạo sẵn công việc để bạn bổ sung thuộc tính này. <a href="/dashboard/tasks" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Nhấp vào đây</a> để bổ sung và tôi sẽ tự động đăng lại bài.
            </div>
          </div>

        </div>

        <div className={styles.suggestions}>
          <div className={styles.suggestionBadge}>Sản phẩm nào sắp hết hàng?</div>
          <div className={styles.suggestionBadge}>Hôm nay bán được bao nhiêu đơn?</div>
          <div className={styles.suggestionBadge}>Liệt kê việc cần duyệt</div>
        </div>

        <div className={styles.inputArea}>
          <textarea 
            className={styles.input} 
            placeholder="Hỏi AI hoặc yêu cầu công việc mới..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button className={styles.sendBtn}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
