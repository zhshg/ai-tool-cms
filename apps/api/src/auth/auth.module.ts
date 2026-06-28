import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { env } from "@ai-tool-cms/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: "JWT_ACCESS_SECRET",
      useValue: env.JWT_SECRET ?? "development-secret",
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
