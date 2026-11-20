/** Shared labels for the pilot feedback form and its admin page (D38). */

export const FEEDBACK_KINDS = [
  { code: "bug", icon: "🐞", label: "Lỗi", hint: "Có gì đó không chạy đúng" },
  { code: "idea", icon: "💡", label: "Ý tưởng mới", hint: "Điều cô muốn app có thêm" },
  { code: "content", icon: "✏️", label: "Sai nội dung", hint: "Từ, câu, đáp án, video chưa đúng" },
  { code: "design", icon: "🎨", label: "Giao diện", hint: "Khó nhìn, khó bấm, khó hiểu" },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["code"];

export const FEEDBACK_AREAS = [
  { code: "content", label: "Soạn bài" },
  { code: "share", label: "Gửi link cho học sinh" },
  { code: "play", label: "Học sinh làm bài" },
  { code: "results", label: "Xem kết quả" },
  { code: "login", label: "Đăng nhập" },
  { code: "other", label: "Khác" },
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]["code"];

export const SEVERITIES = [
  { code: "blocker", label: "Không dùng tiếp được" },
  { code: "annoying", label: "Khó chịu nhưng vẫn dùng được" },
  { code: "minor", label: "Nhỏ" },
] as const;
export type Severity = (typeof SEVERITIES)[number]["code"];

export const RATINGS = [
  { code: "ease", label: "Soạn bài và gửi cho học sinh có dễ không?" },
  { code: "kids", label: "Học sinh có thích làm bài không?" },
  { code: "results", label: "Trang Kết quả có giúp cô đánh giá học sinh không?" },
  { code: "ready", label: "Cô có sẵn sàng dùng cho lớp thật không?" },
] as const;
export type RatingCode = (typeof RATINGS)[number]["code"];

export const ROLES = [
  { code: "teacher", label: "Giáo viên" },
  { code: "admin", label: "Quản trị" },
  { code: "parent", label: "Phụ huynh" },
  { code: "other", label: "Khác" },
] as const;

export const STATUSES = [
  { code: "new", label: "Mới" },
  { code: "in_progress", label: "Đang xử lý" },
  { code: "done", label: "Đã xong" },
  { code: "wont_do", label: "Không làm" },
] as const;
export type FeedbackStatus = (typeof STATUSES)[number]["code"];

export const labelOf = <T extends { code: string; label: string }>(list: readonly T[], code: string | null) =>
  list.find((x) => x.code === code)?.label ?? "—";

/** Vietnamese mobile number: 0xxxxxxxxx or +84xxxxxxxxx (spaces and dots removed first). */
export const ZALO_PHONE = /^(\+84|0)[0-9]{9}$/;
