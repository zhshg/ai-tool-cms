import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategorySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "ai-writing" })
  slug!: string;

  @ApiProperty({ example: "AI 写作" })
  name!: string;
}

export class TagSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "productivity" })
  slug!: string;

  @ApiProperty({ example: "效率工具" })
  name!: string;
}

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "ai-writing" })
  slug!: string;

  @ApiProperty({ example: "AI 写作" })
  name!: string;

  @ApiPropertyOptional({ example: "AI 辅助写作类工具" })
  description!: string | null;

  @ApiProperty({ example: 0 })
  toolCount!: number;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  updatedAt!: string;
}

export class TagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "productivity" })
  slug!: string;

  @ApiProperty({ example: "效率工具" })
  name!: string;

  @ApiProperty({ example: 0 })
  toolCount!: number;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  updatedAt!: string;
}
