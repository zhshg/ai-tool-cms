"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { breadcrumbLabels } from "@/lib/nav";

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
  const normalizedSegments = segments[0] === "admin" ? segments.slice(1) : segments;

  const crumbs = [
    { href: "/", label: breadcrumbLabels[""] ?? "Dashboard" },
    ...normalizedSegments.map((segment, index) => {
      const href = `/${normalizedSegments.slice(0, index + 1).join("/")}`;
      const parentSegment = index > 0 ? normalizedSegments[index - 1] : "";
      const isToolDetail = parentSegment === "tools" && !breadcrumbLabels[segment];
      return {
        href,
        label: isToolDetail ? "Tool Detail" : (breadcrumbLabels[segment] ?? segment),
      };
    }),
  ];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
