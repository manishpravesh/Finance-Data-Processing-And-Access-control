import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { Role } from "@prisma/client";

import { ApiError } from "../utils/ApiError";

type JwtPayload = {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
};

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid authorization header");
  }

  const token = authorization.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new ApiError(500, "Server auth configuration is missing");
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
};
