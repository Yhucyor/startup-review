# 22. Hướng dẫn kiểm thử và nghiệm thu

## Trạng thái hiện tại

Đây là kế hoạch viết test cùng lúc viết từng khối, không phải bộ test AI đã có. Tại lần đối chiếu cuối, repo có `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck` và `npm test` dùng Node test runner với `tests/**/*.mjs`. Tái sử dụng runner/test smoke hiện có. Chưa có các suite AI/backend/worker hoặc script `test:*` bên dưới; đây là hợp đồng cần bổ sung ở mốc A, không được báo chúng đã chạy trước khi có implementation.

Test smoke hiện tại chỉ kiểm tra phép tính và điều kiện môi trường luôn đúng; nó xác nhận runner chạy được, chưa chứng minh bất kỳ nghiệp vụ SaaS/AI nào. Cần thêm assertions hành vi dưới đây trước khi dùng kết quả CI để nghiệm thu.

## Chuẩn bị môi trường từ đầu

1. Đọc `AGENTS.md`, ghi phiên bản Node/npm đang dùng, giữ package manager và lockfile hiện tại. Đọc hướng dẫn Next.js trong `node_modules/next/dist/docs/` trước sửa UI.
2. Xin chấp thuận bộ dependency còn thiếu cho NestJS, driver/migration DB, BullMQ, LangGraph/checkpointer, AI SDK/provider và schema runtime. Chọn phiên bản cùng nhau; không cài thử ngầm trong lúc viết spec.
3. Tạo cấu hình chạy PostgreSQL/Redis riêng cho test và app local; DB test phải có tên/URL rõ là test. Harness từ chối reset nếu target không nằm trong allowlist test. Không reset DB production để chạy test.
4. Tạo migration tăng dần theo 01–02, rồi seed fixture dưới đây. Tài khoản test chỉ được sinh trong môi trường test/demo; không đưa credential thật vào tài liệu.
5. Tiếp tục dùng `node:test` và `node:assert/strict` cho unit/integration, không cần thêm framework chỉ cho assertions. Biên dịch file TypeScript test sang JavaScript bằng tsconfig test riêng rồi chạy Node test runner; path alias phải được cấu hình resolve hoặc tránh dùng alias trong test. Giữ test smoke `.mjs` đang có, không bắt chuyển định dạng khi chưa cần.
6. API và worker import cùng domain function; các test handler gọi qua HTTP và auth thật trong môi trường test, không chỉ gọi hàm với `role=OWNER` tự khai.
7. Fake model và demo adapter có counters/latches để điều khiển timeout/race. Postgres/Redis thật dùng cho transaction, constraint, outbox và concurrency; mock DB không chứng minh được tính đúng đắn các phần đó.

## Hợp đồng lệnh cần tạo

| Lệnh mục tiêu | Nội dung script và điều kiện |
|---|---|
| `npm run typecheck` | Đang có cho frontend; mở rộng type-check contracts, API, worker với project config tương ứng |
| `npm run test:unit` | Compile test TS, chạy `node --test` trên output unit bằng file discovery rõ ràng |
| `npm run test:integration` | Xác minh test DB, migration/seed cô lập, chạy HTTP/DB/Redis tests, đóng connections sau test |
| `npm run test:eval` | Fake/recorded AI outputs mặc định; live phải có cờ riêng, ngân sách và khóa được cấp |
| `npm run test:e2e` | Khi đã được phép thêm browser runner: tự động hóa các hành trình bên dưới trên demo |
| `npm run test:live` | Opt-in trên store được phép, kiểm tra và ghi evidence; không chạy mặc định trong CI |
| `npm run build` | Build frontend hiện có; khi có backend thêm build API/worker/contracts và nối vào gate build chung |

Nếu chưa có browser runner, chạy checklist UI thủ công và ghi evidence; không báo `test:e2e` tự động đã đạt. Việc dọn fixture test chỉ thực hiện trên mục tiêu test đã được cho phép; không xóa dữ liệu live sau smoke test mà không có xác nhận riêng.

## Fixture chuẩn dùng chung

| Dữ liệu | Giá trị/ý nghĩa |
|---|---|
| Tenant A/B | Mỗi tenant có SKU `CAFE-250`, đảm bảo phát hiện query thiếu tenant |
| Vai trò | OWNER, ADMIN có trần thấp, PRODUCT_MANAGER, ORDER_MANAGER, STAFF, VIEWER; có membership bị revoke |
| Product P1 | Hai biến thể 250 g/500 g, ảnh hợp lệ, fact có nguồn; không có chứng nhận hữu cơ |
| Product P2 | Thiếu thuộc tính bắt buộc và chứa câu injection trong mô tả |
| Store S1/S2 | Demo cùng tenant; S1 connected, S2 disconnected; tenant B có store riêng |
| Listing L1 | Draft; L2 approved version 1 rồi bị sửa thành 2; L3 đang unknown ngoài sàn |
| Inventory | SKU tồn 5 dùng ca hai đơn mỗi đơn mua 4; buffer cấu hình riêng |
| Order | O1 duplicate delivery; O2 SKU chưa map; O3 cancellation không đủ bằng chứng restock |
| Rules | AutoPublish off mặc định; rule chỉ áp P1/S1 với limit 1; demo ruleset versioned |
| Model | Trả đúng schema, sai schema, unsupported claim, timeout, rate limit, bịa citation |
| Sàn giả | Success, reject field, 429, timeout trước gửi, tạo xong timeout, delayed response |
| Thị trường | Dataset fixture 80/60/70/90, luật TEST-001 có nhãn giả lập, 30 review có dữ liệu trái chiều |

