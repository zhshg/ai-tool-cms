export {
  registerPlugin,
  getPlugin,
  listPlugins,
  runPluginLifecycle,
  registerBuiltinPlugins,
  registerWorkspacePlugins,
} from "./registry";
export type { PluginLifecycle, PluginContext, PluginHandler, RegisteredPlugin } from "./registry";
