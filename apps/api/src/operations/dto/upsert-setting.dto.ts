import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertSettingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  key!: string;

  @ApiProperty()
  value!: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
