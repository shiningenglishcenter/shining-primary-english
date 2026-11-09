import { describe, expect, it } from "vitest";
import {
  classFieldsSchema,
  enrolSchema,
  newStudentSchema,
  newTeacherSchema,
  usernameSchema,
} from "@/features/people/schemas";

const uuid = "5f0c4d2a-1b2c-4d3e-8f9a-0b1c2d3e4f5a";

describe("newStudentSchema", () => {
  it("turns empty optional fields into null", () => {
    const r = newStudentSchema.parse({
      fullName: "  Nguyễn Minh An ",
      englishName: "",
      schoolName: "",
      schoolGrade: "",
      classId: "",
      createAccount: null,
    });
    expect(r).toMatchObject({
      fullName: "Nguyễn Minh An",
      englishName: null,
      schoolName: null,
      schoolGrade: null,
      classId: null,
      createAccount: false,
    });
  });

  it("requires a name and checks the school grade", () => {
    expect(newStudentSchema.safeParse({ fullName: " ", classId: "" }).success).toBe(false);
    expect(newStudentSchema.safeParse({ fullName: "A", schoolGrade: "13", classId: "" }).success).toBe(false);
    expect(newStudentSchema.parse({ fullName: "A", schoolGrade: "4", classId: "" }).schoolGrade).toBe(4);
  });

  it("rejects a class id that is not a uuid", () => {
    expect(newStudentSchema.safeParse({ fullName: "A", classId: "1 or 1=1" }).success).toBe(false);
    expect(newStudentSchema.parse({ fullName: "A", classId: uuid, createAccount: "on" })).toMatchObject({
      classId: uuid,
      createAccount: true,
    });
  });
});

describe("usernameSchema", () => {
  it("lower-cases and enforces the database pattern", () => {
    expect(usernameSchema.parse(" HS.An ")).toBe("hs.an");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("hs an").success).toBe(false);
    expect(usernameSchema.safeParse("hs.ăn").success).toBe(false);
  });
});

describe("newTeacherSchema", () => {
  it("needs a login type and a strong-enough password", () => {
    const base = { fullName: "Cô Lan", phone: "", loginType: "username", username: "gv.lan" };
    expect(newTeacherSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(newTeacherSchema.safeParse({ ...base, loginType: "sms", password: "Sao-Mai-1234" }).success).toBe(
      false,
    );
    expect(newTeacherSchema.parse({ ...base, password: "Sao-Mai-1234" }).phone).toBeNull();
  });
});

describe("classFieldsSchema", () => {
  it("upper-cases the code and allows it to be blank", () => {
    expect(classFieldsSchema.parse({ name: "Movers A", code: "mov-a", levelId: uuid }).code).toBe("MOV-A");
    expect(classFieldsSchema.parse({ name: "Movers A", code: "", levelId: uuid }).code).toBeNull();
    expect(classFieldsSchema.safeParse({ name: "Movers A", code: "MOV A", levelId: uuid }).success).toBe(
      false,
    );
    expect(classFieldsSchema.safeParse({ name: "Movers A", levelId: "" }).success).toBe(false);
  });
});

describe("enrolSchema", () => {
  it("needs at least one valid student id", () => {
    expect(enrolSchema.safeParse({ classId: uuid, studentIds: [] }).success).toBe(false);
    expect(enrolSchema.safeParse({ classId: uuid, studentIds: ["x"] }).success).toBe(false);
    expect(enrolSchema.parse({ classId: uuid, studentIds: [uuid] }).studentIds).toHaveLength(1);
  });
});
