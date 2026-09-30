# Pha 5: Tích hợp Orchestrator và Cơ chế chặn duyệt tự động

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Tích hợp tác nhân bản địa hóa hoàn chỉnh vào `PrepareListingOrchestrator`.
Thiết lập cơ chế thực thi chặn duyệt tự động tại các node hạ nguồn khi bản dịch cần kiểm tra lại.
Đảm bảo lệnh `retryStep` dọn dẹp sạch sẽ toàn bộ artifact cũ (gồm proposal cũ) theo nguyên tắc **Make Operations Idempotent**.

## Các tệp thay đổi

1. `src/ai/workflows/prepare-listing/orchestrator.ts`.
Tệp này cập nhật node `localization` để gọi `localizeContent`.
Tệp này phân loại lỗi: lỗi sai lệch số liệu hoặc tiền tệ ném ngoại lệ làm dừng workflow; lỗi thiếu chắc chắn về claim lưu kết quả với cờ `needsReview: true`.
Tệp này cập nhật node `assemble` và `policy`: nếu `localizationData.needsReview` hoặc `localizationData.experimental` là `true`, chính sách cấm tuyệt đối việc tự động duyệt (auto-approve), buộc chuyển trạng thái sang `waiting_approval` kèm danh sách cảnh báo rõ ràng.
Tệp này nâng cấp hàm `retryStep`: khi chạy lại bước `localization`, hàm xóa bỏ `localizationData`, `assembledData`, `reviewData` và `proposalData` cũ để tránh lưu vết proposal rác.

2. `src/ai/workflows/prepare-listing/types.ts`.
Tệp này mở rộng trực tiếp `LocalizationArtifact` với các trường `status`, `needsReview`, `experimental`, `claimMappings` và `warnings`.
Tệp này bổ sung cờ `requiresHumanReview` và mảng `blockingReasons` vào `ProposalArtifact`.

3. `tests/ai/prepare-listing.test.mjs`.
Tệp kiểm thử xác nhận hành vi downstream khi gặp trạng thái `needs_review`, và kiểm tra việc dọn sạch proposal cũ khi retry.

## Cơ chế thực thi chặn hạ nguồn (Downstream Blocking Enforcement)

1. **Phân loại xử lý tại node `localization`:**
- **Lỗi nghiêm trọng (Sai lệch số lượng, tự đổi tiền tệ):** Ném ngoại lệ. Workflow dừng lại ở trạng thái `failed`, lưu vết lỗi trong `state.error`.
- **Trường hợp nghi vấn (Claim chưa có nguồn chắc chắn, thuật ngữ mới):** Lưu artifact với `status: 'needs_review'` và `needsReview: true`. Workflow tiếp tục chạy để người dùng có đầy đủ bản nháp xem trước.

2. **Thực thi chặn tại node `policy`:**
Node `policy` không tự động duyệt bài đăng nếu xuất hiện một trong hai điều kiện:
- `artifacts.localizationData?.needsReview === true`.
- `artifacts.localizationData?.experimental === true`.
Trong trường hợp này, policy ghi đè quyết định duyệt tự động, gán `proposalData.requiresHumanReview = true`, gắn lý do chặn vào `warnings` và chuyển trạng thái sang `waiting_approval`.

3. **Cơ chế dọn dẹp khi retry (Clean Slate Retry):**
Hàm `retryStep(runId, 'localization', snapshot)` thực hiện xóa sạch toàn bộ artifact hạ nguồn:
```typescript
delete state.artifacts.localizationId;
delete state.artifacts.localizationData;
delete state.artifacts.assembledId;
delete state.artifacts.assembledData;
delete state.artifacts.reviewId;
delete state.artifacts.reviewData;
delete state.artifacts.proposalId;
delete state.artifacts.proposalData;
```

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck` và `npm run lint`.

**Kiểm tra động.**
1. Test LC06. Node `localization` lỗi trong lần đầu. Kết quả `content` và `keywords` được bảo toàn nguyên vẹn.
2. Test LC06b (Dọn dẹp proposal cũ). Workflow đã chạy hoàn tất tới bước tạo proposal trong lần chạy trước. Kích hoạt `retryStep('localization')` nhưng bản dịch lần này bị lỗi. Xác nhận `proposalData` cũ đã bị xóa sạch khỏi checkpointer, không còn tồn tại bản đề xuất lỗi thời.
3. Test LC09 (Chặn duyệt tự động). Bản dịch hoàn tất nhưng có cờ `needsReview: true` hoặc locale `experimental`. Xác nhận node `policy` không cấp quyền tự động duyệt, trạng thái cuối cùng dừng lại ở `waiting_approval` với cảnh báo hiển thị đầy đủ.
