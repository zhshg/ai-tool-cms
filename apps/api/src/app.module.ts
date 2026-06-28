import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import appConfig from "./config/app.config";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { HealthModule } from "./health/health.module";
import { LoggerModule } from "./logger/logger.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RbacModule } from "./rbac/rbac.module";
import { TagsModule } from "./tags/tags.module";
import { ToolsModule } from "./tools/tools.module";
import { CrawlerModule } from "./crawler/crawler.module";
import { AiModule } from "./ai/ai.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { SeoModule } from "./seo/seo.module";
import { SearchModule } from "./search/search.module";
import { CommercialModule } from "./commercial/commercial.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: [
        join(__dirname, "..", "..", "..", ".env"),
        join(__dirname, "..", "..", ".env"),
        ".env",
      ],
    }),
    LoggerModule,
    PrismaModule,
    RbacModule,
    AuthModule,
    HealthModule,
    CategoriesModule,
    TagsModule,
    ToolsModule,
    CrawlerModule,
    AiModule,
    SeoModule,
    SearchModule,
    AnalyticsModule,
    CommercialModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
