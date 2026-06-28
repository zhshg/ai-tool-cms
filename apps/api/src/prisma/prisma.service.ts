import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  connectPrisma,
  disconnectPrisma,
  prisma,
  type PrismaClient,
} from "@ai-tool-cms/database";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  get client(): PrismaClient {
    return prisma;
  }

  async onModuleInit(): Promise<void> {
    try {
      await connectPrisma();
      this.connected = true;
      this.logger.log("Database connected");
    } catch {
      this.logger.warn(
        "Database unavailable — API started without Prisma connection",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await disconnectPrisma();
  }

  isConnected(): boolean {
    return this.connected;
  }
}
