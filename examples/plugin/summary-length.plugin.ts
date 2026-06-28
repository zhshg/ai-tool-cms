/**
 * 示例插件 — 发布前校验 summary 长度
 */
import type { PluginDefinition } from "@ai-tool-cms/plugins";

export const summaryLengthPlugin: PluginDefinition = {
  id: "example-summary-length",
  name: "Summary Length Validator",
  version: "1.0.0",
  description: "Ensures tool summary is at least 20 characters before publish",
  hooks: {
    beforePublish: async (ctx) => {
      const summary = ctx.tool.summary ?? "";
      if (summary.length < 20) {
        return {
          allow: false,
          reason: `Summary too short (${summary.length} chars, min 20)`,
        };
      }
      return { allow: true };
    },
  },
};

export default summaryLengthPlugin;
