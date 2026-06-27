import { ApiProperty } from "@nestjs/swagger";
import { MeResponseDto } from "./me-response.dto";
import { AuthTokensDto } from "./auth-tokens.dto";

export class LoginResponseDto {
  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;

  @ApiProperty({ type: MeResponseDto })
  user!: MeResponseDto;
}
