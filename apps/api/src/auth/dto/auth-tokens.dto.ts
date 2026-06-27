import { ApiProperty } from "@nestjs/swagger";

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: "15m" })
  accessTokenExpiresIn!: string;

  @ApiProperty({ example: "7d" })
  refreshTokenExpiresIn!: string;
}
