# SHINING — Design system

Một nguồn duy nhất cho giao diện. Token nằm trong `src/app/globals.css`; tài liệu này giải thích **khi nào dùng
gì** và đặt ra các quy tắc riêng cho trẻ em. Khi token và tài liệu khác nhau, `globals.css` là chuẩn — sửa tài
liệu cho khớp.

Có hai "bề mặt" với hai phong cách khác nhau, cố ý tách biệt:

| Bề mặt | Ai dùng | Phong cách | Font | Tiền tố token |
|---|---|---|---|---|
| **Học sinh** (`/learn`, `/p/<token>`, `/login`) | Trẻ 6–10 tuổi, điện thoại/tablet | Vàng nhạt + xanh lá, nút "bấm lún", hình to, ít chữ | Nunito (chữ), Quicksand (tiêu đề, wordmark) | `--k-*` / `k-*` |
| **Giáo viên / Admin** (`/teacher`, `/admin`, `/gop-y`, `/huong-dan`) | Người lớn, laptop/tablet | Gọn, rõ, bảng dày thông tin, chàm + vàng nắng | Be Vietnam Pro | `--ink`, `--sky`… / tên shadcn |

## 1. Thương hiệu

- **Wordmark** "shining english" (`<Logo/>` / `<Wordmark/>` trong `src/components/brand/logo.tsx`): "shining" trên
  "en", chữ **g** cao màu nắng `#FFB400` với ba tia cam `#F28C1B`, rồi "lish". Font Quicksand, màu `--k-ink`.
  Dùng ở **mọi** trang; không tự vẽ lại, không đổi màu chữ g, không kéo giãn.
- **Sun mark** (`<SunMark/>`): đĩa vàng nắng 8 tia — biểu tượng nhỏ (favicon, trạng thái trống).
- **Sunny**: nhân vật mặt trời trong khu học sinh — chỉ dùng để khen/cổ vũ, không dùng để báo lỗi.
- Màu gốc logo: than `#3A3A3C`, nắng `#FFC61A`, cam `#F28C1B` (D24).

## 2. Màu

### 2.1 Học sinh (D27)

| Token | Hex | Dùng cho |
|---|---|---|
| `--k-bg` | `#FFF8DC` | Nền trang |
| `--k-surface` | `#FFFFFF` | Thẻ, ô đáp án |
| `--k-ink` | `#2F3B1F` | Chữ chính (11.2 : 1 trên nền) |
| `--k-soft` | `#5F6E48` | Chữ phụ (5.2 : 1) |
| `--k-line` | `#EADFA8` | Viền, bóng "bấm lún" mặc định |
| `--k-primary` / `-shadow` | `#3A9A47` / `#2E7D32` | Nút chính (Tiếp, Bắt đầu) — chữ trắng |
| `--k-accent` / `-shadow` / `-soft` / `-ink` | `#FFC93C` / `#E0A800` / `#FFF0C2` / `#7A5600` | Nhấn, gợi ý, huy hiệu |
| `--k-tile` | `#EEF7E4` | Nền ô chủ đề/hoạt động |
| `--k-good` / `-soft` | `#2E7D32` / `#E3F3DD` | Đúng |
| `--k-bad` / `-soft` | `#C0504D` / `#FDE4E1` | Sai (dịu, không đỏ gắt) |
| `--k-star` / `-off` | `#FFB400` / `#EDE3C0` | Sao đã đạt / chưa đạt |
| `--k-nav` / `-ink` / `-active` | `#2E7D32` / `#F1F8E9` / `#FFC93C` | Thanh điều hướng |

> Tương phản: chữ trắng trên `--k-primary` chỉ đạt **3.56 : 1** → chỉ dùng cho chữ **to và đậm** (≥ 18.66 px đậm,
> tức `text-lg font-bold` trở lên — mọi nút học sinh đều vậy). Chữ nhỏ trên nền xanh dùng `--k-good` (5.1 : 1).

### 2.2 Giáo viên / Admin

