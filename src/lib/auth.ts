import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'fallback-dev-secret';
const JWT_EXPIRY = '7d';

export async function verifyPassword(password: string): Promise<boolean> {
  const hashedPassword = process.env.HASHED_PASSWORD;
  if (hashedPassword && hashedPassword.startsWith('$2')) {
    return bcrypt.compare(password, hashedPassword);
  }
  // Fallback to plaintext comparison for backward compatibility
  return password === process.env.ADMIN_PASSWORD;
}

export function signToken(payload: Record<string, unknown> = {}): string {
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}
