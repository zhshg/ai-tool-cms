import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { getEnv } from "@ai-tool-cms/config";
import {
  registerFrameworkAdapters,
  registerProductionSiteAdapters,
} from "@ai-tool-cms/crawler-core";

@Injectable()
export class CrawlerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerBootstrapService.name);

  onModuleInit() {
    registerFrameworkAdapters();

    if (getEnv().CRAWLER_ENABLE_PRODUCTION_ADAPTERS) {
      registerProductionSiteAdapters();
      this.logger.log("Production site adapters enabled for API preview");
    } else {
      this.logger.log("Production site adapters disabled for API preview");
    }
  }
}
