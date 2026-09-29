"use client";

import React, { useState } from 'react';
import styles from './market.module.css';

export default function MarketEvaluationPage() {
  const [expandedCountry, setExpandedCountry] = useState<string | null>("TH");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Đánh giá & Chấm điểm thị trường</h1>
          <p className={styles.subtitle}>AI phân tích dữ liệu đa quốc gia, đối thủ cạnh tranh và nhu cầu để gợi ý chiến lược tối ưu.</p>
        </div>
        <button className="btn btn-primary">
          <span>✨</span> Cập nhật phân tích
        </button>
      </header>

      <div className={styles.grid}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Scoring Section */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span>🌍</span> Đề xuất quốc gia tiềm năng
              </h2>
            </div>
            
            <div className={styles.scoreList}>
              {/* Thailand */}
              <div className={styles.scoreItem}>
                <div className={styles.scoreTop}>
                  <div className={styles.countryInfo}>
                    <span className={styles.flag}>🇹🇭</span>
                    <span className={styles.countryName}>Thái Lan</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className={styles.scoreValue}>82/100</span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      onClick={() => setExpandedCountry(expandedCountry === "TH" ? null : "TH")}
                    >
                      {expandedCountry === "TH" ? "Đóng phân tích" : "Phân tích lý do"}
                    </button>
                  </div>
                </div>
                
                {expandedCountry === "TH" && (
                  <div className={`${styles.chartContainer} animate-fade-in`}>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Nhu cầu mua</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '85%' }}></div>
                      </div>
                      <span className={styles.chartValue}>85</span>
                    </div>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Cạnh tranh (thấp)</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '70%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
                      </div>
                      <span className={styles.chartValue}>70</span>
                    </div>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Mức giá phù hợp</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '90%' }}></div>
                      </div>
                      <span className={styles.chartValue}>90</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Malaysia */}
              <div className={styles.scoreItem}>
                <div className={styles.scoreTop}>
                  <div className={styles.countryInfo}>
                    <span className={styles.flag}>🇲🇾</span>
                    <span className={styles.countryName}>Malaysia</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className={styles.scoreValue}>69/100</span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      onClick={() => setExpandedCountry(expandedCountry === "MY" ? null : "MY")}
                    >
                      {expandedCountry === "MY" ? "Đóng phân tích" : "Phân tích lý do"}
                    </button>
                  </div>
                </div>

                {expandedCountry === "MY" && (
                  <div className={`${styles.chartContainer} animate-fade-in`}>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Nhu cầu mua</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '65%' }}></div>
                      </div>
                      <span className={styles.chartValue}>65</span>
                    </div>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Cạnh tranh (thấp)</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '50%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
                      </div>
                      <span className={styles.chartValue}>50</span>
                    </div>
                    <div className={styles.chartRow}>
                      <span className={styles.chartLabel}>Mức giá phù hợp</span>
                      <div className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ width: '85%' }}></div>
                      </div>
                      <span className={styles.chartValue}>85</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Go to market plan */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span>📝</span> Kế hoạch thâm nhập thị trường (Thái Lan)
              </h2>
              <span className="badge badge-success">AI Đề xuất</span>
            </div>
            <div className={styles.planList}>
              <div className={styles.planItem}>
                <div className={styles.planIcon}>🎯</div>
                <div className={styles.planContent}>
                  <h4>Khách hàng mục tiêu</h4>
                  <p>Nhóm Gen Z và Millennials (18-35 tuổi) ưa chuộng sản phẩm thân thiện môi trường, nhạy cảm với xu hướng mới trên mạng xã hội.</p>
                </div>
              </div>
              <div className={styles.planItem}>
                <div className={styles.planIcon}>💎</div>
                <div className={styles.planContent}>
                  <h4>Định vị & Mức giá</h4>
                  <p>Phân khúc tầm trung-cao. Giá đề xuất: <strong>350 THB - 450 THB</strong>. Tối ưu biên lợi nhuận sau phí vận chuyển nội địa.</p>
                </div>
              </div>
              <div className={styles.planItem}>
                <div className={styles.planIcon}>📢</div>
                <div className={styles.planContent}>
                  <h4>Thông điệp chiến dịch</h4>
                  <p>"Sống xanh, sống chất". Tập trung làm nổi bật thành phần tự nhiên và thiết kế tối giản trong ảnh bìa sản phẩm.</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Simulation */}
          <section className={`${styles.card} ${styles.simCard}`}>
            <div className={styles.cardHeader} style={{ marginBottom: '12px' }}>
              <h2 className={styles.cardTitle}>
                <span>🧪</span> Mô phỏng thị trường
              </h2>
              <span className={styles.simBadge}>PRO</span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              AI đang chạy A/B test nội dung trên các tệp khách hàng giả lập để đánh giá tỷ lệ chuyển đổi.
            </p>
            <div className={styles.simGroups}>
              <div className={styles.simGroup}>
                <div className={styles.simGroupName}>Nhóm nhạy cảm giá</div>
                <div className={styles.simGroupStat}>4.2%</div>
                <div className={styles.simGroupLabel}>Dự báo chuyển đổi</div>
              </div>
              <div className={styles.simGroup}>
                <div className={styles.simGroupName}>Nhóm chuộng chất lượng</div>
                <div className={styles.simGroupStat}>8.7%</div>
                <div className={styles.simGroupLabel}>Dự báo chuyển đổi</div>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px', background: 'rgba(255,255,255,0.7)', border: 'none', fontWeight: '600' }}>
              Xem chi tiết báo cáo Test
            </button>
          </section>

          {/* Knowledge Base */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span>🧠</span> Market Knowledge Base
              </h2>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Bài học được AI rút ra từ hàng ngàn review và câu hỏi của khách hàng trên sàn:
            </p>
            <div className={styles.kbList}>
              <div className={styles.kbItem}>
                <h4>Tại sao khách thường hủy đơn?</h4>
                <p>Khách Thái Lan rất quan tâm đến thời gian giao hàng. Các đơn dự kiến giao quá 5 ngày có tỷ lệ hủy lên đến 35%.</p>
              </div>
              <div className={styles.kbItem} style={{ borderLeftColor: 'var(--success)' }}>
                <h4>Điểm mua hàng (Buying Hook)</h4>
                <p>Nhiều khách để lại đánh giá 5 sao vì "Bao bì đẹp, có thiệp cảm ơn tiếng Thái". Yếu tố cá nhân hóa rất được ưa chuộng.</p>
              </div>
              <div className={styles.kbItem} style={{ borderLeftColor: 'var(--accent-primary)' }}>
                <h4>Câu hỏi thường gặp</h4>
                <p>Khách hàng Malaysia thường hỏi về "Chứng nhận Halal" trước khi mua các sản phẩm dùng trực tiếp lên da.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
