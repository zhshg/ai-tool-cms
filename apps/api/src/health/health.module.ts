import { Module } from "@nestjs/common";
import { HealthController, LegacyHealthController } from "./health.controller";

@Module({
  controllers: [HealthController, LegacyHealthController],
})
export class HealthModule {}
