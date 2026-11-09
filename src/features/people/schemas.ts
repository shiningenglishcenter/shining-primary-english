import { z } from "zod";
import { USERNAME_PATTERN } from "@/lib/auth/identifier";
import { MIN_PASSWORD_LENGTH } from "@/features/people/credentials";

/** Empty form fields arrive as "" — treat them as "not given". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const fullName = z.string().trim().min(1, "Nhập họ và tên.").max(120, "Tối đa 120 ký tự.");

export const idSchema = z.uuid();

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số và . _ -");

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`)
  .max(72, "Mật khẩu tối đa 72 ký tự.");

/** A checkbox sends "on" when ticked and nothing at all when not. */
const checkbox = z
  .unknown()
  .optional()
  .transform((v) => v === "on" || v === "true");

// ----------------------------------------------------------------- students --
export const STUDENT_STATUSES = ["active", "paused", "left"] as const;
export const STUDENT_STATUS_LABEL: Record<(typeof STUDENT_STATUSES)[number], string> = {
  active: "Đang học",
  paused: "Tạm nghỉ",
  left: "Đã nghỉ",
};

export const studentFieldsSchema = z.object({
  fullName,
  englishName: optionalText(60),
  schoolName: optionalText(120),
  schoolGrade: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 12), "Lớp ở trường từ 1 đến 12."),
});

export const newStudentSchema = studentFieldsSchema.extend({
  classId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(idSchema.nullable()),
  createAccount: checkbox,
  username: z.string().optional(),
  password: z.string().optional(),
});

export const updateStudentSchema = studentFieldsSchema.extend({
  id: idSchema,
  status: z.enum(STUDENT_STATUSES),
});

// ----------------------------------------------------------------- teachers --
export const newTeacherSchema = z.object({
  fullName,
  phone: optionalText(30),
  loginType: z.enum(["username", "email"]),
  username: z.string().optional(),
  email: z.string().optional(),
  password: passwordSchema,
});

export const updateTeacherSchema = z.object({
  id: idSchema,
  fullName,
  phone: optionalText(30),
});

// ------------------------------------------------------------------ accounts --
export const accountTargetSchema = z.object({ profileId: idSchema });

export const resetPasswordSchema = accountTargetSchema.extend({ password: passwordSchema });

export const createAccountForStudentSchema = z.object({
  studentId: idSchema,
  username: usernameSchema,
  password: passwordSchema,
});

// ------------------------------------------------------------------- classes --
export const classFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên lớp.").max(120, "Tối đa 120 ký tự."),
  code: z
    .string()
    .trim()
    .max(30, "Mã lớp tối đa 30 ký tự.")
    .regex(/^[A-Za-z0-9._-]*$/, "Mã lớp chỉ gồm chữ không dấu, số và . _ -")
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  levelId: z.string().min(1, "Chọn trình độ.").pipe(idSchema),
});

export const updateClassSchema = classFieldsSchema.extend({
  id: idSchema,
  isActive: checkbox,
});

export const enrolSchema = z.object({
  classId: idSchema,
  studentIds: z.array(idSchema).min(1, "Chọn ít nhất một học sinh.").max(200),
});

export const classMemberSchema = z.object({ classId: idSchema, memberId: idSchema });

export const assignTeacherSchema = z.object({
  classId: idSchema,
  teacherId: z.string().min(1, "Chọn giáo viên.").pipe(idSchema),
  role: z.enum(["main", "assistant"]),
});

export const TEACHER_ROLE_LABEL = { main: "Giáo viên chính", assistant: "Trợ giảng" } as const;

// --------------------------------------------------------------- form state --
export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Shown once after an account is created or a password is reset. */
  credentials?: { login: string; password: string; name: string };
  /** Where to go next (e.g. the new record's page). */
  href?: string;
};

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
