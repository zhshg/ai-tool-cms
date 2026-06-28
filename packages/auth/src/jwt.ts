import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { JwtAccessPayload, JwtRefreshPayload } from "./types.js";

export type SignAccessTokenInput = {
  userId: string;
  email: string;
  secret: string;
  expiresIn: string;
};

export type SignRefreshTokenInput = {
  userId: string;
  secret: string;
  expiresIn: string;
  tokenId?: string;
};

export function signAccessToken(input: SignAccessTokenInput): string {
  const payload: JwtAccessPayload = {
    sub: input.userId,
    email: input.email,
    type: "access",
  };

  return jwt.sign(payload, input.secret, {
    expiresIn: input.expiresIn as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(input: SignRefreshTokenInput): {
  token: string;
  tokenId: string;
} {
  const tokenId = input.tokenId ?? randomUUID();
  const payload: JwtRefreshPayload = {
    sub: input.userId,
    tokenId,
    type: "refresh",
  };

  return {
    tokenId,
    token: jwt.sign(payload, input.secret, {
      expiresIn: input.expiresIn as SignOptions["expiresIn"],
    }),
  };
}

export function verifyAccessToken(token: string, secret: string): JwtAccessPayload {
  const payload = jwt.verify(token, secret) as JwtAccessPayload;
  if (payload.type !== "access") {
    throw new Error("Invalid access token type");
  }
  return payload;
}

export function verifyRefreshToken(token: string, secret: string): JwtRefreshPayload {
  const payload = jwt.verify(token, secret) as JwtRefreshPayload;
  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }
  return payload;
}
