"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiError_1 = require("../utils/ApiError");
const authenticate = (req, _res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        throw new ApiError_1.ApiError(401, "Missing or invalid authorization header");
    }
    const token = authorization.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new ApiError_1.ApiError(500, "Server auth configuration is missing");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch {
        throw new ApiError_1.ApiError(401, "Invalid or expired token");
    }
};
exports.authenticate = authenticate;
