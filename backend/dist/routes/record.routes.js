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
const router = (0, express_1.Router)();
const dateStringSchema = zod_1.z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date string");
const createRecordSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    type: zod_1.z.enum(["income", "expense"]),
    category: zod_1.z.string().min(2).max(60),
    date: dateStringSchema,
    notes: zod_1.z.string().max(500).optional(),
});
const updateRecordSchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    type: zod_1.z.enum(["income", "expense"]).optional(),
    category: zod_1.z.string().min(2).max(60).optional(),
    date: dateStringSchema.optional(),
    notes: zod_1.z.string().max(500).optional().nullable(),
});
const listQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(["income", "expense"]).optional(),
    category: zod_1.z.string().min(1).optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const toRecordType = (value) => {
    return value.toUpperCase();
};
router.use(auth_1.authenticate);
router.get("/", (0, validate_1.validate)(listQuerySchema, "query"), async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const where = {};
    if (query.type) {
        where.type = toRecordType(query.type);
    }
    if (query.category) {
        where.category = {
            contains: query.category,
            mode: "insensitive",
        };
    }
    if (query.startDate || query.endDate) {
        where.date = {};
        if (query.startDate) {
            where.date.gte = new Date(query.startDate);
        }
        if (query.endDate) {
            where.date.lte = new Date(query.endDate);
        }
    }
    const [total, records] = await Promise.all([
        prisma_1.prisma.financialRecord.count({ where }),
        prisma_1.prisma.financialRecord.findMany({
            where,
            orderBy: { date: "desc" },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        }),
    ]);
    res.json({
        success: true,
        data: {
            total,
            page: query.page,
            pageSize: query.pageSize,
            items: records,
        },
    });
});
router.get("/:id", async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError_1.ApiError(400, "Record id is required");
    }
    const record = await prisma_1.prisma.financialRecord.findUnique({
        where: { id },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
    });
    if (!record) {
        throw new ApiError_1.ApiError(404, "Financial record not found");
    }
    res.json({ success: true, data: record });
});
router.post("/", (0, rbac_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(createRecordSchema), async (req, res) => {
    const payload = req.body;
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Authentication required");
    }
    const record = await prisma_1.prisma.financialRecord.create({
        data: {
            amount: payload.amount,
            type: toRecordType(payload.type),
            category: payload.category,
            date: new Date(payload.date),
            notes: payload.notes,
            createdById: req.user.id,
        },
    });
    res.status(201).json({
        success: true,
        data: record,
    });
});
router.patch("/:id", (0, rbac_1.authorize)(client_1.Role.ADMIN), (0, validate_1.validate)(updateRecordSchema), async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError_1.ApiError(400, "Record id is required");
    }
    const payload = req.body;
    if (Object.keys(payload).length === 0) {
        throw new ApiError_1.ApiError(400, "No fields provided for update");
    }
    const record = await prisma_1.prisma.financialRecord.update({
        where: { id },
        data: {
            amount: payload.amount,
            type: payload.type ? toRecordType(payload.type) : undefined,
            category: payload.category,
            date: payload.date ? new Date(payload.date) : undefined,
            notes: payload.notes,
        },
    });
    res.json({ success: true, data: record });
});
router.delete("/:id", (0, rbac_1.authorize)(client_1.Role.ADMIN), async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError_1.ApiError(400, "Record id is required");
    }
    await prisma_1.prisma.financialRecord.delete({
        where: { id },
    });
    res.status(204).send();
});
exports.default = router;
