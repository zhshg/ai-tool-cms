import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class PublicSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search keyword", example: "AI PPT" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Alias for keyword", name: "q" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricing?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ enum: ["relevance", "popularity", "newest", "rating"] })
  @IsOptional()
  @IsIn(["relevance", "popularity", "newest", "rating"])
  sort?: "relevance" | "popularity" | "newest" | "rating";

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  semantic?: boolean;
}

export class TrendingQueryDto {
  @ApiPropertyOptional({ enum: ["weekly", "monthly", "yearly"], default: "weekly" })
  @IsOptional()
  @IsIn(["weekly", "monthly", "yearly"])
  period?: "weekly" | "monthly" | "yearly";

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class HomeRecommendationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  viewed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
