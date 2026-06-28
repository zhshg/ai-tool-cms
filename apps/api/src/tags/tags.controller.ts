import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CreateTagDto, UpdateTagDto } from "./dto/tag.dto";
import { TagsService } from "./tags.service";

@ApiTags("tags")
@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermission(PermissionCode.TagRead)
  @ApiOperation({ summary: "List tags" })
  list(@Query() query: PaginationQueryDto) {
    return this.tagsService.list(query);
  }

  @Get("slug/:slug")
  @RequirePermission(PermissionCode.TagRead)
  @ApiOperation({ summary: "Get tag by slug" })
  bySlug(@Param("slug") slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Get(":id")
  @RequirePermission(PermissionCode.TagRead)
  @ApiOperation({ summary: "Get tag by id" })
  byId(@Param("id") id: string) {
    return this.tagsService.findById(id);
  }

  @Post()
  @RequirePermission(PermissionCode.TagCreate)
  @ApiOperation({ summary: "Create tag" })
  create(@Body() dto: CreateTagDto, @CurrentUser() user: RequestUser) {
    return this.tagsService.create(dto, user.id);
  }

  @Put(":id")
  @RequirePermission(PermissionCode.TagUpdate)
  @ApiOperation({ summary: "Update tag" })
  update(@Param("id") id: string, @Body() dto: UpdateTagDto, @CurrentUser() user: RequestUser) {
    return this.tagsService.update(id, dto, user.id);
  }

  @Delete(":id")
  @RequirePermission(PermissionCode.TagDelete)
  @ApiOperation({ summary: "Soft delete tag" })
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.tagsService.remove(id, user.id);
  }
}
