"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { use, useState } from "react";

interface ContentOutput {
  title: string;
  description: string;
  highlights: string[];
  claims: Array<{
    text: string;
    outputPath: string;
    sourceRefs: string[];
  }>;
  missingFacts: string[];
  warnings: string[];
  snapshotVersion: number;
  generatedBy: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);

  const [product, setProduct] = useState({
    id: unwrappedParams.id || "TEA-OL-01",
    sku: "TEA-OL-01",
    title: "Trà Ô Long Cao Cấp 500g",
    brand: "An Nhiên Tea",
    desc: "Trà Ô Long được hái tay từ những búp trà tươi ngon nhất, sấy lạnh giữ nguyên hương vị tự nhiên. Phù hợp làm quà biếu hoặc sử dụng hàng ngày.",
    stock: 120,
    price: "250.000đ",
    revenue: "15.5M",
    weightGrams: 500,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [contentResult, setContentResult] = useState<ContentOutput | null>(null);
  const [applied, setApplied] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setApplied(false);

    try {
      const res = await fetch("/api/ai/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: {
            id: product.id,
            version: 1,
            hash: "hash_tea_01",
            title: product.title,
            brand: product.brand,
            language: "vi",
            variants: [
              {
                sku: product.sku,
                name: "Hộp 500g",
                price: 250000,
                weightGrams: product.weightGrams,
              },
            ],
            specifications: {
              origin: "Bảo Lộc, Lâm Đồng",
              harvest_type: "Hái tay 1 tôm 2 lá",
            },
          },
          sellerInstructions: "Viết chuẩn SEO People-First, làm nổi bật nguồn gốc tự nhiên và hương vị thanh ngọt.",
          mode: "demo",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Tạo nội dung thất bại");
      }

      setContentResult(json.data);
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyContent = () => {
    if (!contentResult) return;
    setProduct((prev) => ({
      ...prev,
      title: contentResult.title,
      desc: contentResult.description,
    }));
    setApplied(true);
  };

  return (
    <div className={styles.container}>
      <Link href="/dashboard/products" className={styles.backLink}>
        ← Quay lại danh sách sản phẩm
      </Link>

      {/* Hero Header */}
      <div className={styles.headerCard}>
        <div className={styles.imageSection}>🍵</div>
        <div className={styles.infoSection}>
          <div className={styles.skuBadge}>SKU: {product.sku}</div>
          <h1 className={styles.title} id="product-display-title">{product.title}</h1>
          <p className={styles.desc} id="product-display-desc">{product.desc}</p>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Tồn kho hiện tại</span>
              <span className={styles.statValue}>{product.stock}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Giá bán lẻ</span>
              <span className={styles.statValue}>{product.price}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Doanh thu ước tính</span>
              <span className={`${styles.statValue} ${styles.highlight}`}>{product.revenue}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Platform Sync Status */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🌐 Trạng thái Đồng bộ Sàn</h2>
          <div className={styles.platformList}>
            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: "#f97316" }}>🛍️</div>
                <div>
                  <div className={styles.platformName}>Shopee (Tech Startup VN)</div>
                  <div className={styles.syncWarning}>
                    <span className="animate-pulse">⚠️</span> Cần cập nhật mô tả chuẩn SEO
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary">Khắc phục</button>
            </div>

            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: "#06b6d4" }}>🎵</div>
                <div>
                  <div className={styles.platformName}>TikTok Shop</div>
                  <div className={styles.syncSuccess}>
                    <span>✓</span> Đã đồng bộ 5 phút trước
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary" disabled>Đồng bộ lại</button>
            </div>

            <div className={styles.platformItem}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon} style={{ color: "#3b82f6" }}>💙</div>
                <div>
                  <div className={styles.platformName}>Lazada</div>
                  <div className={styles.syncSuccess}>
                    <span>✓</span> Đã đồng bộ 2 giờ trước
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary" disabled>Đồng bộ lại</button>
            </div>
          </div>
        </div>

        {/* AI Content Optimization (Block 05 People-First SEO Writer) */}
        <div className={styles.card} id="ai-content-studio-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              <span className={styles.aiGlow}>✨ People-First SEO Writer</span>
            </h2>
            <button
              id="btn-generate-seo"
              className="btn btn-primary"
              onClick={handleGenerateContent}
              disabled={isGenerating}
              style={{
                background: "linear-gradient(135deg, #a855f7, #6366f1)",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                padding: "8px 16px",
              }}
            >
              {isGenerating ? "⏳ Đang tạo..." : "✨ AI Tạo bài chuẩn SEO"}
            </button>
          </div>

          {generationError && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", fontSize: "13px", marginBottom: "16px" }}>
              ⚠️ Lỗi: {generationError}
            </div>
          )}

          {applied && (
            <div id="apply-success-alert" style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: "8px", color: "#6ee7b7", fontSize: "13px", marginBottom: "16px" }}>
              ✅ Đã áp dụng bài viết chuẩn SEO vào hồ sơ sản phẩm thành công!
            </div>
          )}

          {!contentResult && !isGenerating && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "12px" }}>
              Bấm nút <strong>"✨ AI Tạo bài chuẩn SEO"</strong> ở trên để AI kích hoạt tác nhân biên tập People-First SEO, đối soát các sự thật (facts) và tạo bản nháp.
            </div>
          )}

          {isGenerating && (
            <div style={{ padding: "32px", textAlign: "center", color: "#c084fc", fontSize: "14px" }}>
              <div className="animate-pulse" style={{ fontSize: "24px", marginBottom: "12px" }}>🤖</div>
              AI đang phân tích hồ sơ sự thật (facts) và soạn thảo tiêu đề, mô tả chuẩn Google Search Central...
            </div>
          )}

          {contentResult && !isGenerating && (
            <div className={styles.diffBox} id="ai-result-box">
              <h4>Tiêu đề đề xuất (SEO Title)</h4>
              <div>
                <span className={styles.diffRemoved}>{product.title}</span>
              </div>
              <div style={{ marginTop: "4px" }}>
                <span className={styles.diffAdded} id="ai-generated-title">{contentResult.title}</span>
              </div>

              <div style={{ margin: "16px 0", borderTop: "1px dashed rgba(255,255,255,0.1)" }}></div>

              <h4>Mô tả sản phẩm (Helpful & Original Content)</h4>
              <p style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }} id="ai-generated-desc">
                {contentResult.description}
              </p>

              {contentResult.highlights && contentResult.highlights.length > 0 && (
                <>
                  <div style={{ margin: "16px 0", borderTop: "1px dashed rgba(255,255,255,0.1)" }}></div>
                  <h4>Điểm nổi bật (Highlights)</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {contentResult.highlights.map((h, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>{h}</li>
                    ))}
                  </ul>
                </>
              )}

              {contentResult.claims && contentResult.claims.length > 0 && (
                <>
                  <div style={{ margin: "16px 0", borderTop: "1px dashed rgba(255,255,255,0.1)" }}></div>
                  <h4>Đối soát sự thật (Grounded Fact Claims)</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {contentResult.claims.map((claim, i) => (
                      <div key={i} style={{ fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>📌 {claim.text}</span>
                        <span style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "11px" }}>
                          ✓ {claim.sourceRefs.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {contentResult.warnings && contentResult.warnings.length > 0 && (
                <div style={{ marginTop: "16px", padding: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", borderRadius: "8px", color: "#fcd34d", fontSize: "12px" }}>
                  ⚠️ Cảnh báo: {contentResult.warnings.join("; ")}
                </div>
              )}

              <div className={styles.actionRow} style={{ marginTop: "20px" }}>
                <button
                  id="btn-apply-seo"
                  className="btn btn-primary"
                  onClick={handleApplyContent}
                  disabled={applied}
                  style={{ background: applied ? "#10b981" : "linear-gradient(135deg, #10b981, #059669)", border: "none" }}
                >
                  {applied ? "✓ Đã áp dụng vào sản phẩm" : "Áp dụng & Phê duyệt bài đăng"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
