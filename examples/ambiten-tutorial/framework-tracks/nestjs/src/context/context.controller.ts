import { Controller, Get } from "@nestjs/common";
import { AmbitenContext } from "@ambiten/core";

@Controller("context")
export class ContextController {
  @Get()
  getContext() {
    const ctx = AmbitenContext.get();

    return {
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      dbName: ctx.dbName
    };
  }
}
