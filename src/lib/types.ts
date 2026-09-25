export type Currency = 'SYP' | 'TRL' | 'USD';

export const CURRENCIES: Currency[] = ['SYP', 'TRL', 'USD'];

export interface MoneyLine {
  amount: number;
  currency: Currency;
}

export type MemberKind = 'member' | 'guest';

export interface Member {
  id: string;
  name: string;
  kind: MemberKind;
  active: boolean;
  /** 4-digit PIN (demo/supabase plain — trusted office group) */
  pin: string;
  color: string;
}

export interface Payment {
  id: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  payerId: string;
  payer: string;
  lines: MoneyLine[];
  note: string;
  /** footprint: who + when */
  by: string;
  createdAt: number;
}

export interface Meal {
  id: string;
  date: string;
  desc: string;
  buyerId: string;
  buyer: string;
  lines: MoneyLine[];
  parts: string;
  ref: string;
  by: string;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  /** display time */
  at: string;
  who: string;
  action: string;
  detail: string;
  ts: number;
}

export type TabId = 'home' | 'payments' | 'meals' | 'members' | 'activity';
