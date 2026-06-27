import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtAccessPayload } from "@ai-tool-cms/auth";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("auth.jwtSecret", "development-jwt-secret"),
    });
  }

  async validate(payload: JwtAccessPayload) {
    if (payload.type !== "access") {
      throw new UnauthorizedException("无效的访问令牌");
    }

    return this.authService.getAuthUserById(payload.sub);
  }
}
