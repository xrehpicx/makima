import { sign, verify } from "jsonwebtoken";
import { ENV } from "../env_validation";

export function generateToken(payload: any, expiresIn: string): string {
  const secret = ENV.JWT_SECRET;
  return sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): any {
  const secret = ENV.JWT_SECRET;
  return verify(token, secret);
}
