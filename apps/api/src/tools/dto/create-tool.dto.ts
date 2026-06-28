import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToolPricing, ToolStatus } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateToolDto {
  @ApiProperty({ example: "chatgpt" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug 仅允许小写字母、数字与连字符",
  })
  slug!: string;

  @ApiProperty({ example: "ChatGPT" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: "OpenAI 对话式 AI 助手" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: "https://chat.openai.com" })
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website!: string;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logo?: string;

  @ApiProperty({ enum: ToolPricing, example: ToolPricing.FREEMIUM })
  @IsEnum(ToolPricing)
  pricing!: ToolPricing;

  @ApiPropertyOptional({ enum: ToolStatus, default: ToolStatus.DRAFT })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @ApiPropertyOptional({ example: "2026-06-27T00:00:00.000Z" })
  @IsOptional()
  @IsString()
  publishedAt?: string;
}
