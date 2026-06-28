# Prompt Catalog

All LLM prompts live here as **Markdown files** — not in TypeScript. Edit prompts to improve AI output **without redeploying application code** (reload workers or call `PromptEngine.reload()`).

## Layout

```
prompts/
  registry.yaml              # catalog manifest: versions, locales, A/B weights
  _shared/
    system.default.md          # default system message (referenced by registry)
  catalog/
    {templateId}/
      v{version}/
        {locale}/
          {variant}.md         # user message body (+ optional YAML frontmatter)
```

## Example path

`catalog/summary/v1/en/default.md` — summary template, version 1, English, default variant.

## Features

| Feature | How |
|---------|-----|
| Markdown templates | Edit `.md` files |
| Versioning | `v1/`, `v2/` folders + `latestVersion` in `registry.yaml` |
| Multi-language | `en/`, `zh-CN/` locale folders |
| A/B testing | Multiple variants per locale with `weight` in `registry.yaml` |
| Hot reload (future) | `PromptEngine.reload()` re-reads disk; admin API can override path |

## Variables

Templates use `{{variable}}` interpolation:

- `{{tool_name}}`, `{{description}}`, `{{category}}`, `{{features}}`
- `{{website}}`, `{{summary}}`, `{{slug}}`, `{{locale}}`

## A/B selection

Set `variant: auto` in `registry.yaml` defaults. Variant chosen by weighted bucket:

- `ToolPromptContext.abBucket` (0–99), or
- deterministic hash of `templateId + version + locale`

Example: `summary` v1 en has `default` (70%) and `concise` (30%).

## Adding a new version

1. Copy `catalog/summary/v1/` → `catalog/summary/v2/`
2. Edit prompt content
3. Update `registry.yaml` → `summary.latestVersion: "2"`

## Adding a locale

1. Create `catalog/{id}/v1/zh-CN/default.md`
2. Add `zh-CN` to `registry.yaml` → `templates.{id}.versions.1.locales`

## Code usage

```ts
import { PromptEngine } from "@ai-tool-cms/ai";

const engine = new PromptEngine();
const messages = engine.buildMessages("summary", {
  tool_name: "ChatGPT",
  locale: "zh-CN",
  abBucket: 42,
});
```

After editing files on a running worker:

```ts
engine.reload();
```
