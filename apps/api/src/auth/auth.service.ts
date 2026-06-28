import { Injectable, UnauthorizedException } from "@nestjs/common";
import { env } from "@ai-tool-cms/config";
import {
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
  type AuthUser,
} from "@ai-tool-cms/auth";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";
import { activeOnly } from "../common/prisma.util";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.client.user.findFirst({
      where: { email: dto.email, ...activeOnly, status: "ACTIVE" },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const secret = env.JWT_REFRESH_SECRET ?? env.JWT_SECRET ?? "development-secret";

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken, secret);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.client.user.findFirst({
      where: { id: payload.sub, ...activeOnly, status: "ACTIVE" },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.issueTokens(user.id, user.email, payload.tokenId);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.rbacService.loadAuthUser(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  private issueTokens(userId: string, email: string, refreshTokenId?: string) {
    const accessSecret = env.JWT_SECRET ?? "development-secret";
    const refreshSecret = env.JWT_REFRESH_SECRET ?? env.JWT_SECRET ?? "development-secret";

    const accessToken = signAccessToken({
      userId,
      email,
      secret: accessSecret,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });

    const refresh = signRefreshToken({
      userId,
      secret: refreshSecret,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      tokenId: refreshTokenId,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      tokenType: "Bearer" as const,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }
}
