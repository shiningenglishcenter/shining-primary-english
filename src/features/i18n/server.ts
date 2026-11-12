import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, langOf, MESSAGES, type Lang, type Messages } from "@/features/i18n/messages";

/** The student's interface language, from the cookie (English by default). */
export async function getLang(): Promise<Lang> {
  return langOf((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getMessages(): Promise<{ lang: Lang; t: Messages }> {
  const lang = await getLang();
  return { lang, t: MESSAGES[lang] };
}
