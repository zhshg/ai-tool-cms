import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { TagsModule } from "../tags/tags.module";
import { ToolsController } from "./tools.controller";
import { ToolsService } from "./tools.service";

@Module({
  imports: [CategoriesModule, TagsModule],
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
