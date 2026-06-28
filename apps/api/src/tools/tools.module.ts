import { Module } from "@nestjs/common";
import { GrowthModule } from "../growth/growth.module";
import { ToolVersionsService } from "./tool-versions.service";
import { ToolsController } from "./tools.controller";
import { ToolsService } from "./tools.service";

@Module({
  imports: [GrowthModule],
  controllers: [ToolsController],
  providers: [ToolsService, ToolVersionsService],
  exports: [ToolsService, ToolVersionsService],
})
export class ToolsModule {}
