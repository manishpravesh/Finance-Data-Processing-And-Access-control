import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { ApiError } from "../utils/ApiError";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          message: "Requested resource not found",
          details: null,
        },
      });
      return;
    }

    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          message: "Duplicate value violates a unique constraint",
          details: err.meta ?? null,
        },
      });
      return;
    }
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  res.status(500).json({
    success: false,
    error: {
      message,
      details: null,
    },
  });
};
