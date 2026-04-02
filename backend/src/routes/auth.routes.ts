import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, verifyPassword } from "../utils/auth";

const router = Router();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Your account is inactive");
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    },
  });
});

router.get("/me", authenticate, async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new ApiError(401, "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json({
    success: true,
    data: user,
  });
});

export default router;
