import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppLoggerService } from "./logger/logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

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
    .setVersion("0.0.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("api.port", 4000);

  await app.listen(port, "0.0.0.0");
  logger.log(`API listening on http://0.0.0.0:${port}`, "Bootstrap");
  logger.log(`Swagger docs at http://0.0.0.0:${port}/docs`, "Bootstrap");
}

void bootstrap();
