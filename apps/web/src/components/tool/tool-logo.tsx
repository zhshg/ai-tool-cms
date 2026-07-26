"use client";

import { Bot } from "lucide-react";
import { useMemo, useState } from "react";
import { resolveClientAssetUrl } from "@/lib/tool-logo";

type ToolLogoSize = "sm" | "md" | "lg";

type ToolLogoProps = {
  name: string;
  logoUrl?: string | null;
  fallbackLogoUrl?: string | null;
  categoryIconUrl?: string | null;
  size?: ToolLogoSize;
  className?: string;
};

const SIZE_CLASS_MAP: Record<ToolLogoSize, string> = {
  sm: "size-10 rounded-lg text-xs",
  md: "size-12 rounded-2xl text-sm",
  lg: "size-20 rounded-3xl text-xl",
};

export function ToolLogo({
  name,
  logoUrl,
  fallbackLogoUrl,
  size = "md",
  className = "",
}: ToolLogoProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [fallbackLogoFailed, setFallbackLogoFailed] = useState(false);

  const initials = useMemo(() => buildInitials(name), [name]);
  const primaryLogoSrc = useMemo(() => resolveClientAssetUrl(logoUrl), [logoUrl]);
  const fallbackLogoSrc = useMemo(() => resolveClientAssetUrl(fallbackLogoUrl), [fallbackLogoUrl]);

  const showPrimaryLogo = Boolean(primaryLogoSrc) && !logoFailed;
  const showCollectedLogo = !showPrimaryLogo && Boolean(fallbackLogoSrc) && !fallbackLogoFailed;
  const showGeneratedAvatar = !showPrimaryLogo && !showCollectedLogo;
  const avatarLabel = initials || buildFallbackMonogram(name) || "AI";

  return (
    <span
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-700 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200",
        SIZE_CLASS_MAP[size],
        className,
      ].join(" ")}
    >
      {showPrimaryLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={primaryLogoSrc ?? ""}
          alt={`${name} logo`}
          className="size-full object-contain p-2"
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      ) : null}

      {showCollectedLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackLogoSrc ?? ""}
          alt={`${name} collected logo`}
          className="size-full object-contain p-2"
          loading="lazy"
          decoding="async"
          onError={() => setFallbackLogoFailed(true)}
        />
      ) : null}

      {showGeneratedAvatar ? (
        <span className="select-none font-semibold uppercase tracking-[0.08em]">{avatarLabel}</span>
      ) : null}

      {!showPrimaryLogo && !showCollectedLogo && !showGeneratedAvatar ? (
        <Bot className="size-[55%] text-slate-500 dark:text-slate-400" aria-hidden="true" />
      ) : null}
    </span>
  );
}

function buildInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildFallbackMonogram(name: string) {
  return (
    name
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 1)
      .toUpperCase() || null
  );
}
