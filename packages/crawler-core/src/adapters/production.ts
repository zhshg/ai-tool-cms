import { globalAdapterRegistry } from "../Adapter";
import type { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import { FuturepediaAdapter } from "./futurepedia.adapter";
import { TaaftAdapter } from "./taaft.adapter";
import { ToolifyAdapter } from "./toolify.adapter";

/**
 * Production site adapters — opt-in only.
 *
 * Enable when a real data source is ready to go live:
 *   registerProductionSiteAdapters()
 *
 * Framework validation should use MockStructuredAdapter instead.
 */
export const PRODUCTION_SITE_ADAPTERS: StructuredSiteAdapter[] = [
  new ToolifyAdapter(),
  new FuturepediaAdapter(),
  new TaaftAdapter(),
];

export function registerProductionSiteAdapters(): void {
  for (const adapter of PRODUCTION_SITE_ADAPTERS) {
    globalAdapterRegistry.register(adapter);
  }
}

export { ToolifyAdapter } from "./toolify.adapter";
export { FuturepediaAdapter } from "./futurepedia.adapter";
export { TaaftAdapter } from "./taaft.adapter";
