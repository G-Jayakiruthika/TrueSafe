import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function secret(name) {
  const v = process.env[name];
  if (v && v.length >= 16 && !v.startsWith('change-me')) return v;
  if (isProd) throw new Error(`${name} must be set to a strong value in production`);
  // Dev only: ephemeral random secret, never a hard-coded one.
  return crypto.randomBytes(32).toString('hex');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 8080,
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: 'gemini-2.5-flash',
  jwtSecret: secret('JWT_SECRET'),
  csrfSecret: secret('CSRF_SECRET'),
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  mockOtp: process.env.MOCK_OTP === 'true',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};
