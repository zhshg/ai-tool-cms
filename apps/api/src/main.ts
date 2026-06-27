import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AI Tool CMS API")
    .setDescription("AI 工具内容管理系统 API")
    .setVersion("0.0.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
