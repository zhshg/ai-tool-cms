import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, Public, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CollectionsService } from "./collections.service";
import { CreateCollectionDto, UpdateCollectionDto } from "./dto/collection.dto";

@ApiTags("collections")
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get("public")
  @Public()
  @ApiOperation({ summary: "List public curated collections" })
  publicList(@Query() query: PaginationQueryDto) {
    return this.collectionsService.publicList(query);
  }

  @Get("public/:slug")
  @Public()
  @ApiOperation({ summary: "Get public collection by slug" })
  publicBySlug(@Param("slug") slug: string) {
    return this.collectionsService.publicBySlug(slug);
  }

  @Get()
  @RequirePermission(PermissionCode.SeoRead)
  @ApiOperation({ summary: "List curated collections" })
  list(@Query() query: PaginationQueryDto) {
    return this.collectionsService.list(query);
  }

  @Get(":id")
  @RequirePermission(PermissionCode.SeoRead)
  @ApiOperation({ summary: "Get collection by id" })
  byId(@Param("id") id: string) {
    return this.collectionsService.findById(id);
  }

  @Post()
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Create curated collection" })
  create(@Body() dto: CreateCollectionDto, @CurrentUser() user: RequestUser) {
    return this.collectionsService.create(dto, user.id);
  }

  @Put(":id")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Update curated collection" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.collectionsService.update(id, dto, user.id);
  }

  @Delete(":id")
  @RequirePermission(PermissionCode.SeoManage)
  @ApiOperation({ summary: "Soft delete curated collection" })
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.collectionsService.remove(id, user.id);
  }
}
