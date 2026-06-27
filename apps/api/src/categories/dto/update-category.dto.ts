import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateCategoryDto } from "./create-category.dto";

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ example: "ai-writing" })
  declare slug?: string;

  @ApiPropertyOptional({ example: "AI 写作" })
  declare name?: string;

  @ApiPropertyOptional()
  declare description?: string;
}
