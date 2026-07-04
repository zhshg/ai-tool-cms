import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { CurrentUser, Public, RequirePermission, type RequestUser } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { BlogService } from "./blog.service";
import { BlogArticleDto, BlogCategoryDto, BlogTagDto } from "./dto/blog.dto";

@ApiTags("blog")
@Controller("blog")
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get("public/articles")
  @Public()
  @ApiOperation({ summary: "List published blog articles" })
  publicArticles(@Query() query: PaginationQueryDto) {
    return this.blogService.listPublicArticles(query);
  }

  @Get("public/articles/:slug")
  @Public()
  @ApiOperation({ summary: "Get published blog article" })
  publicArticle(@Param("slug") slug: string) {
    return this.blogService.publicBySlug(slug);
  }

  @Get("articles")
  @RequirePermission(PermissionCode.SeoRead)
  listArticles(@Query() query: PaginationQueryDto) {
    return this.blogService.listArticles(query);
  }

  @Get("articles/:id")
  @RequirePermission(PermissionCode.SeoRead)
  article(@Param("id") id: string) {
    return this.blogService.findArticle(id);
  }

  @Post("articles")
  @RequirePermission(PermissionCode.SeoManage)
  createArticle(@Body() dto: BlogArticleDto, @CurrentUser() user: RequestUser) {
    return this.blogService.createArticle(dto, user.id);
  }

  @Put("articles/:id")
  @RequirePermission(PermissionCode.SeoManage)
  updateArticle(@Param("id") id: string, @Body() dto: BlogArticleDto, @CurrentUser() user: RequestUser) {
    return this.blogService.updateArticle(id, dto, user.id);
  }

  @Delete("articles/:id")
  @RequirePermission(PermissionCode.SeoManage)
  removeArticle(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.blogService.removeArticle(id, user.id);
  }

  @Get("categories")
  @RequirePermission(PermissionCode.SeoRead)
  listCategories(@Query() query: PaginationQueryDto) {
    return this.blogService.listCategories(query);
  }

  @Post("categories")
  @RequirePermission(PermissionCode.SeoManage)
  createCategory(@Body() dto: BlogCategoryDto, @CurrentUser() user: RequestUser) {
    return this.blogService.createCategory(dto, user.id);
  }

  @Put("categories/:id")
  @RequirePermission(PermissionCode.SeoManage)
  updateCategory(@Param("id") id: string, @Body() dto: BlogCategoryDto, @CurrentUser() user: RequestUser) {
    return this.blogService.updateCategory(id, dto, user.id);
  }

  @Delete("categories/:id")
  @RequirePermission(PermissionCode.SeoManage)
  removeCategory(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.blogService.removeCategory(id, user.id);
  }

  @Get("tags")
  @RequirePermission(PermissionCode.SeoRead)
  listTags(@Query() query: PaginationQueryDto) {
    return this.blogService.listTags(query);
  }

  @Post("tags")
  @RequirePermission(PermissionCode.SeoManage)
  createTag(@Body() dto: BlogTagDto, @CurrentUser() user: RequestUser) {
    return this.blogService.createTag(dto, user.id);
  }

  @Put("tags/:id")
  @RequirePermission(PermissionCode.SeoManage)
  updateTag(@Param("id") id: string, @Body() dto: BlogTagDto, @CurrentUser() user: RequestUser) {
    return this.blogService.updateTag(id, dto, user.id);
  }

  @Delete("tags/:id")
  @RequirePermission(PermissionCode.SeoManage)
  removeTag(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.blogService.removeTag(id, user.id);
  }
}