import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToolPricing, ToolStatus } from "@prisma/client";

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

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  updatedAt!: string;
}
