import { Module } from "@nestjs/common";
import { GlobalController, I18nController } from "./i18n.controller";
import { I18nApiService } from "./i18n.service";

@Module({
  controllers: [I18nController, GlobalController],
  providers: [I18nApiService],
  exports: [I18nApiService],
})
export class I18nModule {}
