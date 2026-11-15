import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE = 'nexora_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'replace-with-secure-64-char-random-secret'
    ? process.env.SESSION_SECRET
    : crypto.createHash('sha256').update(`nexora-session-${process.cwd()}`).digest('hex');

const DOWNLOAD_SECRET =
  process.env.DOWNLOAD_TOKEN_SECRET &&
  process.env.DOWNLOAD_TOKEN_SECRET !== 'replace-with-secure-64-char-download-secret'
    ? process.env.DOWNLOAD_TOKEN_SECRET
    : crypto.createHash('sha256').update(`nexora-download-${process.cwd()}`).digest('hex');

export interface SessionPayload {
  uid: number;
  email: string;
  role: 'customer' | 'admin';
  exp: number;
}

export interface AuthedRequest extends Request {
  authUser?: SessionPayload;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signPayload(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = signPayload(encoded, SESSION_SECRET);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = signPayload(encoded, SESSION_SECRET);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.uid !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const parsed = verifySessionToken(cookieToken || bearerToken);
  if (parsed) {
    req.authUser = parsed;
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const parsed = verifySessionToken(cookieToken || bearerToken);
  if (!parsed) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.authUser = parsed;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const parsed = verifySessionToken(cookieToken || bearerToken);
  if (!parsed) {
    res.status(401).json({ error: 'Administrator authentication required.' });
    return;
  }
  if (parsed.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }
  req.authUser = parsed;
  next();
}

export interface DownloadTokenPayload {
  permissionId: number;
  userId: number;
  productId: number;
  exp: number;
}

export function createSignedDownloadToken(permissionId: number, userId: number, productId: number): string {
  const payload: DownloadTokenPayload = {
    permissionId,
    userId,
    productId,
    exp: Date.now() + 1000 * 60 * 5, // 5 minute temporary signed link
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = signPayload(encoded, DOWNLOAD_SECRET);
  return `${encoded}.${sig}`;
}

export function verifySignedDownloadToken(token: string): DownloadTokenPayload | null {
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(encoded, DOWNLOAD_SECRET);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as DownloadTokenPayload;
    if (!parsed || typeof parsed.permissionId !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
