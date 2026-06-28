import { Global, Module } from "@nestjs/common";
import { RbacPolicy } from "./rbac.policy";
import { RbacService } from "./rbac.service";

@Global()
@Module({
  providers: [RbacService, RbacPolicy],
  exports: [RbacService, RbacPolicy],
})
export class RbacModule {}
