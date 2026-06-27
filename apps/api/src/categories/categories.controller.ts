import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CategoryResponseDto } from "../common/dto/relation.dto";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { PaginatedCategoriesResponseDto } from "./dto/paginated-categories-response.dto";
import { QueryCategoriesDto } from "./dto/query-categories.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("categories")
@ApiBearerAuth()
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "获取分类列表（分页、搜索、排序）" })
  @ApiOkResponse({ type: PaginatedCategoriesResponseDto })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  findAll(@Query() query: QueryCategoriesDto): Promise<PaginatedCategoriesResponseDto> {
    return this.categoriesService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取分类详情" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: "分类不存在" })
  findOne(@Param("id") id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "创建分类" })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新分类" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: "分类不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除分类" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: "分类不存在" })
  remove(@Param("id") id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.remove(id);
  }
}
