import { RecordType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";

const router = Router();

const dateStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date string");

const summaryQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

const rangeFromQuery = (query: z.infer<typeof summaryQuerySchema>) => {
  if (!query.startDate && !query.endDate) {
    return undefined;
  }

  return {
    gte: query.startDate ? new Date(query.startDate) : undefined,
    lte: query.endDate ? new Date(query.endDate) : undefined,
  };
};

router.use(authenticate);
router.use(authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN));

router.get(
  "/summary",
  validate(summaryQuerySchema, "query"),
  async (req, res) => {
    const query = summaryQuerySchema.parse(req.query);

    const dateRange = rangeFromQuery(query);
    const where = dateRange ? { date: dateRange } : {};

    const [incomeAgg, expenseAgg, groupedByCategory, recentActivity] =
      await Promise.all([
        prisma.financialRecord.aggregate({
          where: {
            ...where,
            type: RecordType.INCOME,
          },
          _sum: { amount: true },
        }),
        prisma.financialRecord.aggregate({
          where: {
            ...where,
            type: RecordType.EXPENSE,
          },
          _sum: { amount: true },
        }),
        prisma.financialRecord.groupBy({
          by: ["category", "type"],
          where,
          _sum: { amount: true },
          orderBy: { category: "asc" },
        }),
        prisma.financialRecord.findMany({
          where,
          orderBy: { date: "desc" },
          take: 8,
          select: {
            id: true,
            amount: true,
            type: true,
            category: true,
            date: true,
            notes: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpenses = expenseAgg._sum.amount ?? 0;

    const categoryMap = new Map<string, { income: number; expense: number }>();

    for (const row of groupedByCategory) {
      const existing = categoryMap.get(row.category) ?? {
        income: 0,
        expense: 0,
      };
      const amount = row._sum.amount ?? 0;

      if (row.type === RecordType.INCOME) {
        existing.income += amount;
      } else {
        existing.expense += amount;
      }

      categoryMap.set(row.category, existing);
    }

    const categoryTotals = [...categoryMap.entries()].map(
      ([category, totals]) => ({
        category,
        income: totals.income,
        expense: totals.expense,
        net: totals.income - totals.expense,
      }),
    );

    res.json({
      success: true,
      data: {
        totals: {
          income: totalIncome,
          expenses: totalExpenses,
          netBalance: totalIncome - totalExpenses,
        },
        categoryTotals,
        recentActivity,
      },
    });
  },
);

router.get("/trends", validate(trendQuerySchema, "query"), async (req, res) => {
  const { months } = trendQuerySchema.parse(req.query);

  const startDate = new Date();
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);
  startDate.setMonth(startDate.getMonth() - (months - 1));

  const records = await prisma.financialRecord.findMany({
    where: {
      date: {
        gte: startDate,
      },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  const trendMap = new Map<string, { income: number; expense: number }>();

  for (let index = 0; index < months; index += 1) {
    const d = new Date(startDate);
    d.setMonth(startDate.getMonth() + index);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, { income: 0, expense: 0 });
  }

  for (const record of records) {
    const key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, "0")}`;
    const entry = trendMap.get(key) ?? { income: 0, expense: 0 };

    if (record.type === RecordType.INCOME) {
      entry.income += record.amount;
    } else {
      entry.expense += record.amount;
    }

    trendMap.set(key, entry);
  }

  const monthlyTrends = [...trendMap.entries()].map(([month, values]) => ({
    month,
    income: values.income,
    expense: values.expense,
    net: values.income - values.expense,
  }));

  res.json({
    success: true,
    data: {
      months,
      monthlyTrends,
    },
  });
});

export default router;
