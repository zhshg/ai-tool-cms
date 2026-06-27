import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToolPricing, ToolStatus } from "@prisma/client";
import { CategorySummaryDto, TagSummaryDto } from "../../common/dto/relation.dto";

export class ToolResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "chatgpt" })
  slug!: string;

  @ApiProperty({ example: "ChatGPT" })
  name!: string;

  @ApiPropertyOptional({ example: "OpenAI 对话式 AI 助手" })
  description!: string | null;

  @ApiProperty({ example: "https://chat.openai.com" })
  website!: string;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  logo!: string | null;

  @ApiProperty({ enum: ToolPricing, example: ToolPricing.FREEMIUM })
  pricing!: ToolPricing;

  @ApiProperty({ enum: ToolStatus, example: ToolStatus.DRAFT })
  status!: ToolStatus;

  @ApiPropertyOptional({ example: "2026-06-27T00:00:00.000Z" })
  publishedAt!: string | null;

  @ApiProperty({ type: [CategorySummaryDto] })
  categories!: CategorySummaryDto[];

  @ApiProperty({ type: [TagSummaryDto] })
  tags!: TagSummaryDto[];

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  updatedAt!: string;
}
