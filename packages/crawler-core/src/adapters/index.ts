import { globalAdapterRegistry } from "../Adapter";
import type { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import { MockStructuredAdapter } from "./mock-structured.adapter";

/** Adapters registered by default — framework validation only. */
export const FRAMEWORK_ADAPTERS: StructuredSiteAdapter[] = [new MockStructuredAdapter()];

export function registerFrameworkAdapters(): void {
  for (const adapter of FRAMEWORK_ADAPTERS) {
    globalAdapterRegistry.register(adapter);
  }
}

registerFrameworkAdapters();

export { MockStructuredAdapter } from "./mock-structured.adapter";
export {
  PRODUCTION_SITE_ADAPTERS,
  registerProductionSiteAdapters,
  ToolifyAdapter,
  FuturepediaAdapter,
  TaaftAdapter,
} from "./production";

/** @deprecated Use registerFrameworkAdapters() — production adapters are opt-in. */
export const registerSiteAdapters = registerFrameworkAdapters;

/** @deprecated Use FRAMEWORK_ADAPTERS */
export const SITE_ADAPTERS = FRAMEWORK_ADAPTERS;
