import { PrismaClient } from "../generated/crawler-client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
