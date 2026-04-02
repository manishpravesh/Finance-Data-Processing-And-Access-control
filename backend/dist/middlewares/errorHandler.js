"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const ApiError_1 = require("../utils/ApiError");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError_1.ApiError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                details: err.details ?? null,
            },
        });
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
exports.errorHandler = errorHandler;
