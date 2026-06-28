import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CreateToolDto, UpdateToolDto } from "./dto/tool.dto";
import { CreateToolVersionDto, UpdateToolVersionDto } from "./dto/tool-version.dto";
import { ToolVersionsService } from "./tool-versions.service";
import { ToolsService } from "./tools.service";

@ApiTags("tools")
@Controller("tools")
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly toolVersionsService: ToolVersionsService,
  ) {}

  @Get()
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "List tools" })
  list(@Query() query: PaginationQueryDto) {
    return this.toolsService.list(query);
  }

  @Get("slug/:slug")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Get tool by slug" })
  bySlug(@Param("slug") slug: string) {
    return this.toolsService.findBySlug(slug);
  }

  @Get(":toolId/versions")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "List tool versions" })
  listVersions(@Param("toolId") toolId: string) {
    return this.toolVersionsService.list(toolId);
  }

  @Get(":toolId/versions/:versionId")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Get tool version" })
  getVersion(@Param("toolId") toolId: string, @Param("versionId") versionId: string) {
    return this.toolVersionsService.findOne(toolId, versionId);
  }

  @Post(":toolId/versions")
  @RequirePermission(PermissionCode.ToolCreate)
  @ApiOperation({ summary: "Create tool version snapshot" })
  createVersion(
    @Param("toolId") toolId: string,
    @Body() dto: CreateToolVersionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.toolVersionsService.create(toolId, dto, user.id);
  }

  @Put(":toolId/versions/:versionId")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Update tool version" })
  updateVersion(
    @Param("toolId") toolId: string,
    @Param("versionId") versionId: string,
    @Body() dto: UpdateToolVersionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.toolVersionsService.update(toolId, versionId, dto, user.id);
  }

  @Delete(":toolId/versions/:versionId")
  @RequirePermission(PermissionCode.ToolDelete)
  @ApiOperation({ summary: "Soft delete tool version" })
  removeVersion(
    @Param("toolId") toolId: string,
    @Param("versionId") versionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.toolVersionsService.remove(toolId, versionId, user.id);
  }

  @Get(":id")
  @RequirePermission(PermissionCode.ToolRead)
  @ApiOperation({ summary: "Get tool by id" })
  byId(@Param("id") id: string) {
    return this.toolsService.findById(id);
  }

  @Post()
  @RequirePermission(PermissionCode.ToolCreate)
  @ApiOperation({ summary: "Create tool" })
  create(@Body() dto: CreateToolDto, @CurrentUser() user: RequestUser) {
    return this.toolsService.create(dto, user.id);
  }

  @Put(":id")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Update tool" })
  update(@Param("id") id: string, @Body() dto: UpdateToolDto, @CurrentUser() user: RequestUser) {
    return this.toolsService.update(id, dto, user.id);
  }

  @Delete(":id")
  @RequirePermission(PermissionCode.ToolDelete)
  @ApiOperation({ summary: "Soft delete tool" })
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.toolsService.remove(id, user.id);
  }
}
