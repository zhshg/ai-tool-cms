import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators";
import { SeoService } from "./seo.service";

@ApiTags("seo")
@Controller("integrations/google/search-console")
export class SeoGoogleController {
  constructor(private readonly seoService: SeoService) {}

  @Public()
  @Get("callback")
  @ApiOperation({ summary: "Handle Google Search Console OAuth callback" })
  async handleGoogleSearchConsoleCallback(
    @Query("code") code: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.seoService.handleGoogleSearchConsoleCallback({ code, error });
    res
      .status(result.statusCode)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send(result.html);
  }
}
