import { ApiProperty } from "@nestjs/swagger";
import { ToolResponseDto } from "./tool-response.dto";

export class PaginatedToolsResponseDto {
  @ApiProperty({ type: [ToolResponseDto] })
  items!: ToolResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
