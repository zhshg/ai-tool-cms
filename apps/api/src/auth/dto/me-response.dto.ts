import { ApiProperty } from "@nestjs/swagger";

export class PermissionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "users:read" })
  name!: string;

  @ApiProperty({ example: "users" })
  resource!: string;

  @ApiProperty({ example: "read" })
  action!: string;
}

export class RoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "admin" })
  name!: string;

  @ApiProperty({ type: [PermissionDto] })
  permissions!: PermissionDto[];
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "admin@example.com" })
  email!: string;

  @ApiProperty({ example: "系统管理员", nullable: true })
  displayName!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [RoleDto] })
  roles!: RoleDto[];

  @ApiProperty({ type: [PermissionDto] })
  permissions!: PermissionDto[];
}
