# Tool Editor Data Flow Audit

## Scope

本报告只做实现审计，不修改代码。

核查链路：

1. Admin Tool Edit
2. `POST / PUT /v1/tools/:id`
3. Database write path
4. `GET /v1/tools/:id`
5. Admin reload
6. Public Tool Detail

核查字段：

- `logoUrl`
- `features`
- `screenshots`
- `faq`
- `tags`
- `alternatives`
- `category`
- `pricing`
- `description`

## End-to-End Flow

### Admin Edit Submit

- Admin 表单构造提交 payload：[`tool-editor-form.tsx:174`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:174 )
- Admin 调用 `PUT /tools/:id`：[`api.ts:532`]( /F:/project/ai-tool-cms/apps/admin/src/lib/api.ts:532 )
- API 控制器接收 `UpdateToolDto`：[`tools.controller.ts:137`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.controller.ts:137 )
- Service 执行 `tool.update` 与关联表同步：[`tools.service.ts:131`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:131 )

### Admin Reload

- Admin 编辑页加载时调用 `fetchToolById`：[`tool-editor-form.tsx:89`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:89 )
- Admin `GET /tools/:id`：[`api.ts:521`]( /F:/project/ai-tool-cms/apps/admin/src/lib/api.ts:521 )
- API 控制器读取：[`tools.controller.ts:88`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.controller.ts:88 )
- Service `findById` 返回 Prisma 查询结果：[`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )

### Public Tool Detail

- Public 数据装配入口：[`tool-page.ts:105`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:105 )
- Public 详情页渲染入口：[`tool-detail-page.tsx:13`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:13 )

## Field Audit

### 1. `logoUrl`

Status: `PASS`

Trace:

- Frontend field: [`tool-editor-form.tsx:325`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:325 )
- Submit payload: [`tool-editor-form.tsx:180`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:180 )
- API DTO: [`tool.dto.ts:156`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:156 )
- Service write: [`tools.service.ts:143`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:143 )
- Prisma schema: [`schema.prisma:592`]( /F:/project/ai-tool-cms/prisma/schema.prisma:592 )
- GET API response: `findById` 直接返回 `tool`，包含 scalar `logoUrl`：[`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )
- Admin reload mapping: [`tool-editor-form.tsx:109`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:109 )
- Public data loader: [`tool-page.ts:289`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:289 )
- Public rendering: [`tool-detail-page.tsx:53`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:53 )

Conclusion:

- `logoUrl` 从 Admin 到数据库、到 Admin reload、到 Public Tool Detail 全链路已打通。

### 2. `features`

Status: `PASS`

Trace:

- Frontend field: [`tool-editor-form.tsx:526`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:526 )
- Submit payload: [`tool-editor-form.tsx:187`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:187 )
- API DTO `metadata.features`: [`tool.dto.ts:15`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:15 )
- Service write to `Tool.metadata`: [`tools.service.ts:149`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:149 )
- Prisma schema JSON field: [`schema.prisma:602`]( /F:/project/ai-tool-cms/prisma/schema.prisma:602 )
- Admin reload mapping from `metadata.features`: [`tool-editor-form.tsx:129`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:129 )
- Public data loader reads `metadata.features`: [`tool-page.ts:459`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:459 )
- Public rendering: [`tool-detail-page.tsx:113`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:113 )

Conclusion:

- `features` 通过 `Tool.metadata.features` 完整持久化并在前台渲染。

### 3. `screenshots`

Status: `FAIL`

Trace:

- Frontend field: [`tool-editor-form.tsx:534`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:534 )
- Submit payload writes `metadata.screenshots`: [`tool-editor-form.tsx:187`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:187 )
- API DTO supports `metadata.screenshots`: [`tool.dto.ts:28`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:28 )
- Service writes `metadata`: [`tools.service.ts:149`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:149 )
- Prisma storage exists only in `Tool.metadata` JSON for this edit flow: [`schema.prisma:602`]( /F:/project/ai-tool-cms/prisma/schema.prisma:602 )
- Admin reload reads `metadata.screenshots`: [`tool-editor-form.tsx:130`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:130 )
- Public loader does **not** read `metadata.screenshots`; it only reads relation `toolScreenshots`: [`tool-page.ts:122`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:122 ), [`tool-page.ts:309`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:309 )
- Public rendering only uses `data.screenshots`: [`tool-detail-page.tsx:159`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:159 )

Where it stops:

- Stops between persisted `Tool.metadata.screenshots` and Public serialization.
- Exact missing bridge: [`tool-page.ts:309`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:309 ) only serializes `tool.toolScreenshots`, ignoring `metadata.screenshots`.

