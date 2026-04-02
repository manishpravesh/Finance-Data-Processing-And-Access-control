"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const prisma_1 = require("./lib/prisma");
const PORT = Number(process.env.PORT ?? 4000);
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required. Add it to backend/.env");
}
const server = app_1.app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${PORT}`);
});
const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down...`);
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    });
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
