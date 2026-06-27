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
import { TagResponseDto } from "../common/dto/relation.dto";
import { CreateTagDto } from "./dto/create-tag.dto";
import { PaginatedTagsResponseDto } from "./dto/paginated-tags-response.dto";
import { QueryTagsDto } from "./dto/query-tags.dto";
import { TagsService } from "./tags.service";
import { UpdateTagDto } from "./dto/update-tag.dto";

@ApiTags("tags")
@ApiBearerAuth()
@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: "获取标签列表（分页、搜索、排序）" })
  @ApiOkResponse({ type: PaginatedTagsResponseDto })
  @ApiUnauthorizedResponse({ description: "未授权访问" })
  findAll(@Query() query: QueryTagsDto): Promise<PaginatedTagsResponseDto> {
    return this.tagsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取标签详情" })
  @ApiOkResponse({ type: TagResponseDto })
  @ApiNotFoundResponse({ description: "标签不存在" })
  findOne(@Param("id") id: string): Promise<TagResponseDto> {
    return this.tagsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "创建标签" })
  @ApiCreatedResponse({ type: TagResponseDto })
  create(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagsService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新标签" })
  @ApiOkResponse({ type: TagResponseDto })
  @ApiNotFoundResponse({ description: "标签不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateTagDto): Promise<TagResponseDto> {
    return this.tagsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除标签" })
  @ApiOkResponse({ type: TagResponseDto })
  @ApiNotFoundResponse({ description: "标签不存在" })
  remove(@Param("id") id: string): Promise<TagResponseDto> {
    return this.tagsService.remove(id);
  }
}
