import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

import { ApiError } from "../utils/ApiError";

type RequestTarget = "body" | "params" | "query";

export const validate = (schema: ZodSchema, target: RequestTarget = "body") => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", parsed.error.flatten());
    }

    if (target === "body") {
      req.body = parsed.data;
    } else if (target === "query") {
      Object.assign(req.query, parsed.data as object);
    } else {
      Object.assign(req.params, parsed.data as object);
    }

    next();
  };
};
