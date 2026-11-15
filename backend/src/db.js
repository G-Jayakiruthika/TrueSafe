import { createClient } from '@supabase/supabase-js';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Data layer. With Supabase configured, every query goes through supabase-js (PostgREST),
 * which sends parameterised requests — no string-built SQL anywhere.
 * Every query is scoped by user_id taken from the verified session (tenant isolation),
 * and RLS in sql/001_schema.sql enforces the same at the database.
 * Without Supabase, an in-memory store keeps local demos working.
 */
const sb = config.supabaseUrl && config.supabaseServiceKey
  ? createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false } })
  : null;

const mem = { users: new Map(), scans: [] };

export const userIdFromPhone = (phone) =>
  crypto.createHash('sha256').update(`ts:${phone}`).digest('hex').slice(0, 32);

export async function upsertUser(phone) {
  const id = userIdFromPhone(phone);
  // Phone is stored as a salted hash only (data minimisation).
  const phone_hash = crypto.createHmac('sha256', config.jwtSecret).update(phone).digest('hex');
  if (sb) await sb.from('profiles').upsert({ id, phone_hash }, { onConflict: 'id' });
  else mem.users.set(id, { id, phone_hash });
  return id;
}

/** Argon2id fallback-password hashing (OWASP params). */
export const hashPassword = (pw) =>
  argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hash, pw) => argon2.verify(hash, pw);

export async function saveScan(userId, scan) {
  const row = {
    user_id: userId,
    classification: scan.classification,
    risk_score: scan.riskScore,
    redacted_text: scan.redactedText,
    lang: scan.lang,
  };
  if (sb) await sb.from('scans').insert(row);
  else mem.scans.push({ ...row, created_at: new Date().toISOString() });
}

export async function listScans(userId) {
  if (sb) {
    const { data } = await sb.from('scans')
      .select('classification,risk_score,redacted_text,created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    return data || [];
  }
  return mem.scans.filter((s) => s.user_id === userId).slice(-20).reverse()
    .map(({ user_id, ...rest }) => rest);
}

export async function deleteAllUserData(userId) {
  if (sb) {
    await sb.from('scans').delete().eq('user_id', userId);
    await sb.from('profiles').delete().eq('id', userId);
  } else {
    mem.scans = mem.scans.filter((s) => s.user_id !== userId);
    mem.users.delete(userId);
  }
}