Mỗi test tạo tenant/run IDs riêng hoặc dùng transaction cleanup được harness kiểm soát, để chạy song song không đạp dữ liệu. Không chia sẻ một counter toàn cục giữa test đồng thời.

## Vòng TDD cho từng tính năng

1. Chọn một case ID trong spec, ví dụ I02. Viết setup, thao tác và assertions nghiệp vụ; chưa viết implementation.
2. Chạy đúng test đó, xác nhận fail do hành vi thiếu/sai, không do sai URL hoặc thiếu DB. Ghi output fail khi sửa bug có thể tái hiện.
3. Implement logic nhỏ nhất qua đường dùng chung. Tìm tất cả caller của hàm sửa, đưa chúng về cùng quy tắc.
4. Chạy lại case, rồi các test liên quan. Với race, dùng barrier để hai transaction cạnh tranh thật.
5. Refactor khi test vẫn xanh. Không dùng stub luôn trả thành công rồi coi là integration.

Ví dụ thiết kế test I02, chuyển thành TypeScript bằng `node:test` khi triển khai:

```text
Arrange: lưu SKU tồn 5, tạo 2 đơn khác ID mỗi đơn mua 4.
Arrange: mở 2 connection DB; barrier cho cả hai bắt đầu xử lý cùng lúc.
Act: Promise.all hai lời gọi processOrder qua service dùng bởi cả webhook/polling.
Assert: có 2 order; tổng debit movement = 1; available = 1.
Assert: một order line applied, một needs_attention; không âm tồn.
Act: gọi lại cả hai lần nữa.
Assert: vẫn available = 1, movement không tăng, hai order không mất.
```

## Các tầng test và mức khẳng định

- Unit xác minh routing, normalization, schema, scoring, policy và transitions bằng input/output xác định.
- Integration xác minh constraint, rollback, tenant query, lease, replay, audit và queue trên DB/Redis thật.
- Contract xác minh adapter/model parser trước response fixture chính thức hoặc đã ghi và lọc bí mật. Response fixture không chứng minh đang có quyền API thật.
- AI eval xác minh fact/citation/locale/relevance trên tập đã gán nhãn. Dùng fake cho CI ổn định, live cho đánh giá chất lượng trước đổi model/prompt.
- E2E xác minh người dùng nhìn và thao tác đúng, tải lại trang vẫn có dữ liệu. UI pass không thay thế kiểm tra DB/permission.
- Live smoke xác minh quyền và kết quả ngoài sàn; ghi riêng ngày, phạm vi, ID không nhạy cảm và giới hạn. Không chạy nếu chưa được phép tác động store.

## Các hành trình xuyên suốt

| ID | Các bước | Assertions chính |
|---|---|---|
| JOURNEY01 | Đăng ký → tạo tenant → store demo → tạo P1 → chờ draft → duyệt → sàn demo xác nhận | Một run/action/listing; nguồn đúng; mặc định không tự đăng; reload giữ dữ liệu |
| JOURNEY02 | Nhập CSV đúng/sai → preview → confirm hai lần | Chỉ dòng xác nhận được lưu; mỗi product một event có hiệu lực; nhập không đồng nghĩa duyệt đăng |
| JOURNEY03 | OWNER bật autoPublish P1 → lưu bản hợp lệ → worker chạy | Trong phạm vi và quota mới gửi; P2 thiếu fact dừng ở M15 |
| JOURNEY04 | Enqueue → pause rule trước dispatch → chạy worker | Adapter call count 0; task ghi lý do dừng |
| JOURNEY05 | Duyệt → sửa product → worker chạy | Approval stale, không gửi; revision mới cần kiểm tra |
| JOURNEY06 | Nhận đơn duplicate/concurrent → đồng bộ tồn | Inventory đúng như I01/I02, không trừ lại khi sync retry |
| JOURNEY07 | Sàn tạo listing rồi timeout → restart → đối soát | Một listing ngoài sàn; unknown được giải thích, không blind retry |
| JOURNEY08 | Model lỗi → viết tay → check → duyệt | Không mất draft, vẫn hoàn thành nghiệp vụ |
| JOURNEY09 | VIEWER/STAFF chat yêu cầu đăng và đổi tenant ID | Không vượt quyền/tenant; thông tin nhạy cảm không vào prompt |
| JOURNEY10 | Nhập luật/review/dataset → score → plan → simulation | Nguồn truy được; 73.5 fixture; dữ liệu thiếu là unknown; mô phỏng không tự đăng |

