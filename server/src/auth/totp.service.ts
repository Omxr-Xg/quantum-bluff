import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const APP_NAME = 'Quantum Bluff';

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
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

export async function getQRCodeDataUrl(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth, { width: 200, margin: 2 });
}
