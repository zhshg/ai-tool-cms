import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsString } from "class-validator";

export class SetToolCategoriesDto {
  @ApiProperty({ type: [String], example: ["clxxxxxxxx"] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoryIds!: string[];
}

export class SetToolTagsDto {
  @ApiProperty({ type: [String], example: ["clxxxxxxxx"] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tagIds!: string[];
}
