import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@ai-tool-cms/auth";
import { RequirePermission } from "../common/decorators";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission(PermissionCode.UsersManage)
  @ApiOperation({ summary: "List admin users" })
  list(@Query() query: PaginationQueryDto) {
    return this.usersService.list(query);
  }

  @Get("summary")
  @RequirePermission(PermissionCode.UsersManage)
  @ApiOperation({ summary: "User management summary" })
  summary() {
    return this.usersService.summary();
  }
}
