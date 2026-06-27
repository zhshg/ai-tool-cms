import { ApiProperty } from "@nestjs/swagger";
import { TagResponseDto } from "../../common/dto/relation.dto";

export class PaginatedTagsResponseDto {
  @ApiProperty({ type: [TagResponseDto] })
  items!: TagResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
