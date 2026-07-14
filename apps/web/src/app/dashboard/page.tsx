import { redirect } from "next/navigation";
import { env } from "@ai-tool-cms/config";

export default function DashboardPage() {
  redirect(env.ADMIN_URL);
}
