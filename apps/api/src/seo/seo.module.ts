import { Module } from "@nestjs/common";
import { SeoGoogleController } from "./seo-google.controller";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";

@Module({
  controllers: [SeoController, SeoGoogleController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
