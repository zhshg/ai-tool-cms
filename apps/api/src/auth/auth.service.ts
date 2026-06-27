import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import {
  type AuthUser,
  flattenPermissions,
  hasRole,
  type JwtAccessPayload,
  verifyPassword,
} from "@ai-tool-cms/auth";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto } from "./dto/login.dto";
import type { LogoutDto } from "./dto/logout.dto";
import type { MeResponseDto } from "./dto/me-response.dto";
import type { LoginResponseDto } from "./dto/login-response.dto";

const userWithRolesInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: userWithRolesInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    const passwordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    const authUser = this.mapUserToAuthUser(user);
    if (!hasRole(authUser, "admin")) {
      throw new UnauthorizedException("仅管理员可登录管理后台");
    }

    const tokens = await this.issueTokens(authUser.id, authUser.email);

    return {
      tokens,
      user: this.toMeResponse(authUser),
    };
  }

  async getAuthUserById(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithRolesInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("用户不存在或已禁用");
    }

    return this.mapUserToAuthUser(user);
  }

  async getProfile(userId: string): Promise<MeResponseDto> {
    const authUser = await this.getAuthUserById(userId);
    return this.toMeResponse(authUser);
  }

  async logout(userId: string, dto: LogoutDto): Promise<{ success: true }> {
    const tokenHash = this.hashToken(dto.refreshToken);

    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (refreshToken) {
      await this.prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  private async issueTokens(userId: string, email: string) {
    const accessTokenExpiresIn = this.configService.get<string>("auth.jwtAccessExpiresIn", "15m");
    const refreshTokenExpiresIn = this.configService.get<string>("auth.jwtRefreshExpiresIn", "7d");

    const accessPayload: JwtAccessPayload = {
      sub: userId,
      email,
      type: "access",
    };

    const refreshTokenValue = randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshTokenValue),
        expiresAt: this.parseExpiresAt(refreshTokenExpiresIn),
      },
    });

    const accessSignOptions: JwtSignOptions = {
      secret: this.configService.get<string>("auth.jwtSecret"),
      expiresIn: accessTokenExpiresIn as JwtSignOptions["expiresIn"],
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, accessSignOptions);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }

  private mapUserToAuthUser(
    user: {
      id: string;
      email: string;
      displayName: string | null;
      isActive: boolean;
      roles: Array<{
        role: {
          id: string;
          name: string;
          permissions: Array<{
            permission: {
              id: string;
              name: string;
              resource: string;
              action: string;
            };
          }>;
        };
      }>;
    },
  ): AuthUser {
    const roles = user.roles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions.map(({ permission }) => ({
        id: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
      })),
    }));

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      roles,
      permissions: flattenPermissions(roles),
    };
  }

  private toMeResponse(user: AuthUser): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private parseExpiresAt(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]!);
  }
}
