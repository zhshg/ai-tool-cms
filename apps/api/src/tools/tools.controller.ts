import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import {
  BulkLogoRefreshDto,
  BulkPublishToolsDto,
  BulkUpdateToolsDto,
  ImportExecuteDto,
  ImportPreviewDto,
} from "./dto/content-ops.dto";
import { CreateToolDto, UpdateToolDto } from "./dto/tool.dto";
import { CreateToolVersionDto, UpdateToolVersionDto } from "./dto/tool-version.dto";
import { ToolAssetsService } from "./tool-assets.service";
import { ToolVersionsService } from "./tool-versions.service";
import { ToolsService } from "./tools.service";

@ApiTags("tools")
@Controller("tools")
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly toolVersionsService: ToolVersionsService,
    private readonly toolAssetsService: ToolAssetsService,
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

  @Post("import/preview")
  @RequirePermission(PermissionCode.ToolCreate)
  @ApiOperation({ summary: "Preview tool import payload" })
  previewImport(@Body() dto: ImportPreviewDto) {
    return this.toolsService.previewImport(dto);
  }

  @Post("import/execute")
  @RequirePermission(PermissionCode.ToolCreate)
  @ApiOperation({ summary: "Execute tool import payload" })
  executeImport(@Body() dto: ImportExecuteDto, @CurrentUser() user: RequestUser) {
    return this.toolsService.executeImport(dto, user.id);
  }

  @Post("bulk/update")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Bulk update tools" })
  bulkUpdate(@Body() dto: BulkUpdateToolsDto, @CurrentUser() user: RequestUser) {
    return this.toolsService.bulkUpdate(dto, user.id);
  }

  @Post("bulk/publish")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Bulk publish tools" })
  bulkPublish(@Body() dto: BulkPublishToolsDto, @CurrentUser() user: RequestUser) {
    return this.toolsService.bulkPublish(dto.toolIds, user.id);
  }

  @Post("bulk/logo-refresh")
  @RequirePermission(PermissionCode.ToolUpdate)
  @ApiOperation({ summary: "Bulk refresh tool logos" })
  bulkLogoRefresh(@Body() dto: BulkLogoRefreshDto) {
    return this.toolsService.bulkRefreshLogos(dto.toolIds, dto.force ?? true);
  }

  @Post("assets/upload")
  @RequirePermission(PermissionCode.ToolUpdate)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload tool logo or screenshot asset" })
  uploadAsset(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname: string;
        }
      | undefined,
    @Query("kind") kind: string | undefined,
  ) {
    if (kind !== "logo" && kind !== "screenshot") {
      throw new BadRequestException("Upload kind must be logo or screenshot.");
    }

    return this.toolAssetsService.uploadAsset(file, kind);
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
