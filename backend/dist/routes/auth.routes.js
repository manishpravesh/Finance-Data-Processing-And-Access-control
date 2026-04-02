"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const ApiError_1 = require("../utils/ApiError");
const auth_2 = require("../utils/auth");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
router.post("/login", (0, validate_1.validate)(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !(await (0, auth_2.verifyPassword)(password, user.passwordHash))) {
        throw new ApiError_1.ApiError(401, "Invalid email or password");
    }
    if (!user.isActive) {
        throw new ApiError_1.ApiError(403, "Your account is inactive");
    }
    const token = (0, auth_2.signAccessToken)({
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
router.get("/me", auth_1.authenticate, async (req, res) => {
    const authUser = req.user;
    if (!authUser) {
        throw new ApiError_1.ApiError(401, "Authentication required");
    }
    const user = await prisma_1.prisma.user.findUnique({
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
        throw new ApiError_1.ApiError(404, "User not found");
    }
    res.json({
        success: true,
        data: user,
    });
});
exports.default = router;
