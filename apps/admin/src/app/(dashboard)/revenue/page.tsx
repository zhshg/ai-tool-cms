"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, DollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  fetchRevenueOverview,
  getApiErrorMessage,
  type ApiError,
  type RevenueOverviewResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchRevenueOverview()
      .then((response) => {
        if (!active) return;
        setData(response);
        setError(null);
      })
      .catch((err: ApiError) => {
        if (!active) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      { key: "total", label: "Total Revenue", value: data?.total ?? 0, icon: DollarSign },
      { key: "weekly", label: "Weekly", value: data?.weekly ?? 0, icon: TrendingUp },
      { key: "monthly", label: "Monthly", value: data?.monthly ?? 0, icon: TrendingUp },
      {
        key: "affiliate",
        label: "Affiliate",
        value: data?.bySource?.AFFILIATE ?? 0,
        icon: BadgeDollarSign,
      },
      { key: "ads", label: "Ads", value: data?.bySource?.ADS ?? 0, icon: DollarSign },
      {
        key: "sponsored",
        label: "Sponsored",
        value: data?.bySource?.SPONSORED ?? 0,
        icon: DollarSign,
      },
      { key: "api", label: "API", value: data?.bySource?.API ?? 0, icon: DollarSign },
    ],
    [data],
  );

  return (
    <RequirePermission permission={Permission.RevenueRead}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Revenue Dashboard"
            description="Track revenue snapshots by affiliate, ads, sponsored placements, API, and other monetization sources."
          />
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading ? formatCurrency(0) : formatCurrency(metric.value)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold">Revenue Source Mix</h2>
          <p className="mt-1 text-sm text-muted-foreground">Based on stored revenue snapshots.</p>
          <div className="mt-5 space-y-4">
            {Object.entries(
              data?.bySource ?? { AFFILIATE: 0, ADS: 0, SPONSORED: 0, API: 0, OTHER: 0 },
            ).map(([source, amount]) => (
              <div key={source}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{source}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, data?.total ? (amount / data.total) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
