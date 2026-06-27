import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LogoutDto {
  @ApiProperty({ description: "登录时返回的 Refresh Token" })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
