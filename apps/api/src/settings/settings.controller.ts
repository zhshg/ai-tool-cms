import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { SettingsService } from "./settings.service";

class ListSettingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;
}

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission(PermissionCode.SettingsRead)
  @ApiOperation({ summary: "List system settings" })
  list(@Query() query: ListSettingsQueryDto) {
    return this.settingsService.list(query);
  }

  @Get("summary")
  @RequirePermission(PermissionCode.SettingsRead)
  @ApiOperation({ summary: "Settings summary" })
  summary() {
    return this.settingsService.summary();
  }
}
