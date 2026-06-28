import { ApiProperty } from "@nestjs/swagger";

export class HealthServicesDto {
  @ApiProperty({ example: true })
  database!: boolean;

  @ApiProperty({ example: "configured" })
  redis!: string;

  @ApiProperty({ example: "configured" })
  meilisearch!: string;

  @ApiProperty({ example: "configured" })
  storage!: string;

  @ApiProperty({ example: "configured" })
  mail!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "2026-06-27T00:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ type: HealthServicesDto })
  services!: HealthServicesDto;
}
