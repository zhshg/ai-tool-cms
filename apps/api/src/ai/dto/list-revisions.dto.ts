import { IsEnum, IsOptional } from "class-validator";
import { ContentRevisionStatus } from "@ai-tool-cms/database";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListRevisionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContentRevisionStatus)
  status?: ContentRevisionStatus;
}