Conclusion:

- `screenshots` 会写入数据库，也能在 Admin reload 中回显。
- 但 Public Tool Detail 不消费这份数据，所以前台不会显示编辑器录入的 screenshot URL。

### 4. `faq`

Status: `FAIL`

Trace:

- Frontend field: [`tool-editor-form.tsx:542`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:542 )
- Submit payload: [`tool-editor-form.tsx:191`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:191 )
- API DTO supports `faqs`: [`tool.dto.ts:199`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:199 )
- Service persists FAQs via relation table sync: [`tools.service.ts:155`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:155 ), [`tools.service.ts:370`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:370 )
- Prisma FAQ model: [`schema.prisma:819`]( /F:/project/ai-tool-cms/prisma/schema.prisma:819 )
- Public loader reads `faqs` relation: [`tool-page.ts:123`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:123 ), [`tool-page.ts:157`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:157 )
- Public rendering: [`tool-detail-page.tsx:219`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:219 )

Where it stops:

- Stops on Admin reload.
- `GET /tools/:id` does not include `faqs` in `toolInclude`: [`tools.service.ts:18`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:18 )
- `findById` returns only `toolInclude`: [`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )
- Admin reload expects `tool.faqs`: [`tool-editor-form.tsx:131`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:131 )

Conclusion:

- `faq` 会写进数据库，也会在 Public Tool Detail 渲染。
- 但 Admin 保存后再次加载编辑页时，`faqs` 不会被 GET API 带回，因此编辑器回显链路是断的。

### 5. `tags`

Status: `PASS`

Trace:

- Frontend field: 已选 tag 区与 picker：[`tool-editor-form.tsx:425`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:425 ), [`tool-editor-form.tsx:455`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:455 )
- Submit payload `tagIds`: [`tool-editor-form.tsx:183`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:183 )
- API DTO: [`tool.dto.ts:187`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:187 )
- Service relation sync: [`tools.service.ts:154`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:154 ), [`tools.service.ts:346`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:346 )
- Prisma relation: [`schema.prisma:670`]( /F:/project/ai-tool-cms/prisma/schema.prisma:670 )
- GET API response includes tags in `toolInclude`: [`tools.service.ts:23`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:23 )
- Admin reload mapping: [`tool-editor-form.tsx:122`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:122 )
- Public loader mapping: [`tool-page.ts:153`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:153 )
- Public rendering: [`tool-detail-page.tsx:254`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:254 )

Conclusion:

- `tags` 全链路可持久化、可回显、可前台渲染。

### 6. `alternatives`

Status: `NOT IMPLEMENTED`

Trace:

- Admin Tool Editor 无 `alternatives` 输入字段：[`tool-editor-form.tsx:19`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:19 ) 到 [`tool-editor-form.tsx:699`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:699 ) 中无该字段
- API DTO 无 `alternatives`: [`tool.dto.ts:51`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:51 ) 到 [`tool.dto.ts:205`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:205 )
- Prisma `Tool` schema 无 `alternatives` 持久化字段: [`schema.prisma:584`]( /F:/project/ai-tool-cms/prisma/schema.prisma:584 )
- Public alternatives 为请求时动态计算，不是编辑器持久化结果：[`tool-page.ts:195`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:195 ), [`tool-page.ts:351`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:351 )
- Public rendering: [`tool-detail-page.tsx:186`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:186 )

Conclusion:

- `alternatives` 当前不是 Tool Editor 可编辑/可持久化字段。
- 它是 Public Tool Detail 的运行时推荐结果。

### 7. `category`

Status: `PASS`

Trace:

- Frontend field `primaryCategoryId`: [`tool-editor-form.tsx:354`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:354 )
- Submit payload `categoryIds`: [`tool-editor-form.tsx:182`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:182 )
- API DTO: [`tool.dto.ts:181`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:181 )
- Service sync: [`tools.service.ts:153`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:153 ), [`tools.service.ts:331`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:331 )
- Prisma relation: [`schema.prisma:648`]( /F:/project/ai-tool-cms/prisma/schema.prisma:648 )
- GET API response includes categories in `toolInclude`: [`tools.service.ts:18`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:18 )
- Admin reload mapping: [`tool-editor-form.tsx:118`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:118 )
- Public loader mapping: [`tool-page.ts:147`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:147 )
- Public rendering: breadcrumb and category chips at [`tool-detail-page.tsx:39`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:39 ), [`tool-detail-page.tsx:236`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:236 )

Conclusion:

- `category` 全链路已打通。

### 8. `pricing`

Status: `PASS`

Trace:

- Frontend field `pricingModel`: [`tool-editor-form.tsx:372`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:372 )
- Submit payload: [`tool-editor-form.tsx:184`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:184 )
- API DTO: [`tool.dto.ts:161`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:161 )
- Service write: [`tools.service.ts:144`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:144 )
- Prisma schema: [`schema.prisma:593`]( /F:/project/ai-tool-cms/prisma/schema.prisma:593 )
- GET API response scalar: [`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )
- Admin reload mapping: [`tool-editor-form.tsx:126`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:126 )
- Public loader mapping: [`tool-page.ts:291`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:291 )
- Public rendering: badge at [`tool-detail-page.tsx:70`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:70 ) and pricing fallback note at [`tool-detail-page.tsx:153`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:153 )

