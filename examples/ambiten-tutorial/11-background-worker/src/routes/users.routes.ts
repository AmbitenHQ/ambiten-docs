import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import { getExecutionInfo } from "../utils/execution.js";
import {
  createUserWithAudit,
  listUsers,
  listDeletedUsers,
  listUsersIncludingDeleted,
  purgeUser,
  restoreUser,
  softDeleteUser
} from "../services/user.service.js";

export const usersRouter = Router();

usersRouter.post("/", async (req, res, next) => {
  try {
    const { name, email } = req.body ?? {};
    if (typeof name !== "string" || typeof email !== "string") {
      return res.status(400).json({ error: "name and email are required." });
    }
    return res.status(201).json(await UserModel.create({ name, email }));
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/transactional", async (req, res, next) => {
  try {
    const { name, email, simulateFailure } = req.body ?? {};
    if (typeof name !== "string" || typeof email !== "string") {
      return res.status(400).json({ error: "name and email are required." });
    }
    if (simulateFailure !== undefined && typeof simulateFailure !== "boolean") {
      return res.status(400).json({ error: "simulateFailure must be a boolean." });
    }
    return res.status(201).json(await createUserWithAudit({ name, email, simulateFailure }));
  } catch (error) {
    next(error);
  }
});

// Static paths precede the generic /:email route.
usersRouter.get("/deleted", async (_req, res, next) => {
  try {
    return res.json({ users: await listDeletedUsers() });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/with-deleted", async (_req, res, next) => {
  try {
    return res.json({ users: await listUsersIncludingDeleted() });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/restore/:email", async (req, res, next) => {
  try {
    await restoreUser(req.params.email);
    return res.json({ status: "restored" });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/soft-delete/:email", async (req, res, next) => {
  try {
    await softDeleteUser(req.params.email);
    return res.json({ status: "soft-deleted" });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/purge/:email", async (req, res, next) => {
  try {
    await purgeUser(req.params.email);
    return res.json({ status: "purged" });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/", async (_req, res, next) => {
  try {
    return res.json({ routeContext: getExecutionInfo(), ...await listUsers() });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:email", async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ email: req.params.email });
    return user ? res.json(user) : res.status(404).json({ error: "User not found." });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:email", async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    if (typeof name !== "string") {
      return res.status(400).json({ error: "name is required." });
    }
    await UserModel.updateOne({ email: req.params.email }, { $set: { name } });
    const user = await UserModel.findOne({ email: req.params.email });
    return user ? res.json(user) : res.status(404).json({ error: "User not found." });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:email", async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found." });
    await softDeleteUser(req.params.email);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});
