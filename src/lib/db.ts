import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuditEntry, Currency, Meal, Member, MoneyLine, Payment } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL as string, SUPABASE_KEY as string);
  return client;
}

/* ---------- formatting + fund math (no conversion: 3 buckets) ---------- */

export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function linesTxt(lines: MoneyLine[]): string {
  return lines.map((l) => `${fmt(l.amount)} ${l.currency}`).join(' + ');
}

export function displayDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowStamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface Balances {
  paid: Record<Currency, number>;
  spent: Record<Currency, number>;
  balance: Record<Currency, number>;
  /** avg spend per day over the window, per currency */
  burn: Record<Currency, number>;
  /** days of runway per currency (Infinity when no burn) */
  daysLeft: Record<Currency, number>;
  /** currency that runs out first */
  critical: Currency;
}

const ZERO: Record<Currency, number> = { SYP: 0, TRL: 0, USD: 0 };

export function calcBalances(payments: Payment[], meals: Meal[]): Balances {
  const paid: Record<Currency, number> = { ...ZERO };
  const spent: Record<Currency, number> = { ...ZERO };
  for (const p of payments) for (const l of p.lines) paid[l.currency] += l.amount;
  const dayMs = 86400000;
  const now = Date.now();
  const windowDays = 14;
  const recent: Record<Currency, number> = { ...ZERO };
  for (const m of meals) {
    for (const l of m.lines) spent[l.currency] += l.amount;
    const age = (now - m.createdAt) / dayMs;
    if (age <= windowDays) for (const l of m.lines) recent[l.currency] += l.amount;
  }
  const balance: Record<Currency, number> = { SYP: 0, TRL: 0, USD: 0 };
  const burn: Record<Currency, number> = { SYP: 0, TRL: 0, USD: 0 };
  const daysLeft: Record<Currency, number> = { SYP: 0, TRL: 0, USD: 0 };
  (Object.keys(ZERO) as Currency[]).forEach((c) => {
    balance[c] = paid[c] - spent[c];
    burn[c] = recent[c] / windowDays;
    daysLeft[c] = burn[c] > 0 ? balance[c] / burn[c] : Number.POSITIVE_INFINITY;
  });
  let critical: Currency = 'SYP';
  let best = Number.POSITIVE_INFINITY;
  (Object.keys(ZERO) as Currency[]).forEach((c) => {
    if (Number.isFinite(daysLeft[c]) && daysLeft[c] < best) {
      best = daysLeft[c];
      critical = c;
    }
  });
  return { paid, spent, balance, burn, daysLeft, critical };
}