| Token | Hex | Dùng cho |
|---|---|---|
| `--ink` | `#1F2A5A` | Chữ, nút chính (`primary`) |
| `--ink-soft` | `#4A5480` | Chữ phụ |
| `--paper` / `--surface` / `--line` | `#F7F9FC` / `#FFF` / `#DDE3EE` | Nền, thẻ, viền |
| `--sun` / `--sun-soft` | `#F2A20C` / `#FFF1D1` | Điểm nhấn thương hiệu — **ít thôi**; không dùng làm màu chữ (2.1 : 1) |
| `--sky` / `--sky-soft` | `#2F7FC7` / `#E5F0FA` | Liên kết, focus, thông tin |
| `--leaf` / `--leaf-soft` | `#2F8A5B` / `#E3F3EA` | Thành công |
| `--berry` / `--berry-soft` | `#C3334C` / `#FBE7EA` | Lỗi, thao tác xoá |

Tên shadcn (`background`, `primary`, `muted`, `destructive`, `ring`…) đã ánh xạ sẵn vào bảng trên — trong component
dùng tên lớp Tailwind (`bg-primary`, `text-ink-soft`), **không viết mã hex trực tiếp**.

> Đã biết: `--sky` trên trắng = 4.22 : 1, hơi dưới 4.5 cho chữ nhỏ. Liên kết trong đoạn văn nên gạch chân hoặc
> đậm; khi chỉnh token lần tới cân nhắc `#2A72B5` (≈ 4.9 : 1).

### 2.3 Quy tắc chung
- Không truyền đạt ý nghĩa **chỉ bằng màu**: đúng/sai luôn có thêm biểu tượng (✓/✗), sao có số, lưới màu kết quả
  có số %.
- Chỉ có giao diện sáng (trẻ và phụ huynh dùng điện thoại ban ngày).

## 3. Chữ

| Vai trò | Font | Cỡ tối thiểu |
|---|---|---|
| Học sinh: nút, đáp án, từ vựng | Nunito 800/900 (`font-kid`) | 18 px (nút), 24 px+ (từ đang học) |
| Học sinh: tiêu đề, wordmark | Quicksand 700 (`font-kid-display`) | 22 px |
| Giáo viên/Admin | Be Vietnam Pro 400/500/600/800 (`font-sans`) | 14 px (bảng), 16 px (đoạn văn) |

- Tất cả font **tự host** qua `@fontsource` (không gọi Google Fonts; đúng dấu tiếng Việt — D20).
- Thang chữ: quãng 4 từ 16 px; `--text-display` 2.441 rem.
- Chữ tiếng Anh trong bài học không viết hoa toàn bộ (trẻ đang học nhận dạng chữ thường).

## 4. Hình khối, khoảng cách, chuyển động

- Bo góc: `--radius` 10 px; học sinh dùng `rounded-2xl`/`rounded-3xl`.
- Nút học sinh: lớp `.kid-press` — bóng dưới là "cạnh" nút, bấm thì lún 4 px (biến `--press` đổi màu bóng).
- Khoảng cách giữa các vùng bấm ≥ 8 px (`gap-2`), học sinh ≥ 12 px (`gap-3`).
- Chuyển động (D34): `animate-kid-pop`, `-shake` (sai), `-in`, `-float`, `-rise` ("+2 ⭐"), `-jump` (Sunny),
  `kid-stars-reveal`, `kid-confetti`. Ngắn (≤ 600 ms) trừ nổi lơ lửng/confetti.
- **`prefers-reduced-motion`**: mọi animation học sinh tắt, confetti ẩn, thanh tiến trình đứng yên (đã có trong
  `globals.css`). Animation mới **phải** thêm vào khối reduced-motion.
- Âm thanh (D34): Web Audio tổng hợp, nhỏ hơn giọng đọc; có nút tắt tiếng được nhớ; không bao giờ là kênh duy nhất
  báo đúng/sai.

## 5. Quy tắc riêng cho trẻ em (khu học sinh)

1. **Nút to**: vùng bấm ≥ 48 × 48 px (đáp án thường 64 px+), cách nhau ≥ 12 px; không có nút chỉ hiện khi hover.
2. **Ít chữ**: mỗi màn hình một việc; hướng dẫn ≤ 1 câu ngắn + biểu tượng/hình; tiếng Anh mặc định, tiếng Việt khi
   chọn VI (D30).
