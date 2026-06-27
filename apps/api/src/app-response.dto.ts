import { ApiProperty } from "@nestjs/swagger";

export class RootResponseDto {
  @ApiProperty({ example: "AI Tool CMS API" })
  name!: string;

  @ApiProperty({ example: "0.0.0" })
  version!: string;

  @ApiProperty({ example: "/docs" })
  docs!: string;

  @ApiProperty({ example: "/health" })
  health!: string;
}
