import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Public, type RequestUser } from "../common/decorators";
import { AuthService } from "./auth.service";
import { AuthUserResponseDto, TokenResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Login with email and password" })
  @ApiOkResponse({ type: TokenResponseDto })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiOkResponse({ type: TokenResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiOkResponse({ type: AuthUserResponseDto })
  async me(@CurrentUser() user: RequestUser): Promise<AuthUserResponseDto> {
    const profile = await this.authService.getProfile(user.id);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      roles: profile.roles.map((role) => role.code),
      permissions: profile.permissions.map((permission) => permission.code),
    };
  }
}
