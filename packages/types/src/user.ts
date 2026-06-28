import type { Timestamps } from "./common";

export interface User extends Timestamps {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  roleIds?: string[];
}

export interface UserSummary {
  id: string;
  email: string;
  displayName?: string;
}
