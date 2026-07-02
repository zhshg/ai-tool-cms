import { Body, Controller, Get, Header, Param, Post, Put, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import type { SitemapChunkId } from "@ai-tool-cms/seo";
import { CurrentUser, Public, RequirePermission, type RequestUser } from "../common/decorators";
import { UpdateSeoIntegrationsDto } from "./dto";
import { SeoService } from "./seo.service";

@ApiTags("seo")
@Controller("seo")
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.SeoRead)
  @ApiOperation({ summary: "SEO health dashboard (Commit 050)" })
  dashboard() {
    return this.seoService.getDashboard();
  }

  @Get("search-console")
  @RequirePermission(PermissionCode.SeoRead)
  @ApiOperation({ summary: "Google/Bing search console metrics (Commit 049)" })
  searchConsole() {
    return this.seoService.getSearchConsole();
  }

  @Get("integrations")
  @RequirePermission(PermissionCode.SeoRead)
  @ApiOperation({ summary: "SEO integrations configuration center" })
  integrations() {
    return this.seoService.getIntegrations();
  }

  @Put("integrations")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Persist SEO integrations configuration" })
  updateIntegrations(@Body() dto: UpdateSeoIntegrationsDto, @CurrentUser() user: RequestUser) {
    return this.seoService.updateIntegrations(dto, user.id);
  }

  @Post("integrations/:provider/disconnect")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Disconnect a webmaster integration" })
  disconnectIntegration(@Param("provider") provider: string, @CurrentUser() user: RequestUser) {
    return this.seoService.disconnectIntegration(provider, user.id);
  }

  @Post("integrations/:provider/refresh")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Refresh a webmaster integration snapshot" })
  refreshIntegration(@Param("provider") provider: string, @CurrentUser() user: RequestUser) {
    return this.seoService.refreshIntegration(provider, user.id);
  }

  @Public()
  @Get("sitemap-index.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @ApiOperation({ summary: "Sitemap index" })
  sitemapIndex(): Promise<string> {
    return this.seoService.getSitemapIndexXml();
  }

  @Public()
  @Get("sitemaps/:chunk")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @ApiOperation({ summary: "Sitemap chunk" })
  sitemapChunk(@Param("chunk") chunk: string): Promise<string> {
    const chunkId = chunk.replace(/\.xml$/, "") as SitemapChunkId;
    return this.seoService.getSitemapChunkXml(chunkId);
  }

  @Public()
  @Get("feed/:format")
  @ApiOperation({ summary: "RSS / Atom / JSON / API feeds (Commit 048)" })
  async feed(@Param("format") format: string, @Res() res: Response) {
    const normalized = format.replace(/\.(xml|json)$/, "") as "rss" | "atom" | "json" | "api";
    const result = await this.seoService.getFeeds(normalized);
    res.setHeader("Content-Type", result.contentType);
    res.send(typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2));
  }

  @Post("sync/compare-pages")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Generate compare/alternatives pages (Commit 046)" })
  syncCompare(@CurrentUser() _user: RequestUser) {
    return this.seoService.syncComparePages();
  }

  @Post("sync/internal-links")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Rebuild internal links (Commit 044)" })
  syncLinks(@CurrentUser() _user: RequestUser) {
    return this.seoService.syncInternalLinks();
  }

  @Post("sitemap/ping")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Ping Google/Bing sitemap (Commit 043)" })
  pingSitemaps() {
    return this.seoService.pingSitemaps();
  }
}
