"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const ApiError_1 = require("../utils/ApiError");
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, "Authentication required");
        }
        if (!roles.includes(req.user.role)) {
            throw new ApiError_1.ApiError(403, "You are not allowed to perform this action");
        }
        next();
    };
};
exports.authorize = authorize;
