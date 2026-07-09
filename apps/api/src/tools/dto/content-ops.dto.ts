import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

class ImportToolRecordDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsUrl()
  website!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PricingModel })
  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categorySlugs?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagSlugs?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useCases?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternatives?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;
}

export class ImportPreviewDto {
  @ApiProperty({ enum: ["csv", "json"] })
  @IsIn(["csv", "json"])
  format!: "csv" | "json";

  @ApiProperty()
  @IsString()
  content!: string;
}

export class ImportExecuteDto extends ImportPreviewDto {
  @ApiPropertyOptional({ enum: ToolStatus })
  @IsOptional()
  @IsEnum(ToolStatus)
  defaultStatus?: ToolStatus;

  @ApiPropertyOptional()
  @IsOptional()
  skipDuplicates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  limit?: number;
}

export class BulkUpdateToolsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  toolIds!: string[];

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @ApiPropertyOptional({ enum: PricingModel })
  @IsOptional()
  @IsEnum(PricingModel)
  pricingModel?: PricingModel;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BulkPublishToolsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  toolIds!: string[];
}

export class BulkLogoRefreshDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  toolIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  force?: boolean;
}

export class BulkScreenshotRefreshDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  toolIds!: string[];

  @ApiPropertyOptional({ type: [String], enum: ["DESKTOP", "MOBILE", "DARK"] })
  @IsOptional()
  @IsArray()
  @IsIn(["DESKTOP", "MOBILE", "DARK"], { each: true })
  variants?: Array<"DESKTOP" | "MOBILE" | "DARK">;
}

export class ImportRecordsDto {
  @ApiProperty({ type: [ImportToolRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportToolRecordDto)
  records!: ImportToolRecordDto[];
}