Conclusion:

- Editor 当前保存的是 `pricingModel`，不是 `PricingPlan` 明细。
- 对 `pricingModel` 这条链路本身，持久化与渲染是正常的。

### 9. `description`

Status: `PASS`

Trace:

- Frontend field `description`: [`tool-editor-form.tsx:314`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:314 )
- Submit payload: [`tool-editor-form.tsx:179`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:179 )
- API DTO: [`tool.dto.ts:146`]( /F:/project/ai-tool-cms/apps/api/src/tools/dto/tool.dto.ts:146 )
- Service write: [`tools.service.ts:141`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:141 )
- Prisma schema: [`schema.prisma:588`]( /F:/project/ai-tool-cms/prisma/schema.prisma:588 )
- GET API response scalar: [`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )
- Admin reload mapping: [`tool-editor-form.tsx:108`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:108 )
- Public loader fallback uses `tool.description` in `aiSummary`: [`tool-page.ts:139`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:139 )
- Public rendering of `aiSummary`: [`tool-detail-page.tsx:101`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:101 )

Conclusion:

- `description` 会被持久化并回显。
- 但 Public Detail 的主“Overview”区渲染的是 `longDescription`，不是 `description`：[`tool-detail-page.tsx:105`]( /F:/project/ai-tool-cms/apps/web/src/components/seo/tool-detail-page.tsx:105 )
- 当前 `description` 在前台的实际用途是 `AI Summary` 的 fallback，而不是独立长文区。

## Summary Matrix

| Field | Admin Submit | DB Persist | GET Reload | Public Render | Status |
|---|---|---:|---:|---:|---|
| `logoUrl` | Yes | Yes | Yes | Yes | `PASS` |
| `features` | Yes | Yes (`Tool.metadata`) | Yes | Yes | `PASS` |
| `screenshots` | Yes | Yes (`Tool.metadata`) | Yes | No | `FAIL` |
| `faq` | Yes | Yes (`Faq`) | No | Yes | `FAIL` |
| `tags` | Yes | Yes (`ToolTag`) | Yes | Yes | `PASS` |
| `alternatives` | No editor field | No persisted field | N/A | Dynamic only | `NOT IMPLEMENTED` |
| `category` | Yes | Yes (`ToolCategory`) | Yes | Yes | `PASS` |
| `pricing` | Yes (`pricingModel`) | Yes | Yes | Yes | `PASS` |
| `description` | Yes | Yes | Yes | Yes, as fallback | `PASS` |

## Exact Fail Points

### `screenshots`

- Fails at Public serialization layer.
- Exact file and line:
  - [`tool-page.ts:309`]( /F:/project/ai-tool-cms/apps/web/src/lib/tool-page.ts:309 )
- Reason:
  - Public uses `tool.toolScreenshots`, not `Tool.metadata.screenshots`.

### `faq`

- Fails at GET Tool API response for Admin reload.
- Exact file and lines:
  - [`tools.service.ts:18`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:18 )
  - [`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 )
  - [`tool-editor-form.tsx:131`]( /F:/project/ai-tool-cms/apps/admin/src/components/tools/tool-editor-form.tsx:131 )
- Reason:
  - Service `toolInclude` does not include `faqs`, but Admin reload expects `tool.faqs`.

## Notes

- 当前 Tool API 没有单独的“Response DTO / serializer”层；`findById` 与 `findBySlug` 直接返回 Prisma 查询结果：[`tools.service.ts:60`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:60 ), [`tools.service.ts:69`]( /F:/project/ai-tool-cms/apps/api/src/tools/tools.service.ts:69 )
- 因此很多字段是否能回到前端，取决于 `include` 是否把 relation 带出来。
