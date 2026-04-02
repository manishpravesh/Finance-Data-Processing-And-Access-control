"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const rbac_1 = require("../middlewares/rbac");
const validate_1 = require("../middlewares/validate");
const ApiError_1 = require("../utils/ApiError");
const auth_2 = require("../utils/auth");
const router = (0, express_1.Router)();
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80),
    email: zod_1.z.email(),
    password: zod_1.z.string().min(6).max(128),
    role: zod_1.z.enum([client_1.Role.VIEWER, client_1.Role.ANALYST, client_1.Role.ADMIN]).default(client_1.Role.VIEWER),
    isActive: zod_1.z.boolean().optional(),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80).optional(),
    role: zod_1.z.enum([client_1.Role.VIEWER, client_1.Role.ANALYST, client_1.Role.ADMIN]).optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.use(auth_1.authenticate);
router.get("/me", async (req, res) => {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Authentication required");
    }
    const user = await prisma_1.prisma.user.findUnique({
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
        throw new ApiError_1.ApiError(404, "User not found");
    }
    res.json({ success: true, data: user });
});
router.use((0, rbac_1.authorize)(client_1.Role.ADMIN));
router.get("/", async (_req, res) => {
    const users = await prisma_1.prisma.user.findMany({
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
router.post("/", (0, validate_1.validate)(createUserSchema), async (req, res) => {
    const payload = req.body;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
        throw new ApiError_1.ApiError(409, "Email is already in use");
    }
    const user = await prisma_1.prisma.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            passwordHash: await (0, auth_2.hashPassword)(payload.password),
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
router.patch("/:id", (0, validate_1.validate)(updateUserSchema), async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payload = req.body;
    if (!id) {
        throw new ApiError_1.ApiError(400, "User id is required");
    }
    if (Object.keys(payload).length === 0) {
        throw new ApiError_1.ApiError(400, "No fields provided for update");
    }
    if (req.user && req.user.id === id && payload.isActive === false) {
        throw new ApiError_1.ApiError(400, "You cannot deactivate your own account");
    }
    if (req.user && req.user.id === id && payload.role && payload.role !== client_1.Role.ADMIN) {
        throw new ApiError_1.ApiError(400, "You cannot remove your own admin role");
    }
    const user = await prisma_1.prisma.user.update({
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
exports.default = router;
