import type { Timestamps } from "./common";

export interface Role extends Timestamps {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissionIds?: string[];
  isSystem?: boolean;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
}
