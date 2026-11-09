import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Nhập tên đăng nhập hoặc email.").max(254),
  password: z.string().min(1, "Nhập mật khẩu.").max(128),
  next: z.string().max(512).optional(),
});

export type LoginFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"identifier" | "password", string>>;
  /** Echoed back so the field keeps its value after a failed attempt. */
  identifier?: string;
};

/** One message for every credential failure, so usernames can't be probed. */
export const INVALID_CREDENTIALS = "Tên đăng nhập hoặc mật khẩu không đúng.";
export const TOO_MANY_ATTEMPTS = "Bạn đã thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.";
export const ACCOUNT_INACTIVE = "Tài khoản này đã bị tạm khoá. Vui lòng liên hệ trung tâm.";
export const SERVICE_UNAVAILABLE = "Không kết nối được máy chủ. Vui lòng thử lại sau ít phút.";
