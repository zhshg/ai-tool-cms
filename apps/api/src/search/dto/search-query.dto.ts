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

  @ApiPropertyOptional({ description: "Only tools with API or automation support" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  api?: boolean;

  @ApiPropertyOptional({ description: "Only free or freemium tools" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  free?: boolean;

  @ApiPropertyOptional({ description: "Only open-source tools" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openSource?: boolean;

  @ApiPropertyOptional({
    enum: ["relevance", "popular", "popularity", "trending", "newest", "a-z", "rating"],
  })
  @IsOptional()
  @IsIn(["relevance", "popular", "popularity", "trending", "newest", "a-z", "rating"])
  sort?: "relevance" | "popular" | "popularity" | "trending" | "newest" | "a-z" | "rating";

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

  @ApiPropertyOptional({ description: "BCP 47 locale for regional recommendations (Commit 078)" })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: "Region code e.g. us, jp, tw" })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class SearchSuggestionQueryDto {
  @ApiPropertyOptional({ description: "Partial query for autocomplete" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
