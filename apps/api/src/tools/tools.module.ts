import { Module } from "@nestjs/common";
import { ToolVersionsService } from "./tool-versions.service";
import { ToolsController } from "./tools.controller";
import { ToolsService } from "./tools.service";

@Module({
  controllers: [ToolsController],
  providers: [ToolsService, ToolVersionsService],
  exports: [ToolsService, ToolVersionsService],
})
export class ToolsModule {}
