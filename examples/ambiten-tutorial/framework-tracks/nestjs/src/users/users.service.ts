import { Injectable } from "@nestjs/common";
import { AmbitenContext } from "@ambiten/core";

@Injectable()
export class UsersService {
  async inspectExecution() {
    // Read after awaited work to exercise the actual execution boundary.
    await new Promise<void>((resolve) => setImmediate(resolve));
    const ctx = AmbitenContext.get();

    return {
      tenantId: ctx.tenantId,
      requestId: ctx.requestId
    };
  }
}
