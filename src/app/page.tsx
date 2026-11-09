import { redirect } from "next/navigation";

// proxy.ts sends "/" to the signed-in user's home; this is only a fallback.
export default function Home() {
  redirect("/login");
}
