import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class SeoProviderConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  siteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  propertyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  oauthAccessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  oauthRefreshToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  verificationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  disconnectReason?: string;
}

export class SeoGeneralConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  robots?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sitemapEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canonicalEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openGraphEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twitterEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  indexNowEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  indexNowKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  analyticsProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  ga4MeasurementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  ga4ApiSecret?: string;
}

export class UpdateSeoIntegrationsDto {
  @ApiPropertyOptional({ type: SeoProviderConfigDto })
  @IsOptional()
  @IsObject()
  googleSearchConsole?: SeoProviderConfigDto;

  @ApiPropertyOptional({ type: SeoProviderConfigDto })
  @IsOptional()
  @IsObject()
  bingWebmaster?: SeoProviderConfigDto;

  @ApiPropertyOptional({ type: SeoGeneralConfigDto })
  @IsOptional()
  @IsObject()
  general?: SeoGeneralConfigDto;
}
