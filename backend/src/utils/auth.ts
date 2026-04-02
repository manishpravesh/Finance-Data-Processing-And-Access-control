import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

import { Role } from "@prisma/client";

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN ?? "12h";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainTextPassword, hashedPassword);
};

export const signAccessToken = (payload: {
  userId: string;
  email: string;
  role: Role;
}): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const signOptions: SignOptions = {
    expiresIn: TOKEN_EXPIRY as unknown as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, {
    ...signOptions,
  });
};
