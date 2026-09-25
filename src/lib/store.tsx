import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isSupabaseConfigured,
  loadDemo,
  newId,
  nowStamp,
  saveDemo,
  supabase,
  todayISO,
} from './db';
import type { AuditEntry, Meal, Member, MoneyLine, Payment } from './types';

export interface PaymentInput {
  payerId: string;
  date: string;
  lines: MoneyLine[];
  note: string;
}

export interface MealInput {
  buyerId: string;
  date: string;
  desc: string;
  lines: MoneyLine[];
  parts: string;
  ref: string;
}

interface FundState {
  loading: boolean;
  demo: boolean;
  me: Member | null;
  members: Member[];
  payments: Payment[];
  meals: Meal[];
  audit: AuditEntry[];
  login: (memberId: string, pin: string) => boolean;
  logout: () => void;
  logAudit: (action: string, detail: string) => Promise<void>;
  savePayment: (id: string | null, input: PaymentInput) => Promise<void>;
  deletePayments: (ids: string[]) => Promise<void>;
  saveMeal: (id: string | null, input: MealInput) => Promise<void>;
  deleteMeals: (ids: string[]) => Promise<void>;
  addMember: (name: string, kind: Member['kind'], pin: string) => Promise<void>;
}

const FundContext = createContext<FundState | null>(null);

const ME_KEY = 'cofund-me-v1';

function memberName(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? '—';
}

