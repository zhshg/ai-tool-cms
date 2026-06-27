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
import { CreateToolDto } from "./dto/create-tool.dto";
import { PaginatedToolsResponseDto } from "./dto/paginated-tools-response.dto";
import { QueryToolsDto } from "./dto/query-tools.dto";
import { ToolResponseDto } from "./dto/tool-response.dto";
import { UpdateToolDto } from "./dto/update-tool.dto";
import { SetToolCategoriesDto, SetToolTagsDto } from "./dto/set-tool-relations.dto";
import { ToolsService } from "./tools.service";

@ApiTags("tools")
@ApiBearerAuth()
@Controller("tools")
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @ApiOperation({ summary: "获取工具列表（分页、搜索、排序）" })
  @ApiOkResponse({ type: PaginatedToolsResponseDto })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  findAll(@Query() query: QueryToolsDto): Promise<PaginatedToolsResponseDto> {
    return this.toolsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取工具详情" })
  @ApiOkResponse({ type: ToolResponseDto })
  @ApiNotFoundResponse({ description: "工具不存在" })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  findOne(@Param("id") id: string): Promise<ToolResponseDto> {
    return this.toolsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "创建工具" })
  @ApiCreatedResponse({ type: ToolResponseDto })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  create(@Body() dto: CreateToolDto): Promise<ToolResponseDto> {
    return this.toolsService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新工具" })
  @ApiOkResponse({ type: ToolResponseDto })
  @ApiNotFoundResponse({ description: "工具不存在" })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  update(@Param("id") id: string, @Body() dto: UpdateToolDto): Promise<ToolResponseDto> {
    return this.toolsService.update(id, dto);
  }

  @Put(":id/categories")
  @ApiOperation({ summary: "设置工具关联分类" })
  @ApiOkResponse({ type: ToolResponseDto })
  @ApiNotFoundResponse({ description: "工具或分类不存在" })
  setCategories(
    @Param("id") id: string,
    @Body() dto: SetToolCategoriesDto,
  ): Promise<ToolResponseDto> {
    return this.toolsService.setCategories(id, dto);
  }

  @Put(":id/tags")
  @ApiOperation({ summary: "设置工具关联标签" })
  @ApiOkResponse({ type: ToolResponseDto })
  @ApiNotFoundResponse({ description: "工具或标签不存在" })
  setTags(@Param("id") id: string, @Body() dto: SetToolTagsDto): Promise<ToolResponseDto> {
    return this.toolsService.setTags(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除工具" })
  @ApiOkResponse({ type: ToolResponseDto })
  @ApiNotFoundResponse({ description: "工具不存在" })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  remove(@Param("id") id: string): Promise<ToolResponseDto> {
    return this.toolsService.remove(id);
  }
}
