import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { Public, RequirePermission } from "../common/decorators";
import { I18nApiService } from "./i18n.service";

@ApiTags("i18n")
@Controller("i18n")
export class I18nController {
  constructor(private readonly i18nService: I18nApiService) {}

  @Public()
  @Get("locales")
  @ApiOperation({ summary: "Supported locales (Commit 071)" })
  locales() {
    return this.i18nService.locales();
  }

  @Public()
  @Get("cdn")
  @ApiOperation({ summary: "CDN & edge cache config (Commit 079)" })
  cdn() {
    return this.i18nService.cdnConfig();
  }

  @Get("tools/:toolId/translations")
  @RequirePermission(PermissionCode.I18nRead)
  @ApiOperation({ summary: "Translation status per tool (Commit 075)" })
  toolTranslations(@Param("toolId") toolId: string) {
    return this.i18nService.toolTranslations(toolId);
  }

  @Public()
  @Get("tools/:toolId/resolve")
  resolveTool(@Param("toolId") toolId: string, @Query("locale") locale = "en") {
    return this.i18nService.resolveTool(toolId, locale);
  }

  @Post("tools/:toolId/translate")
  @RequirePermission(PermissionCode.I18nManage)
  @ApiOperation({ summary: "Trigger translation workflow (Commit 076)" })
  translate(@Param("toolId") toolId: string, @Body() body: { targetLocale: string }) {
    return this.i18nService.triggerTranslation(toolId, body.targetLocale);
  }

  @Post("tools/:toolId/translate-all")
  @RequirePermission(PermissionCode.I18nManage)
  translateAll(@Param("toolId") toolId: string, @Body() body: { locales?: string[] }) {
    return this.i18nService.triggerAllLocales(toolId, body.locales);
  }

  @Get("regional-seo")
  @RequirePermission(PermissionCode.I18nRead)
  @ApiOperation({ summary: "Regional SEO configs (Commit 073)" })
  regionalSeo() {
    return this.i18nService.listRegionalSeo();
  }

  @Post("regional-seo")
  @RequirePermission(PermissionCode.I18nManage)
  upsertRegionalSeo(
    @Body()
    body: {
      region: string;
      locale: string;
      keywords?: string[];
      metaTitle?: string;
      metaDescription?: string;
      aiSummary?: string;
    },
  ) {
    return this.i18nService.upsertRegionalSeo(body);
  }

  @Public()
  @Get("hreflang")
  hreflang(@Query("path") path: string) {
    return this.i18nService.hreflang(path ?? "/");
  }

  @Get("translation-jobs")
  @RequirePermission(PermissionCode.I18nRead)
  translationJobs(@Query("toolId") toolId?: string) {
    return this.i18nService.translationJobs(toolId);
  }
}

@ApiTags("global")
@Controller("global")
export class GlobalController {
  constructor(private readonly i18nService: I18nApiService) {}

  @Get("dashboard")
  @RequirePermission(PermissionCode.GlobalRead)
  @ApiOperation({ summary: "Global Launch Dashboard (Commit 080)" })
  dashboard() {
    return this.i18nService.globalDashboard();
  }

  @Get("countries")
  @RequirePermission(PermissionCode.GlobalRead)
  @ApiOperation({ summary: "Country analytics (Commit 077)" })
  countries(@Query("periodKey") periodKey?: string) {
    return this.i18nService.countryAnalytics(periodKey);
  }
}
