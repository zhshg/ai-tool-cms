"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  ExternalLink,
  Gift,
  Link2,
  Megaphone,
  MousePointerClick,
  Percent,
  ReceiptText,
  RefreshCw,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/rbac/require-permission";
import {
  fetchMonetizationDashboard,
  getApiErrorMessage,
  type ApiError,
  type MonetizationDashboardResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default function MonetizationPage() {
  const [data, setData] = useState<MonetizationDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMonetizationDashboard()
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

  const metrics = useMemo(() => {
    const m = data?.metrics;
    return [
      {
        label: "Affiliate Links",
        value: m?.affiliateLinks ?? 0,
        detail: `${m?.activeAffiliateLinks ?? 0} active`,
        icon: Link2,
      },
      {
        label: "Featured Tools",
        value: m?.featuredTools ?? 0,
        detail: "featured placements",
        icon: Star,
      },
      {
        label: "Sponsored Tools",
        value: m?.sponsoredTools ?? 0,
        detail: `${m?.activeSponsored ?? 0} active`,
        icon: Megaphone,
      },
      {
        label: "Banner Ads",
        value: m?.bannerAds ?? 0,
        detail: `${m?.activeBannerAds ?? 0} active slots`,
        icon: BarChart3,
      },
      {
        label: "Pricing Plans",
        value: m?.pricingPlans ?? 0,
        detail: "tool plans",
        icon: CreditCard,
      },
      { label: "Coupons", value: m?.coupons ?? 0, detail: "model not configured", icon: Gift },
      { label: "Referrals", value: m?.referrals ?? 0, detail: "partner accounts", icon: Percent },
      {
        label: "Invoices",
        value: m?.invoices ?? 0,
        detail: "billing not configured",
        icon: ReceiptText,
      },
      { label: "Clicks", value: m?.clicks ?? 0, detail: "last 30 days", icon: MousePointerClick },
      {
        label: "Conversions",
        value: m?.conversions ?? 0,
        detail: "last 30 days",
        icon: BadgeDollarSign,
      },
      {
        label: "Revenue",
        value: formatCurrency(m?.revenue ?? 0),
        detail: "affiliate commissions",
        icon: BadgeDollarSign,
        wide: true,
      },
    ];
  }, [data]);

  return (
    <RequirePermission permission={Permission.MonetizationRead}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Monetization"
            description="Manage affiliate links, featured and sponsored tools, banner ads, pricing plans, referrals, and revenue signals."
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
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`rounded-xl border bg-card p-5 shadow-sm ${metric.wide ? "xl:col-span-2" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {loading
                    ? "0"
                    : typeof metric.value === "number"
                      ? formatNumber(metric.value)
                      : metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Top Affiliate Links</h2>
                <p className="text-sm text-muted-foreground">
                  Ranked by tracked clicks in the last 30 days.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {data?.period ?? "last_30_days"}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tool</th>
                    <th className="px-4 py-3">Network</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3">Conversions</th>
                    <th className="px-4 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topAffiliateLinks ?? []).length ? (
                    data?.topAffiliateLinks.map((link) => (
                      <tr key={link.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{link.tool.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{link.network}</td>
                        <td className="px-4 py-3">{formatNumber(link.clicks)}</td>
                        <td className="px-4 py-3">{formatNumber(link.conversions)}</td>
                        <td className="px-4 py-3">{formatCurrency(link.revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                        No affiliate activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Revenue Mix</h2>
            <p className="text-sm text-muted-foreground">Snapshots by monetization source.</p>
            <div className="mt-4 space-y-3">
              {Object.entries(
                data?.revenue.bySource ?? { AFFILIATE: 0, ADS: 0, SPONSORED: 0, API: 0, OTHER: 0 },
              ).map(([source, amount]) => (
                <div key={source}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{source}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, data?.revenue.total ? (amount / data.revenue.total) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Sponsored Placements</h2>
            <div className="mt-4 space-y-3">
              {(data?.sponsoredPlacements ?? []).length ? (
                data?.sponsoredPlacements.map((placement) => (
                  <div key={placement.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{placement.tool.name}</p>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {placement.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {placement.type} �� weight {placement.weight}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No sponsored placements configured.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Banner Ads</h2>
            <div className="mt-4 space-y-3">
              {(data?.adSlots ?? []).length ? (
                data?.adSlots.map((slot) => (
                  <div key={slot.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{slot.name}</p>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">{slot.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {slot.position} �� {slot.network}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No banner ad slots configured.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Pricing Plans</h2>
            <div className="mt-4 space-y-3">
              {(data?.pricingPlans ?? []).length ? (
                data?.pricingPlans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{plan.name}</p>
                      <span className="text-sm font-medium">
                        {formatCurrency(plan.amount, plan.currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tool.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pricing plans configured.</p>
              )}
            </div>
          </section>
        </div>

        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <div className="flex items-start gap-3">
            <ExternalLink className="mt-0.5 h-4 w-4" />
            <p>
              Coupons and invoices are shown as zero because this schema currently has no dedicated
              coupon or billing invoice models. The dashboard is wired for visible readiness without
              inventing unsupported revenue data.
            </p>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
