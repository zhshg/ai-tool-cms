import { ApiPropertyOptional } from "@nestjs/swagger";
import { ToolPricing, ToolStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class QueryToolsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "搜索名称、slug、描述或官网" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    enum: ["name", "slug", "createdAt", "updatedAt", "publishedAt", "status", "pricing"],
    default: "createdAt",
  })
  @IsOptional()
  @IsIn(["name", "slug", "createdAt", "updatedAt", "publishedAt", "status", "pricing"])
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @ApiPropertyOptional({ enum: ToolPricing })
  @IsOptional()
  @IsEnum(ToolPricing)
  pricing?: ToolPricing;

  @ApiPropertyOptional({ description: "按分类 ID 筛选" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "按标签 ID 筛选" })
  @IsOptional()
  @IsString()
  tagId?: string;
}
