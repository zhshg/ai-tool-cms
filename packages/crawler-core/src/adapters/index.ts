import { ToolifyAdapter } from "./toolify.adapter";
import { FuturepediaAdapter } from "./futurepedia.adapter";
import { TaaftAdapter } from "./taaft.adapter";
import { globalAdapterRegistry } from "../Adapter";
import type { StructuredSiteAdapter } from "../StructuredSiteAdapter";

export const SITE_ADAPTERS: StructuredSiteAdapter[] = [
  new ToolifyAdapter(),
  new FuturepediaAdapter(),
  new TaaftAdapter(),
];

export function registerSiteAdapters(): void {
  for (const adapter of SITE_ADAPTERS) {
    globalAdapterRegistry.register(adapter);
  }
}

registerSiteAdapters();

export { ToolifyAdapter } from "./toolify.adapter";
export { FuturepediaAdapter } from "./futurepedia.adapter";
export { TaaftAdapter } from "./taaft.adapter";
