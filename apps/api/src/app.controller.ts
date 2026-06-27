import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/decorators/public.decorator";
import { RootResponseDto } from "./app-response.dto";

@ApiTags("root")
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: "API 根路径" })
  @ApiOkResponse({ type: RootResponseDto })
  root(): RootResponseDto {
    return {
      name: "AI Tool CMS API",
      version: "0.0.0",
      docs: "/docs",
      health: "/health",
    };
  }
}
