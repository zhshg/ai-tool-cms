import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsUUID } from "class-validator";

export class MergeDuplicateToolsDto {
  @ApiProperty()
  @IsUUID("4")
  sourceToolId!: string;

  @ApiProperty()
  @IsUUID("4")
  targetToolId!: string;
}

export class BulkImproveContentDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  toolIds?: string[];
}