export function FundProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [me, setMe] = useState<Member | null>(null);

  const demo = !isSupabaseConfigured;

  /* ---------- load ---------- */
  useEffect(() => {
    async function boot() {
      const sb = supabase();
      if (sb) {
        const [mRes, cRes, eRes, aRes] = await Promise.all([
          sb.from('members').select('*').order('name'),
          sb.from('contributions').select('*, contribution_lines(*)').order('created_at', { ascending: false }).limit(300),
          sb.from('expenses').select('*, expense_lines(*)').order('created_at', { ascending: false }).limit(300),
          sb.from('audit_logs').select('*').order('ts', { ascending: false }).limit(150),
        ]);
        const ms: Member[] = (mRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          name: String(r.name),
          kind: r.kind === 'guest' ? 'guest' : 'member',
          active: r.active !== false,
          pin: String(r.pin ?? ''),
          color: String(r.color ?? '#1E40AF'),
        }));
        const nameOf = (id: string): string => ms.find((m) => m.id === id)?.name ?? '—';
        const ps: Payment[] = (cRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          date: String(r.date ?? todayISO()),
          payerId: String(r.member_id ?? ''),
          payer: nameOf(String(r.member_id ?? '')),
          lines: ((r.contribution_lines ?? []) as Record<string, unknown>[]).map((l) => ({
            amount: Number(l.amount),
            currency: l.currency as MoneyLine['currency'],
          })),
          note: String(r.note ?? ''),
          by: String(r.by_name ?? ''),
          createdAt: new Date(String(r.created_at ?? Date.now())).getTime(),
        }));
        const es: Meal[] = (eRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          date: String(r.date ?? todayISO()),
          desc: String(r.description ?? ''),
          buyerId: String(r.member_id ?? ''),
          buyer: nameOf(String(r.member_id ?? '')),
          lines: ((r.expense_lines ?? []) as Record<string, unknown>[]).map((l) => ({
            amount: Number(l.amount),
            currency: l.currency as MoneyLine['currency'],
          })),
          parts: String(r.parts ?? ''),
          ref: String(r.ref ?? ''),
          by: String(r.by_name ?? ''),
          createdAt: new Date(String(r.created_at ?? Date.now())).getTime(),
        }));
        const au: AuditEntry[] = (aRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          at: String(r.at ?? ''),
          who: String(r.who ?? ''),
          action: String(r.action ?? ''),
          detail: String(r.detail ?? ''),
          ts: Number(r.ts ?? Date.now()),
        }));
        setMembers(ms);
        setPayments(ps);
        setMeals(es);
        setAudit(au);
        try {
          const savedId = localStorage.getItem(ME_KEY);
          if (savedId) setMe(ms.find((m) => m.id === savedId) ?? null);
        } catch {
          /* ignore */
        }
      } else {
        const seed = loadDemo();
        setMembers(seed.members);
        setPayments(seed.payments);
        setMeals(seed.meals);
        setAudit(seed.audit);
        try {
          const savedId = localStorage.getItem(ME_KEY);
          if (savedId) setMe(seed.members.find((m) => m.id === savedId) ?? null);
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    }
    void boot();
  }, []);

  const persistDemo = useCallback(
    (next: { members: Member[]; payments: Payment[]; meals: Meal[]; audit: AuditEntry[] }) => {
      if (demo) saveDemo(next);
    },
    [demo],
  );

  const pushAudit = useCallback(
    async (who: string, action: string, detail: string, at?: string) => {
      const entry: AuditEntry = { id: newId(), at: at ?? nowStamp(), who, action, detail, ts: Date.now() };
      const sb = supabase();
      if (sb) {
        await sb.from('audit_logs').insert({ who, action, detail, at: entry.at, ts: entry.ts });
        setAudit((prev) => [entry, ...prev].slice(0, 200));
      } else {
        setAudit((prev) => {
          const next = [entry, ...prev].slice(0, 200);
          persistDemo({ members, payments, meals, audit: next });
          return next;
        });
      }
    },
    [members, payments, meals, persistDemo],
  );

  const login = useCallback(
    (memberId: string, pin: string): boolean => {
      const m = members.find((x) => x.id === memberId && x.active !== false);
      if (!m || m.pin !== pin.trim()) return false;
      setMe(m);
      try {
        localStorage.setItem(ME_KEY, m.id);
      } catch {
        /* ignore */
      }
      return true;
    },
    [members],
  );

  const logout = useCallback(() => {
    setMe(null);
    try {
      localStorage.removeItem(ME_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const savePayment = useCallback(
    async (id: string | null, input: PaymentInput) => {
      const who = me?.name ?? '—';
      const sb = supabase();
      if (sb) {
        if (id) {
          await sb.from('contributions').update({ member_id: input.payerId, date: input.date, note: input.note, by_name: `${who} • عدّلت الآن` }).eq('id', id);
          await sb.from('contribution_lines').delete().eq('contribution_id', id);
          await sb.from('contribution_lines').insert(input.lines.map((l) => ({ contribution_id: id, amount: l.amount, currency: l.currency })));
          setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, payerId: input.payerId, payer: memberName(members, input.payerId), date: input.date, lines: input.lines, note: input.note, by: `${who} • عدّلت الآن` } : p)));
        } else {
          const res = await sb.from('contributions').insert({ member_id: input.payerId, date: input.date, note: input.note, by_name: `${who} • الآن` }).select('id').single();
          const nid = String((res.data as { id: string } | null)?.id ?? newId());
          await sb.from('contribution_lines').insert(input.lines.map((l) => ({ contribution_id: nid, amount: l.amount, currency: l.currency })));
          setPayments((prev) => [{ id: nid, payer: memberName(members, input.payerId), by: `${who} • الآن`, createdAt: Date.now(), ...input }, ...prev]);
        }
      } else {
        if (id) {
          setPayments((prev) => {
            const next = prev.map((p) => (p.id === id ? { ...p, payerId: input.payerId, payer: memberName(members, input.payerId), date: input.date, lines: input.lines, note: input.note, by: `${who} • عدّلت الآن` } : p));
            persistDemo({ members, payments: next, meals, audit });
            return next;
          });
        } else {
          setPayments((prev) => {
            const next = [{ id: newId(), payer: memberName(members, input.payerId), by: `${who} • الآن`, createdAt: Date.now(), ...input }, ...prev];
            persistDemo({ members, payments: next, meals, audit });
            return next;
          });
        }
      }
    },
    [me, members, meals, audit, persistDemo],
  );

  const deletePayments = useCallback(
    async (ids: string[]) => {
      const sb = supabase();
      if (sb) {
        await sb.from('contribution_lines').delete().in('contribution_id', ids);
        await sb.from('contributions').delete().in('id', ids);
        setPayments((prev) => prev.filter((p) => !ids.includes(p.id)));
      } else {
        setPayments((prev) => {
          const next = prev.filter((p) => !ids.includes(p.id));
          persistDemo({ members, payments: next, meals, audit });
          return next;
        });
      }
    },
    [members, meals, audit, persistDemo],
  );

  const saveMeal = useCallback(
    async (id: string | null, input: MealInput) => {
      const who = me?.name ?? '—';
      const sb = supabase();
      if (sb) {
        if (id) {
          await sb.from('expenses').update({ member_id: input.buyerId, date: input.date, description: input.desc, parts: input.parts, ref: input.ref, by_name: `${who} • عدّلت الآن` }).eq('id', id);
          await sb.from('expense_lines').delete().eq('expense_id', id);
          await sb.from('expense_lines').insert(input.lines.map((l) => ({ expense_id: id, amount: l.amount, currency: l.currency })));
          setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, buyerId: input.buyerId, buyer: memberName(members, input.buyerId), date: input.date, desc: input.desc, lines: input.lines, parts: input.parts, ref: input.ref, by: `${who} • عدّلت الآن` } : m)));
        } else {
          const res = await sb.from('expenses').insert({ member_id: input.buyerId, date: input.date, description: input.desc, parts: input.parts, ref: input.ref, by_name: `${who} • الآن` }).select('id').single();
          const nid = String((res.data as { id: string } | null)?.id ?? newId());
          await sb.from('expense_lines').insert(input.lines.map((l) => ({ expense_id: nid, amount: l.amount, currency: l.currency })));
          setMeals((prev) => [{ id: nid, buyer: memberName(members, input.buyerId), by: `${who} • الآن`, createdAt: Date.now(), ...input }, ...prev]);
        }
      } else {
        if (id) {
          setMeals((prev) => {
            const next = prev.map((m) => (m.id === id ? { ...m, buyerId: input.buyerId, buyer: memberName(members, input.buyerId), date: input.date, desc: input.desc, lines: input.lines, parts: input.parts, ref: input.ref, by: `${who} • عدّلت الآن` } : m));
            persistDemo({ members, payments, meals: next, audit });
            return next;
          });
        } else {
          setMeals((prev) => {
            const next = [{ id: newId(), buyer: memberName(members, input.buyerId), by: `${who} • الآن`, createdAt: Date.now(), ...input }, ...prev];
            persistDemo({ members, payments, meals: next, audit });
            return next;
          });
        }
      }
    },
    [me, members, payments, audit, persistDemo],
  );

  const deleteMeals = useCallback(
    async (ids: string[]) => {
      const sb = supabase();
      if (sb) {
        await sb.from('expense_lines').delete().in('expense_id', ids);
        await sb.from('expenses').delete().in('id', ids);
        setMeals((prev) => prev.filter((m) => !ids.includes(m.id)));
      } else {
        setMeals((prev) => {
          const next = prev.filter((m) => !ids.includes(m.id));
          persistDemo({ members, payments, meals: next, audit });
          return next;
        });
      }
    },
    [members, payments, audit, persistDemo],
  );

  const addMember = useCallback(
    async (name: string, kind: Member['kind'], pin: string) => {
      const colors = ['#1E40AF', '#059669', '#A16207', '#7C3AED', '#0EA5E9', '#DC2626'];
      const color = colors[members.length % colors.length];
      const sb = supabase();
      if (sb) {
        const res = await sb.from('members').insert({ name, kind, pin, active: true, color }).select('id').single();
        const id = String((res.data as { id: string } | null)?.id ?? newId());
        setMembers((prev) => [...prev, { id, name, kind, active: true, pin, color }]);
      } else {
        setMembers((prev) => {
          const next = [...prev, { id: newId(), name, kind, active: true, pin, color }];
          persistDemo({ members: next, payments, meals, audit });
          return next;
        });
      }
    },
    [members, payments, meals, audit, persistDemo],
  );

  const value = useMemo<FundState>(
    () => ({ loading, demo, me, members, payments, meals, audit, login, logout, logAudit: (action: string, detail: string) => pushAudit(me?.name ?? '—', action, detail), savePayment, deletePayments, saveMeal, deleteMeals, addMember }),
    [loading, demo, me, members, payments, meals, audit, login, logout, pushAudit, savePayment, deletePayments, saveMeal, deleteMeals, addMember],
  );

  return <FundContext.Provider value={value}>{children}</FundContext.Provider>;
}

export function useFund(): FundState {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error('useFund must be used inside FundProvider');
  return ctx;
}
