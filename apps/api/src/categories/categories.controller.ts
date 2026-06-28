import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermission(PermissionCode.CategoryRead)
  @ApiOperation({ summary: "List categories" })
  list(@Query() query: PaginationQueryDto) {
    return this.categoriesService.list(query);
  }

  @Get("tree")
  @RequirePermission(PermissionCode.CategoryRead)
  @ApiOperation({ summary: "Category tree" })
  tree() {
    return this.categoriesService.tree();
  }

  @Get("slug/:slug")
  @RequirePermission(PermissionCode.CategoryRead)
  @ApiOperation({ summary: "Get category by slug" })
  bySlug(@Param("slug") slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(":id")
  @RequirePermission(PermissionCode.CategoryRead)
  @ApiOperation({ summary: "Get category by id" })
  byId(@Param("id") id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @RequirePermission(PermissionCode.CategoryCreate)
  @ApiOperation({ summary: "Create category" })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: RequestUser) {
    return this.categoriesService.create(dto, user.id);
  }

  @Put(":id")
  @RequirePermission(PermissionCode.CategoryUpdate)
  @ApiOperation({ summary: "Update category" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete(":id")
  @RequirePermission(PermissionCode.CategoryDelete)
  @ApiOperation({ summary: "Soft delete category" })
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.categoriesService.remove(id, user.id);
  }
}
