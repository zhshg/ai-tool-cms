import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ToolStatus } from "@ai-tool-cms/database";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class VersionPricingTierDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingPeriod?: string;
}

export class VersionPricingDto {
  @ApiProperty({
    enum: ["FREE", "FREEMIUM", "PAID", "ENTERPRISE"],
    description: "Pricing model for this version snapshot",
  })
  @IsString()
  model!: "FREE" | "FREEMIUM" | "PAID" | "ENTERPRISE";

  @ApiPropertyOptional({ type: [VersionPricingTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VersionPricingTierDto)
  tiers?: VersionPricingTierDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];
}

export class CreateToolVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;

  @ApiPropertyOptional({ type: VersionPricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VersionPricingDto)
  pricing?: VersionPricingDto;

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
}

export class UpdateToolVersionDto extends CreateToolVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  versionNumber?: number;
}
