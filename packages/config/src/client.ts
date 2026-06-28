/** 客户端安全的环境变量（仅 NEXT_PUBLIC_*，无 Node/dotenv 依赖）。 */
export const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  NEXT_PUBLIC_ADMIN_MOCK_ROLE: process.env.NEXT_PUBLIC_ADMIN_MOCK_ROLE ?? "admin",
} as const;

export type ClientEnv = typeof clientEnv;
