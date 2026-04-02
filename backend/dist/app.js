"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const errorHandler_1 = require("./middlewares/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const record_routes_1 = __importDefault(require("./routes/record.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const ApiError_1 = require("./utils/ApiError");
const app = (0, express_1.default)();
exports.app = app;
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, morgan_1.default)("dev"));
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        message: "Finance backend is healthy",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/records", record_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use((_req, _res, next) => {
    next(new ApiError_1.ApiError(404, "Route not found"));
});
app.use(errorHandler_1.errorHandler);
