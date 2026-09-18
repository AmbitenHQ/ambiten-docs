import { Router } from "express";
import { AmbitenContext } from "@ambiten/core";
import { UserModel } from "../models/user.model.js";
import { withQueryObservation } from "../instrumentation/query-observer.js";

export const instrumentationRouter = Router();

instrumentationRouter.get("/users", async (_req, res, next) => {
  try {
    const observed = await withQueryObservation(() => UserModel.find({}));
    const ctx = AmbitenContext.get();

    return res.json({
      execution: {
        requestId: ctx.requestId,
        tenantId: ctx.tenantId
      },
      signals: observed.signals,
      users: observed.result
    });
  } catch (error) {
    next(error);
  }
});
