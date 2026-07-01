import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto & { group?: string }) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = {
      ...activeOnly,
      ...(query.group ? { group: query.group } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.setting.findMany({
        where,
        orderBy: [{ group: "asc" }, { key: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.setting.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async summary() {
    const [total, publicSettings, groups] = await Promise.all([
      this.prisma.client.setting.count({ where: activeOnly }),
      this.prisma.client.setting.count({ where: { isPublic: true, ...activeOnly } }),
      this.prisma.client.setting.groupBy({
        by: ["group"],
        where: activeOnly,
        _count: { _all: true },
        orderBy: { group: "asc" },
      }),
    ]);

    return {
      total,
      publicSettings,
      privateSettings: total - publicSettings,
      groups: groups.map((group) => ({ name: group.group, count: group._count._all })),
    };
  }
}
