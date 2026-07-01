import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/auth.decorator";
import { ApiKeyAuth } from "../common/decorators/api-key.decorator";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { ApiKeyUsageInterceptor } from "../common/interceptors/api-key-usage.interceptor";
import {
  NotFoundIfNullInterceptor,
  PublicCacheInterceptor,
} from "../common/interceptors/public-cache.interceptor";
import { PublicApiService } from "./public-api.service";

@ApiTags("Public API v1")
@ApiSecurity("apiKey")
@ApiHeader({ name: "X-Api-Key", description: "API key (atcms_...)" })
@Controller("api/v1")
@Public()
@Throttle({ default: { ttl: 60_000, limit: 120 } })
@UseGuards(ApiKeyGuard)
@UseInterceptors(ApiKeyUsageInterceptor, PublicCacheInterceptor)
export class PublicApiController {
  constructor(private readonly publicApi: PublicApiService) {}

  @Get("tools")
  @ApiKeyAuth("tools:read")
  @ApiOperation({ summary: "List published tools (cursor pagination)" })
  listTools(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    return this.publicApi.listTools(limit ? Number(limit) : undefined, cursor);
  }

  @Get("tools/:slug")
  @ApiKeyAuth("tools:read")
  @ApiOperation({ summary: "Get tool by slug" })
  @UseInterceptors(NotFoundIfNullInterceptor)
  getTool(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.publicApi.getTool(slug, locale);
  }

  @Get("categories")
  @ApiKeyAuth("categories:read")
  @ApiOperation({ summary: "List or search categories" })
  listCategories(
    @Query("q") query?: string,
    @Query("slug") slug?: string,
    @Query("limit") limit?: string,
  ) {
    return this.publicApi.listCategories(query, slug, limit ? Number(limit) : undefined);
  }

  @Get("tags")
  @ApiKeyAuth("categories:read")
  @ApiOperation({ summary: "List tags" })
  listTags(@Query("q") query?: string, @Query("limit") limit?: string) {
    return this.publicApi.listTags(query, limit ? Number(limit) : undefined);
  }

  @Get("search")
  @ApiKeyAuth("search:read")
  @ApiOperation({ summary: "Search AI tools" })
  search(
    @Query("q") q?: string,
    @Query("keyword") keyword?: string,
    @Query("category") category?: string,
    @Query("tag") tag?: string,
    @Query("pricing") pricing?: string,
    @Query("platform") platform?: string,
    @Query("language") language?: string,
    @Query("sort") sort?: "relevance" | "popularity" | "newest" | "rating",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("semantic") semantic?: string,
  ) {
    return this.publicApi.search({
      keyword: keyword ?? q,
      category,
      tag,
      pricing,
      platform,
      language,
      sort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      semantic: semantic !== "false",
    });
  }

  @Get("trending")
  @ApiKeyAuth("search:read")
  @ApiOperation({ summary: "Trending AI tools" })
  trending(
    @Query("period") period?: "weekly" | "monthly" | "yearly",
    @Query("limit") limit?: string,
  ) {
    return this.publicApi.trending(period, limit ? Number(limit) : undefined);
  }

  @Get("compare")
  @ApiKeyAuth("compare:read")
  @ApiOperation({ summary: "Compare tools by slugs or compare page slug" })
  compare(@Query("slugs") slugs?: string, @Query("comparePageSlug") comparePageSlug?: string) {
    const slugList = slugs
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return this.publicApi.compare(slugList, comparePageSlug);
  }

  @Get("alternatives/:slug")
  @ApiKeyAuth("tools:read")
  @ApiOperation({ summary: "Alternative tools for a given tool" })
  alternatives(@Param("slug") slug: string, @Query("limit") limit?: string) {
    return this.publicApi.alternatives(slug, limit ? Number(limit) : undefined);
  }

  @Get("pricing")
  @ApiKeyAuth("tools:read")
  @ApiOperation({ summary: "Query tool pricing" })
  pricing(
    @Query("slug") slug?: string,
    @Query("pricingModel") pricingModel?: string,
    @Query("maxAmount") maxAmount?: string,
    @Query("limit") limit?: string,
  ) {
    return this.publicApi.pricing(
      slug,
      pricingModel,
      maxAmount ? Number(maxAmount) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get("latest")
  @ApiKeyAuth("search:read")
  @ApiOperation({ summary: "Latest published AI tools" })
  latest(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    return this.publicApi.latest(limit ? Number(limit) : undefined, cursor);
  }
}
