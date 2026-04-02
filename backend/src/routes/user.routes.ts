import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { ApiError } from "../utils/ApiError";
import { hashPassword } from "../utils/auth";

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(6).max(128),
  role: z.enum([Role.VIEWER, Role.ANALYST, Role.ADMIN]).default(Role.VIEWER),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum([Role.VIEWER, Role.ANALYST, Role.ADMIN]).optional(),
  isActive: z.boolean().optional(),
});

router.use(authenticate);

router.get("/me", async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json({ success: true, data: user });
});

router.use(authorize(Role.ADMIN));

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: users,
  });
});

router.post("/", validate(createUserSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof createUserSchema>;

  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existing) {
    throw new ApiError(409, "Email is already in use");
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash: await hashPassword(payload.password),
      role: payload.role,
      isActive: payload.isActive ?? true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: user,
  });
});

router.patch("/:id", validate(updateUserSchema), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = req.body as z.infer<typeof updateUserSchema>;

  if (!id) {
    throw new ApiError(400, "User id is required");
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }

  if (req.user && req.user.id === id && payload.isActive === false) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  if (
    req.user &&
    req.user.id === id &&
    payload.role &&
    payload.role !== Role.ADMIN
  ) {
    throw new ApiError(400, "You cannot remove your own admin role");
  }

  const user = await prisma.user.update({
    where: { id },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: user,
  });
});

export default router;
