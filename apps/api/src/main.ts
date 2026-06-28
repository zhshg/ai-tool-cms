import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { env } from "@ai-tool-cms/config";
import { AppModule } from "./app.module";
import { AppLoggerService } from "./logger/logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.setGlobalPrefix("v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AI Tool CMS API")
    .setDescription("AI Tool CMS REST API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(env.PORT, "0.0.0.0");
  logger.log(`API listening on http://0.0.0.0:${env.PORT}`, "Bootstrap");
  logger.log(`Swagger docs at http://0.0.0.0:${env.PORT}/api/docs`, "Bootstrap");
}

void bootstrap();
