# 21. Vận hành, bảo mật và phát hành

## Mục tiêu và phạm vi

Giữ hệ thống quan sát được, khôi phục được và giới hạn thiệt hại khi model/worker/sàn lỗi. Đây là công việc xuyên suốt 01–20, không phải agent riêng. Code ở các điểm vào API, worker và module dùng chung thực sự có nhu cầu; không dựng một hệ thống giám sát tùy biến nếu công cụ triển khai đã đáp ứng.

## Môi trường và cấu hình

1. Tách database/schema và credential dev/test/production. Demo và live có mode từ server và dữ liệu/cửa hàng tách biệt; tốt nhất test/demo không có network credential live.
2. Tạo hướng dẫn local với web, API, worker, PostgreSQL và Redis, qua Docker Compose hoặc dịch vụ tương đương. Migrations chạy trước worker; readiness chỉ đạt khi DB/schema và queue cần thiết hoạt động.
3. `.env.example` chỉ có tên biến và placeholder: DB/Redis URL, encryption key reference, AI provider key, model config, Shopee app/callback config, asset storage và mode. Không in `.env`, request auth header, token refresh hoặc khóa mã hóa vào log.
4. Web deploy riêng không tự làm worker chạy. API/worker cần môi trường process nền thích hợp, health check, graceful shutdown và restart. Ghi rõ nơi chạy từng process, phiên bản Node/DB/Redis và cách cấp secret trong runbook.
5. Chốt bộ phiên bản sau khi được phép thêm dependency; giữ lockfile. Migration phát hành dùng phương án thêm trường tương thích trước rồi chuyển consumer, chưa xóa trường còn run/checkpoint cũ sử dụng.

## Logs, metrics và audit

Log cấu trúc chứa correlation/run/step/action ID, tenant ID, event code, attempt, elapsed, trạng thái và error code đã lọc. Tách audit nghiệp vụ cần lưu bền khỏi log debug có vòng đời ngắn. Không lưu full prompt/output có PII mặc định; lưu artifact nghiệp vụ cần xem theo quyền.

Metrics tối thiểu: queue age, outbox pending age, worker heartbeat, số run waiting/failed, retry count, timeout rate, model calls/tokens/cost theo tenant, số external unknown, sync lag, unsupported claims blocked, tỷ lệ task được xử lý. Không dùng tenant tên/email làm nhãn metric công khai.

Ngưỡng cảnh báo khởi đầu đề xuất: outbox cũ hơn 60 giây, hàng đợi hơn 5 phút, external unknown phát sinh, worker mất heartbeat quá 2 lease, tenant dùng 80% ngân sách. Đây là cấu hình thử nghiệm, điều chỉnh sau load test. Gom lỗi cùng nguyên nhân; không gửi một cảnh báo cho mỗi đơn khi chỉ một store mất kết nối.

## Ranh giới bảo mật cần kiểm thử

| Ranh giới | Kiểm soát |
|---|---|
| HTTP/user | Authentication, membership/permission, CSRF khi dùng cookie, giới hạn body/rate |
| DB/cache/checkpoint/vector nếu thêm | Tenant trong query/key, object authorization trước trả nội dung, kiểm thử A/B |
| LLM input | Tối thiểu hóa PII, không có secret, input là dữ liệu không phải instruction |
| Tool | Schema/allowlist/permission, không SQL/shell/fetch tùy ý, budget gọi |
| Sàn | Credential mã hóa, OAuth state, chữ ký webhook, chống replay, scope capability |
| Asset/source URL | Chống SSRF kể cả redirect/DNS đổi địa chỉ, loại mạng nội bộ, giới hạn tải và giải nén |
| UI | Escape output, không render HTML từ model/review, link do server tạo, quyền kiểm tra ở server |

Retention phải được chủ dữ liệu chốt theo loại dữ liệu trước production. Đề xuất cấu hình riêng cho message, artifact, raw review và audit; việc xóa dữ liệu cần xử lý cả cache/index/checkpoint/backup theo chính sách. Không cho model hoặc worker tự quyết định xóa dữ liệu người dùng. Chưa có chính sách thì ghi rõ blocker phát hành phần thu thập dữ liệu tương ứng.

## Hiệu năng và ngân sách

- API tiếp nhận job không chờ LLM/sàn; mục tiêu đề xuất p95 dưới 500 ms trong tải local kiểm soát, công bố cấu hình máy và cỡ mẫu khi đo. Không coi đây là SLA production đã đạt.
- Bắt đầu concurrency AI 2/run và giới hạn theo tenant; queue đơn có budget riêng để không bị tenant gọi AI nhiều làm nghẽn.
- Deadline/call cap của 03 bao gồm retry; dispatcher có retry budget riêng cho delivery, không nhân chi phí model vô hạn.
- Cache theo snapshot/version, chỉ chạy node được chọn; đo tỷ lệ hit, không dùng cache vượt quyền hoặc bỏ policy.
- Không chọn model đắt nhất mặc định. Đổi model chỉ sau eval cùng bộ dữ liệu và giữ version cũ cho truy nguyên.

## Khôi phục và phát hành từng bước

1. Seed fixture demo và chạy toàn bộ 22 trên môi trường sạch. Lưu backup và thử restore trên môi trường cô lập trước khi mở live.
2. Chạy live read-only trên store được phép để xác minh capability, mapping và đồng bộ dữ liệu; chưa bật autoPublish.
3. Bật nháp/duyệt người, thực hiện một listing được cho phép và đối soát. Ghi evidence không có bí mật.
4. Bật autoPublish cho một product/store, limit thấp do OWNER đặt; theo dõi policy decision, unknown và task. Không tự tăng giới hạn.
5. Khi lỗi: tắt autoPublish/dispatch theo phạm vi, dừng nhận job mới ở worker cần thiết, giữ outbox/run. Đối soát action dispatching/unknown trước khi replay; không xóa hàng đợi rồi tạo tất cả lại.
6. Rollback app code chỉ tới phiên bản hiểu schema/checkpoint đang dùng; giữ worker cũ cho run version cũ nếu cần. Migration phá hủy dữ liệu cần kế hoạch và xác nhận riêng.

## Test vận hành

OPS01 kill worker tại checkpoint và trước/sau dispatch; OPS02 mất Redis rồi phục hồi; OPS03 model rate limit/quota hết; OPS04 DB failover hoặc connection loss trong transaction; OPS05 token refresh lỗi; OPS06 restore DB test rồi đối soát action unknown; OPS07 regex canary secret/PII không xuất hiện trong logs; OPS08 tenant gây nhiều job không chặn queue đơn; OPS09 feature flag tắt không mất dữ liệu.

Hoàn thành khi có runbook người khác làm theo được, backup restore có bằng chứng, cảnh báo thử đến đúng nơi được cấu hình và phần live/demo được báo riêng. Không gửi email/tin nhắn ra ngoài nếu chưa cấu hình và được phép cho kênh đó.
