import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { env } from "@ai-tool-cms/config";
import type { JwtAccessPayload } from "@ai-tool-cms/auth";
import { RbacService } from "../../rbac/rbac.service";
import type { RequestUser } from "../../common/decorators/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly rbacService: RbacService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET ?? "development-secret",
    });
  }

  async validate(payload: JwtAccessPayload): Promise<RequestUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.rbacService.loadAuthUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found or inactive");
    }

    return { ...user, accessToken: "" };
  }
}
