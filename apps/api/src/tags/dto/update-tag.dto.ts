import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateTagDto } from "./create-tag.dto";

export class UpdateTagDto extends PartialType(CreateTagDto) {
  @ApiPropertyOptional({ example: "productivity" })
  declare slug?: string;

  @ApiPropertyOptional({ example: "效率工具" })
  declare name?: string;
}
