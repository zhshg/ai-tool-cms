import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CrawlSchedule, CrawlSourceStatus } from "@ai-tool-cms/database";

const CRAWL_SOURCE_KIND_VALUES = ["TOOLS", "NEWS", "BLOG", "CUSTOM"] as const;
const CRAWL_RULE_TYPE_VALUES = ["LIST", "DETAIL", "CONTENT"] as const;
const CRAWL_FIELD_TYPE_VALUES = [
  "TEXT",
  "HTML",
  "URL",
  "IMAGE",
  "NUMBER",
  "BOOLEAN",
  "JSON",
  "ARRAY",
  "DATE",
] as const;
const CRAWL_RECORD_STATUS_VALUES = [
  "PENDING",
  "PARSED",
  "CLEANED",
  "PUBLISHED",
  "FAILED",
  "SKIPPED",
] as const;

type CrawlSourceKind = (typeof CRAWL_SOURCE_KIND_VALUES)[number];
type CrawlRuleType = (typeof CRAWL_RULE_TYPE_VALUES)[number];
type CrawlFieldType = (typeof CRAWL_FIELD_TYPE_VALUES)[number];
type CrawlRecordStatus = (typeof CRAWL_RECORD_STATUS_VALUES)[number];

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

  @ApiPropertyOptional({ enum: CRAWL_SOURCE_KIND_VALUES })
  @IsOptional()
  @IsIn(CRAWL_SOURCE_KIND_VALUES)
  kind?: CrawlSourceKind;

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

  @ApiPropertyOptional({ enum: CRAWL_SOURCE_KIND_VALUES })
  @IsOptional()
  @IsIn(CRAWL_SOURCE_KIND_VALUES)
  kind?: CrawlSourceKind;

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

export class CreateCrawlRuleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty({ enum: CRAWL_RULE_TYPE_VALUES })
  @IsIn(CRAWL_RULE_TYPE_VALUES)
  ruleType!: CrawlRuleType;

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
  listConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  detailConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parseConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  requestConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCrawlRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: CRAWL_RULE_TYPE_VALUES })
  @IsOptional()
  @IsIn(CRAWL_RULE_TYPE_VALUES)
  ruleType?: CrawlRuleType;

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
  listConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  detailConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parseConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  requestConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RunCrawlRuleDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dedupeExisting?: boolean;
}

export class CreateCrawlFieldDefineDto {
  @ApiProperty()
  @IsString()
  fieldKey!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ enum: CRAWL_FIELD_TYPE_VALUES })
  @IsIn(CRAWL_FIELD_TYPE_VALUES)
  fieldType!: CrawlFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourcePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArray?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCrawlFieldDefineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ enum: CRAWL_FIELD_TYPE_VALUES })
  @IsOptional()
  @IsIn(CRAWL_FIELD_TYPE_VALUES)
  fieldType?: CrawlFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourcePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArray?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CrawlRecordsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiPropertyOptional({ enum: CRAWL_RECORD_STATUS_VALUES })
  @IsOptional()
  @IsIn(CRAWL_RECORD_STATUS_VALUES)
  status?: CrawlRecordStatus;
}

const CRAWL_TEST_PHASE_VALUES = ["LIST", "DETAIL", "CONTENT"] as const;
type CrawlTestPhase = (typeof CRAWL_TEST_PHASE_VALUES)[number];

export class PreviewCrawlStepDto {
  @ApiProperty({ enum: CRAWL_TEST_PHASE_VALUES })
  @IsIn(CRAWL_TEST_PHASE_VALUES)
  phase!: CrawlTestPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleId?: string;
}
