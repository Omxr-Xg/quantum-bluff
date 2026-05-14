import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const APP_NAME = 'Quantum Bluff';
const ENCRYPTED_TOTP_PREFIX = 'enc:v1:';

function totpEncryptionKey(): Buffer {
  return createHash('sha256').update(env.jwtSecret).digest();
}

export function generateTotpSecret(userId: string, email: string): { secret: string; otpauth: string } {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    issuer: APP_NAME,
    length: 32,
  });
  return {
    secret: secret.base32,
    otpauth: secret.otpauth_url || '',
  };
}

export function verifyTotpToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: unprotectTotpSecret(secret),
    encoding: 'base32',
    token,
    window: 1,
  });
}

export async function getQRCodeDataUrl(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth, { width: 200, margin: 2 });
}

export function protectTotpSecret(secret: string): string {
  if (secret.startsWith(ENCRYPTED_TOTP_PREFIX)) return secret;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', totpEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_TOTP_PREFIX}${[
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')}`;
}

export function unprotectTotpSecret(secret: string): string {
  if (!secret.startsWith(ENCRYPTED_TOTP_PREFIX)) return secret;
  const encoded = secret.slice(ENCRYPTED_TOTP_PREFIX.length);
  const [ivRaw, tagRaw, ciphertextRaw] = encoded.split('.');
  if (!ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error('Invalid encrypted TOTP secret');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    totpEncryptionKey(),
    Buffer.from(ivRaw, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
