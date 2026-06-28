import { IsOptional, IsString } from "class-validator";

export class ReviewRevisionDto {
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
