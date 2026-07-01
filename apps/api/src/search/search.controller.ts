import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PermissionCode } from "@ai-tool-cms/auth";
import { Public, RequirePermission } from "../common/decorators";
import {
  HomeRecommendationsQueryDto,
  PublicSearchQueryDto,
  TrendingQueryDto,
} from "./dto/search-query.dto";
import { SearchApiService } from "./search.service";

@ApiTags("search")
@Controller()
@Throttle({ default: { ttl: 60_000, limit: 60 } })
export class SearchController {
  constructor(private readonly searchService: SearchApiService) {}

  @Public()
  @Get("search")
  @ApiOperation({ summary: "Public search API (Commit 060)" })
  search(@Query() query: PublicSearchQueryDto) {
    return this.searchService.search(query);
  }

  @Public()
  @Get("trending")
  @ApiOperation({ summary: "Trending tools (Commit 056)" })
  trending(@Query() query: TrendingQueryDto) {
    return this.searchService.trending(query);
  }

  @Public()
  @Get("recommendations/home")
  @ApiOperation({ summary: "Homepage recommendation sections (Commit 055)" })
  home(@Query() query: HomeRecommendationsQueryDto) {
    return this.searchService.homeRecommendations(query);
  }

  @Public()
  @Get("tools/:slug/related")
  @ApiOperation({ summary: "Related tools (Commit 054)" })
  related(@Param("slug") slug: string, @Query("limit") limit?: string) {
    return this.searchService.relatedTools(slug, limit ? Number(limit) : 10);
  }

  @Get("search/dashboard")
  @RequirePermission(PermissionCode.SearchRead)
  @ApiOperation({ summary: "Search analytics dashboard (Commit 059)" })
  dashboard() {
    return this.searchService.getDashboard();
  }
}
