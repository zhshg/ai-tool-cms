"use client";

import { Bot } from "lucide-react";
import { useMemo, useState } from "react";

type ToolLogoSize = "sm" | "md" | "lg";

type ToolLogoProps = {
  name: string;
  logoUrl?: string | null;
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
  categoryIconUrl,
  size = "md",
  className = "",
}: ToolLogoProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [categoryIconFailed, setCategoryIconFailed] = useState(false);

  const initials = useMemo(() => buildInitials(name), [name]);
  const showLogo = Boolean(logoUrl) && !logoFailed;
  const showGeneratedAvatar = !showLogo && initials.length > 0;
  const showCategoryIcon =
    !showLogo && !showGeneratedAvatar && Boolean(categoryIconUrl) && !categoryIconFailed;

  return (
    <span
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-700 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200",
        SIZE_CLASS_MAP[size],
        className,
      ].join(" ")}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl ?? ""}
          alt={`${name} logo`}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      ) : null}

      {showGeneratedAvatar ? (
        <span className="select-none font-semibold uppercase tracking-[0.08em]">{initials}</span>
      ) : null}

      {showCategoryIcon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={categoryIconUrl ?? ""}
          alt={`${name} category icon`}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setCategoryIconFailed(true)}
        />
      ) : null}

      {!showLogo && !showGeneratedAvatar && !showCategoryIcon ? (
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
