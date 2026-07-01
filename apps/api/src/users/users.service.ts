import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where: activeOnly,
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          roles: {
            where: activeOnly,
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.client.user.count({ where: activeOnly }),
    ]);

    return {
      items: items.map((user) => ({
        ...user,
        roles: user.roles.map((assignment) => assignment.role),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async summary() {
    const [total, active, inactive, suspended, roles] = await Promise.all([
      this.prisma.client.user.count({ where: activeOnly }),
      this.prisma.client.user.count({ where: { status: "ACTIVE", ...activeOnly } }),
      this.prisma.client.user.count({ where: { status: "INACTIVE", ...activeOnly } }),
      this.prisma.client.user.count({ where: { status: "SUSPENDED", ...activeOnly } }),
      this.prisma.client.role.count({ where: activeOnly }),
    ]);

    return { total, active, inactive, suspended, roles };
  }
}