Mỗi hành trình thử desktop và mobile 360 px, bàn phím, loading/empty/error/needs_attention; đọc đúng tenant/currency/timezone. Khi ngắt kết nối store, dữ liệu cũ còn nhưng job cần kết nối dừng.

## Ma trận truy vết README mục (14)

| Tiêu chí | Khối phụ trách | Bằng chứng nghiệm thu |
|---|---|---|
| 1. Tài khoản/doanh nghiệp bền vững | 01 và nền auth | JOURNEY01, logout/login lại đọc dữ liệu |
| 2. Cùng SKU khác tenant, không rò rỉ | 01, 14, 17 | F01/F02, AS02, KB05 |
| 3. Biến thể giá/tồn riêng | 01, 12 | Hai biến thể reload giữ giá/tồn; I01/I02 |
| 4. CSV đúng/sai/chống lặp | 01–02 | JOURNEY02 |
| 5. AI draft và tự viết khi lỗi | 03, 05, 10 | C04, JOURNEY08 |
| 6. Quyền duyệt, sửa phải duyệt lại | 09–10 | P03/P04, A02/A03 |
| 7. Trạng thái đăng và retry | 08, 11 | R01, X01/X02, JOURNEY07 |
| 8. Shopee thật | 11 | Live smoke có ID + đọc lại; thiếu quyền ghi chưa đạt |
| 9. Đơn trùng/đồng thời/SKU lạ | 12 | I01–I04 trên DB thật |
| 10. Giá/tồn/audit/disconnect | 11–12 | I07/I09, disconnect giữ lịch sử |
| 11. Mobile 360 px | 10, 14 và các màn hình liên quan | Checklist UI các JOURNEY |
| 12. Auth, permission, secret | 01, 11, 21 | F05, X08, OPS07 |
| 13. Hướng dẫn chạy/config/demo | 21–22 | Người khác chạy từ môi trường sạch theo runbook |
| 14. Test quy tắc quan trọng | 01–02, 09, 11–12 | Unit + integration + UI evidence |
| 15. Chủ động tạo công việc | 02, 04–08, 10 | E01, O01–O04, JOURNEY01 |
| 16. Tự đăng có giới hạn và pause | 09–11 | P01–P10, JOURNEY03/04 |
| 17. Chat có nguồn và không bỏ duyệt | 14 | AS01–AS09 |
| 18. Phục hồi, không trùng, latency | 02–04, 11, 21 | E03–E06, O02–O07, X02/X03, OPS01/02 |
| 19. Toàn bộ app/worker TypeScript | 01, 21–22 | Typecheck/build từng runtime, không backend Python/Java |

Các yêu cầu mở rộng chưa có tiêu chí riêng trong mục (14) vẫn phải nghiệm thu: LG01–LG07 cho pháp lý, MS01–MS07 cho điểm, KB01–KB07 cho kiến thức, MP01–MP07 cho kế hoạch, AB01–AB07 cho mô phỏng, IMG/PR tại 20 cho ảnh/giá theo giai đoạn. Không dùng bảng 19 tiêu chí để bỏ qua các phần này.

## Gate phát hành

1. Không có lỗi rò tenant, vượt quyền, âm tồn hoặc tạo lặp tác dụng trong tập test an toàn bắt buộc.
2. Mọi test deterministic của khối thay đổi và integration liên quan qua; typecheck/lint/build qua hoặc lỗi nền được ghi riêng, không giấu.
3. Output AI sai/hỏng bị chặn; fixture eval không để claim nhạy cảm không nguồn tới autoPublish. Chất lượng văn phong được người đọc đánh giá riêng; không cam kết bằng một con số confidence model tự đưa.
4. Latency đo với số mẫu và môi trường ghi rõ; HTTP intake không chờ model; node độc lập có bằng chứng chạy đồng thời.
5. Chế độ demo chạy toàn bộ JOURNEY01–09; live có bằng chứng riêng trước tuyên bố hoàn tất. Khối thị trường ghi mức dữ liệu fixture/thật và phần chưa xác minh.

## Mẫu báo cáo cho mỗi khối

```text
Khối và phiên bản:
Commit/phạm vi file:
Môi trường, schema và dataset version:
Case đã chạy và lệnh chính xác:
Kết quả trước sửa / sau sửa:
Bằng chứng run/action/task IDs, số adapter calls, trạng thái DB:
UI đã kiểm tra, desktop/mobile:
Phần dùng fake/demo, phần gọi thật:
Lỗi còn lại và điều kiện mở khối kế tiếp:
```

Không đưa secret/PII vào báo cáo. Người triển khai chỉ đánh dấu hoàn thành khi có bằng chứng mới, không đánh dấu dựa vào việc đã tạo file hoặc chạy một mock không có assertion.
