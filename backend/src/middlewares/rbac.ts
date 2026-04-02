import { NextFunction, Request, Response } from "express";

import { Role } from "@prisma/client";

import { ApiError } from "../utils/ApiError";

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "You are not allowed to perform this action");
    }

    next();
  };
};
