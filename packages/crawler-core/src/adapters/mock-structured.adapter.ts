import type { CrawlerContext } from "../context";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolListItemDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";
import { MOCK_SOURCE_FIXTURES, type MockSourceFixtures } from "../fixtures/mock-source.fixtures";

const PAGE_SIZE = 2;

/**
 * Framework validation adapter — reads local fixtures, no external HTTP (Sprint 3 strategy).
 *
 * Exercises the same StructuredSiteAdapter contract (getCategories / getTools / getDetail / normalize)
 * that production site adapters will implement later.
 */
export class MockStructuredAdapter extends StructuredSiteAdapter {
  readonly sourceId = "mock";
  readonly displayName = "Mock Source (Local Fixtures)";

  readonly config = {
    baseUrl: "https://mock.ai-tool-cms.local",
    categoriesPath: "/api/categories",
    toolsPath: "/api/tools",
    detailPathTemplate: "/api/tools/{id}",
    listKey: "items",
  };

  constructor(private readonly fixtures: MockSourceFixtures = MOCK_SOURCE_FIXTURES) {
    super();
  }

  async getCategories(_ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    return this.fixtures.categories;
  }

  async getTools(
    _ctx: CrawlerContext,
    category?: CrawlCategoryDTO,
    cursor?: CrawlCursor,
  ): Promise<{ items: CrawlToolListItemDTO[]; cursor?: CrawlCursor }> {
    const page = cursor?.page ?? 1;
    const filtered =
      category && category.externalId !== "all"
        ? this.fixtures.tools.filter((tool) =>
            tool.categoryExternalIds?.includes(category.externalId),
          )
        : this.fixtures.tools;

    const start = (page - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);
    const hasMore = start + PAGE_SIZE < filtered.length;

    return {
      items: slice,
      cursor: hasMore ? { page: page + 1, metadata: { category } } : undefined,
    };
  }

  async getDetail(_ctx: CrawlerContext, item: CrawlToolListItemDTO) {
    const detail = this.fixtures.details.find((row) => row.externalId === item.externalId);
    if (!detail) {
      return {
        ...item,
        description: item.summary,
        raw: item as unknown as Record<string, unknown>,
      };
    }
    return { ...detail, raw: detail as unknown as Record<string, unknown> };
  }
}
