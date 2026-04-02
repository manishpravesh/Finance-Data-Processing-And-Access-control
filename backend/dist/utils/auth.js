"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = exports.verifyPassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN ?? "12h";
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, 10);
};
exports.hashPassword = hashPassword;
const verifyPassword = async (plainTextPassword, hashedPassword) => {
    return bcryptjs_1.default.compare(plainTextPassword, hashedPassword);
};
exports.verifyPassword = verifyPassword;
const signAccessToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    const signOptions = {
        expiresIn: TOKEN_EXPIRY,
    };
    return jsonwebtoken_1.default.sign(payload, secret, {
        ...signOptions,
    });
};
exports.signAccessToken = signAccessToken;
