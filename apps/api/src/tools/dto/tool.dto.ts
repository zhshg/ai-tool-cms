import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class ToolMetadataDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiSummary?: string;
}

export class CreateToolDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiProperty()
  @IsUrl()
  website!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

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
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

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

  @ApiPropertyOptional({ type: ToolMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolMetadataDto)
  metadata?: ToolMetadataDto;
}

export class UpdateToolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

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
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

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

  @ApiPropertyOptional({ type: ToolMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolMetadataDto)
  metadata?: ToolMetadataDto;
}
