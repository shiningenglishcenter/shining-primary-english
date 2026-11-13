import {
  ACCOUNT_INACTIVE,
  INVALID_CREDENTIALS,
  SERVICE_UNAVAILABLE,
  TOO_MANY_ATTEMPTS,
} from "@/features/auth/schemas";
import type { Lang } from "@/features/i18n/messages";

/**
 * Login screen text (D36). The page is shared by every role, so it is
 * Vietnamese unless the visitor chose English (the student EN/VI cookie).
 * Server messages stay Vietnamese in the action and are translated here.
 */
const vi = {
  welcome: "Chào mừng con!",
  welcomeSub: "Đăng nhập để học tiếng Anh cùng Shining.",
  tagline: "Mỗi ngày một chút, tiếng Anh sáng lên.",
  programmes: "Starters · Movers · Flyers · Global Success",
  username: "Tên đăng nhập",
  usernamePlaceholder: "ví dụ: hs.an",
  usernameHint: "Học sinh và phụ huynh dùng tên đăng nhập trung tâm cấp. Giáo viên có thể dùng email.",
  password: "Mật khẩu",
  show: "Hiện mật khẩu",
  hide: "Ẩn mật khẩu",
  submit: "Đăng nhập",
  pending: "Đang đăng nhập…",
  forgot: "Quên mật khẩu? Hãy nhờ thầy cô hoặc trung tâm đặt lại cho con.",
  staff: "Giáo viên, phụ huynh và quản trị viên cũng đăng nhập ở đây.",
  notice: {
    expired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    signed_out: "Bạn đã đăng xuất.",
    inactive: "Tài khoản này đã bị tạm khoá. Vui lòng liên hệ trung tâm.",
  } as Record<string, string>,
  errors: {} as Record<string, string>,
};
type LoginText = typeof vi;

const en: LoginText = {
  welcome: "Welcome!",
  welcomeSub: "Log in to learn English with Shining.",
  tagline: "A little every day, and your English shines.",
  programmes: "Starters · Movers · Flyers · Global Success",
  username: "Username",
  usernamePlaceholder: "e.g. hs.an",
  usernameHint: "Students and parents use the username from the centre. Teachers can use their email.",
  password: "Password",
  show: "Show password",
  hide: "Hide password",
  submit: "Log in",
  pending: "Logging in…",
  forgot: "Forgot your password? Ask your teacher or the centre to reset it.",
  staff: "Teachers, parents and admins log in here too.",
  notice: {
    expired: "Your session has expired. Please log in again.",
    signed_out: "You have logged out.",
    inactive: "This account is locked. Please contact the centre.",
  },
  errors: {
    [INVALID_CREDENTIALS]: "The username or password is not right.",
    [TOO_MANY_ATTEMPTS]: "Too many tries. Please wait a few minutes and try again.",
    [ACCOUNT_INACTIVE]: "This account is locked. Please contact the centre.",
    [SERVICE_UNAVAILABLE]: "Can't reach the server. Please try again in a few minutes.",
    "Nhập tên đăng nhập hoặc email.": "Type your username or email.",
    "Nhập mật khẩu.": "Type your password.",
  },
};

export function loginText(lang: Lang): LoginText {
  return lang === "en" ? en : vi;
}
export type { LoginText };
