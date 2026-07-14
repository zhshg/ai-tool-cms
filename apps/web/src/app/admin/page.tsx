import { redirect } from "next/navigation";
import { env } from "@ai-tool-cms/config";

export default function AdminPage() {
  redirect(env.ADMIN_URL);
}
