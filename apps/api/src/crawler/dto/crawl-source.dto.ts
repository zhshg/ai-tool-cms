import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CrawlSchedule, CrawlSourceStatus } from "@ai-tool-cms/database";

export class CreateCrawlSourceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsUrl()
  baseUrl!: string;

  @ApiProperty()
  @IsString()
  adapterType!: string;

  @ApiPropertyOptional({ enum: CrawlSourceStatus })
  @IsOptional()
  @IsEnum(CrawlSourceStatus)
  status?: CrawlSourceStatus;

  @ApiPropertyOptional({ enum: CrawlSchedule })
  @IsOptional()
  @IsEnum(CrawlSchedule)
  schedule?: CrawlSchedule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10_080)
  crawlIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  robotsTxt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCrawlSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adapterType?: string;

  @ApiPropertyOptional({ enum: CrawlSourceStatus })
  @IsOptional()
  @IsEnum(CrawlSourceStatus)
  status?: CrawlSourceStatus;

  @ApiPropertyOptional({ enum: CrawlSchedule })
  @IsOptional()
  @IsEnum(CrawlSchedule)
  schedule?: CrawlSchedule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10_080)
  crawlIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  robotsTxt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCrawlFrequencyDto {
  @ApiProperty({ enum: CrawlSchedule })
  @IsEnum(CrawlSchedule)
  schedule!: CrawlSchedule;

  @ApiProperty()
  @IsInt()
  @Min(5)
  @Max(10_080)
  crawlIntervalMinutes!: number;
}

export class TriggerCrawlJobDto {
  @ApiProperty()
  @IsString()
  sourceId!: string;
}
