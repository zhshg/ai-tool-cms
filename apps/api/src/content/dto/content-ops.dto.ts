import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class MergeDuplicateToolsDto {
  @ApiProperty()
  @IsUUID("4")
  sourceToolId!: string;

  @ApiProperty()
  @IsUUID("4")
  targetToolId!: string;
}