3. **Hình rõ nghĩa**: dùng Fluent Emoji 3D (D24) cho danh từ cụ thể; tránh hình mơ hồ (một hình phải chỉ một từ);
   từ trừu tượng (this/that, ngữ pháp) dùng hình + mũi tên/cảnh, hoặc không có hình còn hơn hình sai.
4. **Tương phản**: chữ ≥ 4.5 : 1, chữ to/đậm ≥ 3 : 1 (xem §2.1); không chữ xám nhạt trên vàng nhạt.
5. **Phản hồi ngay**: mỗi lần chạm có phản hồi (lún, âm thanh, màu + ✓/✗) trong < 100 ms; tải trang có thanh tiến
   trình (D25).
6. **Không phạt nặng**: sai thì rung nhẹ + màu dịu + hiện đáp án đúng; không chữ đỏ to, không âm thanh gắt.
7. **Một cú chạm, không kéo thả bắt buộc**: bài nối dùng chạm-chạm (WCAG 2.5.7 Dragging Movements).
8. **Giảm chuyển động & âm thanh** theo thiết bị/người dùng (reduced-motion, nút tắt tiếng); nhắc "Bật tiếng để
   nghe" khi trình duyệt chặn âm thanh.
9. **Không quảng cáo, không liên kết ra ngoài** từ khu học sinh (trừ video nhúng youtube-nocookie).
10. **Bố cục điện thoại trước**: 360 px rộng không cuộn ngang; tablet/desktop tận dụng chỗ (ví dụ bài nối 6 cặp).

## 6. Giao diện giáo viên / admin

- Dùng component trong `src/components/ui` (shadcn) và `src/components/shell` (`AppShell`, `PageHeader`…).
- Bảng: tiêu đề cột sắp xếp được, 20 dòng/trang, cuộn ngang trên điện thoại (đã biết).
- Biểu mẫu: nhãn luôn hiện (không chỉ placeholder), lỗi ngay dưới ô, không mất dữ liệu khi lưu lỗi.
- Hành động chính mỗi trang ≤ 1 nút `primary`; "Bước tiếp theo" hiển thị rõ khi có quy trình nhiều bước.
- Biểu tượng: lucide-react (SVG); emoji chỉ dùng làm **nội dung** (hình từ vựng), không làm icon điều khiển.
- Focus: viền `--sky` 3 px (`:focus-visible`) — không xoá.

## 7. Dùng skill UI/UX Pro Max

Cài ở `.claude/skills/ui-ux-pro-max/` (MIT, nextlevelbuilder/ui-ux-pro-max-skill, bản 2026-11-19, bỏ thư mục
test). Chỉ là script Python đọc CSV cục bộ, không gọi mạng.

- Skill **không có** nhóm giáo dục trẻ em → **không** áp bảng màu/font nó gợi ý vào khu học sinh; giữ §2–§5.
- Dùng cho trang giáo viên/admin (bảng, biểu mẫu, biểu đồ kết quả) và làm checklist accessibility:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "error summary validation" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "sortable data table" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "suspense streaming" --stack nextjs
```

- Kết quả skill là gợi ý; quyết định cuối theo tài liệu này và ARCHITECTURE.md.

## 8. Checklist trước khi giao một màn hình

- [ ] Dùng token/lớp Tailwind, không hex trực tiếp (trừ wordmark).
- [ ] Tương phản đạt §2; ý nghĩa không chỉ bằng màu.
- [ ] Vùng bấm ≥ 48 px (học sinh) / ≥ 40 px (staff), khoảng cách ≥ 8 px.
- [ ] Bàn phím: Tab tới được mọi nút, focus thấy rõ; nút chỉ có icon có `aria-label`.
- [ ] Hình có `alt` (hình nội dung) hoặc `aria-hidden` (trang trí).
- [ ] Animation mới nằm trong khối `prefers-reduced-motion`.
- [ ] 360 px không cuộn ngang; tablet dùng được chỗ rộng.
- [ ] Văn bản tiếng Việt cho staff; khu học sinh EN/VI qua `messages.ts`.
- [ ] Dữ liệu mẫu chỉ `[SAMPLE]`.
