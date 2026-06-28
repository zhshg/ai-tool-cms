import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateToolDto } from "./create-tool.dto";

export class UpdateToolDto extends PartialType(CreateToolDto) {
  @ApiPropertyOptional({ example: "chatgpt" })
  declare slug?: string;

  @ApiPropertyOptional({ example: "ChatGPT" })
  declare name?: string;

  @ApiPropertyOptional()
  declare description?: string;

  @ApiPropertyOptional({ example: "https://chat.openai.com" })
  declare website?: string;

  @ApiPropertyOptional()
  declare logo?: string;

  @ApiPropertyOptional()
  declare pricing?: CreateToolDto["pricing"];

  @ApiPropertyOptional()
  declare status?: CreateToolDto["status"];

  @ApiPropertyOptional()
  declare publishedAt?: string;
}
