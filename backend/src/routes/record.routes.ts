import { RecordType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { ApiError } from "../utils/ApiError";

const router = Router();

const dateStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date string");

const createRecordSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2).max(60),
  date: dateStringSchema,
  notes: z.string().max(500).optional(),
});

const updateRecordSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(2).max(60).optional(),
  date: dateStringSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
});

const listQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const toRecordType = (value: "income" | "expense"): RecordType => {
  return value.toUpperCase() as RecordType;
};

router.use(authenticate);

router.get("/", validate(listQuerySchema, "query"), async (req, res) => {
  const query = listQuerySchema.parse(req.query);

  const where: {
    type?: RecordType;
    category?: { contains: string; mode: "insensitive" };
    date?: { gte?: Date; lte?: Date };
  } = {};

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
    prisma.financialRecord.count({ where }),
    prisma.financialRecord.findMany({
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
    throw new ApiError(400, "Record id is required");
  }

  const record = await prisma.financialRecord.findUnique({
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
    throw new ApiError(404, "Financial record not found");
  }

  res.json({ success: true, data: record });
});

router.post("/", authorize(Role.ADMIN), validate(createRecordSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof createRecordSchema>;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const record = await prisma.financialRecord.create({
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

router.patch(
  "/:id",
  authorize(Role.ADMIN),
  validate(updateRecordSchema),
  async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      throw new ApiError(400, "Record id is required");
    }

    const payload = req.body as z.infer<typeof updateRecordSchema>;

    if (Object.keys(payload).length === 0) {
      throw new ApiError(400, "No fields provided for update");
    }

    const record = await prisma.financialRecord.update({
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
  },
);

router.delete("/:id", authorize(Role.ADMIN), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id) {
    throw new ApiError(400, "Record id is required");
  }

  await prisma.financialRecord.delete({
    where: { id },
  });

  res.status(204).send();
});

export default router;
