"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/rbac/auth-provider";
import { getAdminDashboardPath } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(searchParams.get("next") || getAdminDashboardPath());
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">AI Tool CMS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin Sign In</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a valid admin account to access dashboard data.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitError(null);

          try {
            await login(email, password);
            router.replace(searchParams.get("next") || getAdminDashboardPath());
          } catch (err) {
            const message = (err as { message?: string })?.message;
            setSubmitError(message || "Sign in failed.");
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {submitError || error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError || error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            Loading sign in...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
