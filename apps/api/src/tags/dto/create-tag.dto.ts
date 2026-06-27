import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateTagDto {
  @ApiProperty({ example: "productivity" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug 仅允许小写字母、数字与连字符",
  })
  slug!: string;

  @ApiProperty({ example: "效率工具" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