export function nextDueDate(days: number): string {
  if (!Number.isFinite(days)) return '—';
  const d = new Date(Date.now() + Math.max(0, Math.floor(days)) * 86400000);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------- demo seed (used when Supabase env is missing) ---------- */

const DEMO_KEY = 'cofund-demo-v2';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function demoSeed(): { members: Member[]; payments: Payment[]; meals: Meal[]; audit: AuditEntry[] } {
  const t = Date.now();
  const day = 86400000;
  return {
    members: [
      { id: 'm-ahmad', name: 'أحمد', kind: 'member', active: true, pin: '1234', color: '#1E40AF' },
      { id: 'm-moh', name: 'محمد', kind: 'member', active: true, pin: '1234', color: '#059669' },
      { id: 'm-sara', name: 'سارة', kind: 'member', active: true, pin: '1234', color: '#A16207' },
      { id: 'm-khaled', name: 'خالد', kind: 'member', active: true, pin: '1234', color: '#7C3AED' },
      { id: 'm-lina', name: 'لينا', kind: 'member', active: true, pin: '1234', color: '#0EA5E9' },
      { id: 'm-ali', name: 'علي', kind: 'guest', active: true, pin: '1234', color: '#EAB308' },
    ],
    payments: [
      { id: uid(), date: todayISO(), payerId: 'm-ahmad', payer: 'أحمد', lines: [{ amount: 200000, currency: 'SYP' }, { amount: 100, currency: 'TRL' }], note: 'دفعة أسبوعية', by: 'أحمد • 10:30', createdAt: t - 3600000 },
      { id: uid(), date: todayISO(), payerId: 'm-ali', payer: 'علي', lines: [{ amount: 150000, currency: 'SYP' }], note: 'مساهمة أسبوع الضيف', by: 'خالد • أمس', createdAt: t - 2 * day },
      { id: uid(), date: todayISO(), payerId: 'm-lina', payer: 'لينا', lines: [{ amount: 500, currency: 'TRL' }], note: '', by: 'لينا • أمس', createdAt: t - 3 * day },
      { id: uid(), date: todayISO(), payerId: 'm-ahmad', payer: 'أحمد', lines: [{ amount: 1000000, currency: 'SYP' }], note: 'رصيد افتتاحي', by: 'أحمد • قبل أسبوعين', createdAt: t - 13 * day },
      { id: uid(), date: todayISO(), payerId: 'm-moh', payer: 'محمد', lines: [{ amount: 800000, currency: 'SYP' }, { amount: 1500, currency: 'TRL' }], note: 'رصيد افتتاحي', by: 'محمد • قبل أسبوعين', createdAt: t - 13 * day },
      { id: uid(), date: todayISO(), payerId: 'm-sara', payer: 'سارة', lines: [{ amount: 350000, currency: 'SYP' }, { amount: 800, currency: 'TRL' }], note: '', by: 'سارة • قبل 10 أيام', createdAt: t - 10 * day },
      { id: uid(), date: todayISO(), payerId: 'm-khaled', payer: 'خالد', lines: [{ amount: 100, currency: 'TRL' }], note: '', by: 'خالد • قبل 10 أيام', createdAt: t - 10 * day },
      { id: uid(), date: todayISO(), payerId: 'm-ahmad', payer: 'يوسف', lines: [{ amount: 100, currency: 'USD' }], note: '', by: 'يوسف • قبل أسبوع', createdAt: t - 7 * day },
    ],
    meals: [
      { id: uid(), date: todayISO(), desc: 'فطور خميس: فول + فلافل + خبز', buyerId: 'm-moh', buyer: 'محمد', lines: [{ amount: 320000, currency: 'SYP' }, { amount: 180, currency: 'TRL' }], parts: '9 مشاركين', ref: 'poll-25-09', by: 'محمد • 09:15', createdAt: t - 7200000 },
      { id: uid(), date: todayISO(), desc: 'فطور أربعاء', buyerId: 'm-sara', buyer: 'سارة', lines: [{ amount: 280000, currency: 'SYP' }], parts: '10 مشاركين', ref: '', by: 'سارة • أمس', createdAt: t - day },
      { id: uid(), date: todayISO(), desc: 'فطور ثلاثاء', buyerId: 'm-ahmad', buyer: 'أحمد', lines: [{ amount: 150, currency: 'TRL' }, { amount: 10, currency: 'USD' }], parts: '8 + علي (ضيف)', ref: '', by: 'أحمد • أمس', createdAt: t - 2 * day },
      { id: uid(), date: todayISO(), desc: 'فطور الاثنين', buyerId: 'm-moh', buyer: 'محمد', lines: [{ amount: 500000, currency: 'SYP' }, { amount: 900, currency: 'TRL' }], parts: '10 مشاركين', ref: '', by: 'محمد • قبل 5 أيام', createdAt: t - 5 * day },
      { id: uid(), date: todayISO(), desc: 'فطور الأسبوع الماضي', buyerId: 'm-sara', buyer: 'سارة', lines: [{ amount: 400000, currency: 'SYP' }, { amount: 600, currency: 'TRL' }], parts: '9 مشاركين', ref: '', by: 'سارة • قبل 8 أيام', createdAt: t - 8 * day },
      { id: uid(), date: todayISO(), desc: 'فطور الأحد', buyerId: 'm-khaled', buyer: 'خالد', lines: [{ amount: 300000, currency: 'SYP' }, { amount: 270, currency: 'TRL' }, { amount: 30, currency: 'USD' }], parts: '8 مشاركين', ref: '', by: 'خالد • قبل 11 يوم', createdAt: t - 11 * day },
    ],
    audit: [
      { id: uid(), at: '10:30', who: 'أحمد', action: 'إضافة دفعة', detail: '200,000 SYP + 100 TRL', ts: t - 3600000 },
      { id: uid(), at: '09:15', who: 'محمد', action: 'إضافة وجبة', detail: '320,000 SYP + 180 TRL', ts: t - 7200000 },
      { id: uid(), at: 'أمس', who: 'سارة', action: 'تعديل وجبة', detail: '250,000 ← 280,000 SYP', ts: t - day },
    ],
  };
}

export function loadDemo(): { members: Member[]; payments: Payment[]; meals: Meal[]; audit: AuditEntry[] } {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { members: Member[]; payments: Payment[]; meals: Meal[]; audit: AuditEntry[] };
      if (parsed.members && parsed.payments && parsed.meals) return parsed;
    }
  } catch {
    /* corrupted storage -> reseed */
  }
  const seed = demoSeed();
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
  } catch {
    /* storage unavailable */
  }
  return seed;
}

export function saveDemo(state: { members: Member[]; payments: Payment[]; meals: Meal[]; audit: AuditEntry[] }): void {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return uid();
}
