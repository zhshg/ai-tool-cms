import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import { env } from "@ai-tool-cms/config";
import { initObservability } from "@ai-tool-cms/monitoring";
import { AppModule } from "./app.module";
import { applySecurityHeaders, getCorsOrigins } from "./common/security";
import { AppLoggerService } from "./logger/logger.service";

async function bootstrap() {
  await initObservability("ai-tool-cms-api");
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key"],
  });

  app.use(compression());
  applySecurityHeaders(app);

  app.setGlobalPrefix("v1", {
    exclude: [
      { path: "api/health", method: RequestMethod.GET },
      { path: "api/ready", method: RequestMethod.GET },
      { path: "api/live", method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AI Tool CMS API")
    .setDescription("AI Tool CMS REST API — Admin + Public API v1 (OpenAPI 3.1)")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "X-Api-Key", in: "header" }, "apiKey")
    .addTag("Public API v1", "Developer API — requires API key (atcms_...)")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  if (process.env.WRITE_OPENAPI === "true") {
    const { writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    writeFileSync(join(process.cwd(), "openapi.json"), JSON.stringify(document, null, 2));
  }

  await app.listen(env.PORT, "0.0.0.0");
  logger.log(`API listening on http://0.0.0.0:${env.PORT}`, "Bootstrap");
  logger.log(`Swagger docs at http://0.0.0.0:${env.PORT}/api/docs`, "Bootstrap");
}

void bootstrap();
