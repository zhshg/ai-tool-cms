import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "ai-writing" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug 仅允许小写字母、数字与连字符",
  })
  slug!: string;

  @ApiProperty({ example: "AI 写作" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: "AI 辅助写作类工具" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
