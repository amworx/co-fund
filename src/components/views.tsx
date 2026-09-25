import { useEffect, useMemo, useState } from 'react';
import gsap from 'gsap';
import { calcBalances, displayDate, fmt, linesTxt, nextDueDate } from '../lib/db';
import { useFund } from '../lib/store';
import type { Meal, Payment } from '../lib/types';
import { Avatar, CurBadge, Empty, useToast } from './chrome';

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useEntrance(dep: unknown) {
  useEffect(() => {
    if (reduceMotion) return;
    gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06 }, ease: 'back.out(1.4)' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

/* ================= Dashboard ================= */

const CUR_META = {
  SYP: { label: 'ليرة سوري SYP • الرئيسية', color: '#A16207', soft: '#FEF3C7', dark: '#78350A' },
  TRL: { label: 'ليرة تركي TRL • الثانية', color: '#1E40AF', soft: '#DBEAFE', dark: '#1E3A8A' },
  USD: { label: 'دولار USD • احتياطي', color: '#059669', soft: '#D1FAE5', dark: '#065F46' },
} as const;

export function Dashboard({ onNewPay, onNewMeal, onTab }: { onNewPay: () => void; onNewMeal: () => void; onTab: (t: 'payments' | 'meals' | 'members' | 'activity') => void }) {
  const { payments, meals } = useFund();
  const bal = useMemo(() => calcBalances(payments, meals), [payments, meals]);
  useEntrance(payments.length + meals.length);

  const dueDays = Math.min(bal.daysLeft.SYP, bal.daysLeft.TRL, bal.daysLeft.USD);
  const isEmpty = payments.length === 0 && meals.length === 0;
  const dueLabel = isEmpty ? 'الصندوق فارغ — أضف أول دفعة للبدء' : Number.isFinite(dueDays) ? `بعد ${Math.max(0, Math.floor(dueDays))} أيام — ${nextDueDate(dueDays)}` : 'الرصيد مريح — لا دفعة قريبة';

  const days = useMemo(() => {
    const out: { label: string; syp: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const total = meals.filter((m) => m.date === key).flatMap((m) => m.lines).filter((l) => l.currency === 'SYP').reduce((s, l) => s + l.amount, 0);
      out.push({ label: d.toLocaleDateString('ar-SY', { weekday: 'short' }), syp: total });
    }
    return out;
  }, [meals]);
  const maxDay = Math.max(1, ...days.map((d) => d.syp));

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] text-white p-5 flex flex-wrap gap-4 items-center shadow-xl" style={{ background: 'linear-gradient(120deg,#0F172A 55%,#1E3A8A 80%,#A16207 130%)' }} role="region" aria-label="حالة الصندوق">
        <div className="relative w-20 h-20 shrink-0" role="img" aria-label={dueLabel}>
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="8" />
            <circle cx="40" cy="40" r="35" fill="none" stroke="#EAB308" strokeWidth="8" strokeLinecap="round" strokeDasharray="220" strokeDashoffset={Number.isFinite(dueDays) ? Math.max(20, 220 - Math.min(dueDays, 30) * 6) : 200} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <b className="num text-2xl leading-5 tabular-nums">{isEmpty ? '–' : Number.isFinite(dueDays) ? Math.max(0, Math.floor(dueDays)) : '∞'}</b>
            <span className="text-[10px] opacity-80">أيام</span>
          </div>
        </div>
        <div className="flex-1 min-w-[230px]">
          <h2 className="text-lg font-bold flex items-center gap-2"><i className="fi fi-rr-alarm-clock" /> {isEmpty ? 'الصندوق فارغ — أضف أول دفعة' : `الدفعة القادمة — ${nextDueDate(dueDays)}`}</h2>
          {!isEmpty && (
          <p className="text-sm opacity-90 mt-1">
            سلة <b>{bal.critical}</b> تنفد أولاً • TRL تكفي <b className="tabular-nums">{Number.isFinite(bal.daysLeft.TRL) ? bal.daysLeft.TRL.toFixed(1) : '∞'}</b> يوم • USD يكفي <b className="tabular-nums">{Number.isFinite(bal.daysLeft.USD) ? bal.daysLeft.USD.toFixed(0) : '∞'}</b> يوم.
          </p>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={onNewPay} className="font-extrabold rounded-2xl px-5 py-2.5 text-sm flex items-center gap-2 text-[#0F172A] min-h-[44px]" style={{ background: '#EAB308' }}>
              <i className="fi fi-rr-wallet fi-sm" /> + دفعة
            </button>
            <button onClick={onNewMeal} className="bg-white/15 border border-white/25 rounded-2xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 min-h-[44px]">
              <i className="fi fi-rr-utensils fi-sm" /> + وجبة
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold mb-2 flex items-center gap-2"><i className="fi fi-rr-chart-histogram fi-sm text-[#1E40AF]" /> الأرصدة مقابل الاستهلاك — 3 سلال</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['SYP', 'TRL', 'USD'] as const).map((c) => {
            const meta = CUR_META[c];
            const d = bal.daysLeft[c];
            const dLabel = Number.isFinite(d) ? `${d < 10 ? d.toFixed(1) : Math.floor(d)} يوم` : 'مريح';
            return (
              <article key={c} className="grid-item bg-white dark:bg-[#192134] rounded-2xl border border-[#E2E8F0] dark:border-white/10 p-5" aria-label={`رصيد ${c}`}>
                <div className="flex justify-between items-start">
                  <span className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow" style={{ background: meta.color }}>
                    <i className={`fi ${c === 'SYP' ? 'fi-rr-coins' : c === 'TRL' ? 'fi-rr-money' : 'fi-rr-piggy-bank'}`} />
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: meta.soft, color: meta.dark }}>{dLabel}{c === bal.critical ? ' • أولاً' : ''}</span>
                </div>
                <p className="text-xs text-[#64748B] mt-3">{meta.label}</p>
                <p className="num text-3xl font-extrabold tabular-nums">{fmt(bal.balance[c])}</p>
                <p className="text-[11px] text-[#64748B] tabular-nums">مدفوع {fmt(bal.paid[c])} • مصروف {fmt(bal.spent[c])}{bal.burn[c] > 0 ? ` • حرق ${fmt(Math.round(bal.burn[c]))}/يوم` : ''}</p>
                <div className="relative h-2.5 bg-slate-100 dark:bg-white/10 rounded-full mt-3 overflow-hidden" role="progressbar" aria-label={`متبقي ${c}`} aria-valuenow={Math.round(bal.balance[c])}>
                  <div className="bar-anim absolute inset-y-0 right-0 rounded-full" style={{ width: `${bal.paid[c] > 0 ? Math.max(4, Math.min(100, (bal.balance[c] / bal.paid[c]) * 100)) : 0}%`, background: meta.color }} />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#192134] rounded-2xl border border-[#E2E8F0] dark:border-white/10 p-5 md:col-span-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-[15px]"><i className="fi fi-rr-chart-pie fi-sm text-[#1E40AF]" /> المصروف اليومي SYP</h3>
            <span className="text-[11px] text-[#64748B]">الأرقام ظاهرة دائماً</span>
          </div>
          <div className="flex items-end gap-2.5 h-28 mt-4" role="img" aria-label="مصروف آخر 5 أيام">
            {days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="col-anim w-full rounded-t-xl" style={{ height: `${Math.max(6, (d.syp / maxDay) * 100)}%`, background: i === days.length - 1 ? 'linear-gradient(180deg,#A16207,#EAB308)' : '#93C5FD' }} title={`${d.syp.toLocaleString('en-US')}`} />
                <span className="text-[10px] text-[#64748B] tabular-nums">{d.syp >= 1000 ? `${Math.round(d.syp / 1000)}K` : d.syp}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-2.5">
          {[
            { icon: 'fi-rr-wallet', bg: '#0F172A', fg: '#EAB308', t: 'دفعة', s: 'متعددة العملات', fn: onNewPay },
            { icon: 'fi-rr-utensils', bg: undefined, fg: '#A16207', t: 'وجبة', s: '1-3 عملات', fn: onNewMeal },
            { icon: 'fi-rr-user-add', bg: undefined, fg: '#1E40AF', t: 'عضو / ضيف', s: 'PIN ••••', fn: () => onTab('members') },
            { icon: 'fi-rr-time-past', bg: undefined, fg: '#059669', t: 'السجل', s: 'من عدّل؟', fn: () => onTab('activity') },
          ].map((a) => (
            <button key={a.t} onClick={a.fn} className="rounded-2xl p-4 text-start border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#192134] min-h-[44px]" style={a.bg ? { background: a.bg, color: '#fff', borderColor: 'transparent' } : undefined}>
              <i className={`fi ${a.icon} fi-lg`} style={{ color: a.fg }} />
              <b className="block mt-2 text-sm">{a.t}</b>
              <span className="text-[11px] opacity-60">{a.s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= Payments ================= */

export function Payments({ onNew, onEdit }: { onNew: () => void; onEdit: (p: Payment) => void }) {
  const { payments, deletePayments, logAudit } = useFund();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());

  const shown = payments.filter((p) => !q.trim() || `${p.date} ${p.payer} ${linesTxt(p.lines)} ${p.note} ${p.by}`.includes(q.trim()));
  const allChecked = shown.length > 0 && shown.every((p) => sel.has(p.id));

  function toggle(id: string, on: boolean) {
    setSel((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function remove(id: string, armed: boolean, reset: () => void) {
    if (!armed) return;
    await deletePayments([id]);
    setSel((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await logAudit('حذف دفعة', `دفعة #${id.slice(0, 6)}`);
    toast('تم حذف الدفعة — سُجلت البصمة');
    reset();
  }

  async function bulkRemove() {
    const ids = shown.filter((p) => sel.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    await deletePayments(ids);
    setSel(new Set());
    await logAudit('حذف جماعي', `حذف ${ids.length} دفعات`);
    toast(`تم حذف <b class="tabular-nums">${ids.length}</b> دفعات — سُجلت البصمة`);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="fi fi-rr-search fi-sm absolute right-3.5 top-4 text-[#64748B]" />
          <label className="sr-only" htmlFor="pay-q">بحث</label>
          <input id="pay-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو ملاحظة…" className="w-full rounded-2xl border border-[#E2E8F0] bg-white dark:bg-[#192134] pr-11 pl-3 py-3 text-sm" />
        </div>
        <button onClick={onNew} className="text-white rounded-2xl px-4 font-bold flex items-center gap-2 text-sm min-h-[44px]" style={{ background: '#0F172A' }}>
          <i className="fi fi-rr-plus fi-sm" /> جديدة
        </button>
      </div>
      {sel.size > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-bold" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }} role="toolbar" aria-label="إجراءات جماعية">
          <span className="tabular-nums">{sel.size} محدد</span>
          <span className="flex-1" />
          <button onClick={() => void bulkRemove()} className="rounded-xl px-3.5 py-2 text-white text-xs font-bold flex items-center gap-1.5 min-h-[44px]" style={{ background: '#DC2626' }}>
            <i className="fi fi-rr-trash fi-sm" /> حذف المحدد
          </button>
          <button onClick={() => setSel(new Set())} className="text-xs font-bold px-2 min-h-[44px]" style={{ color: '#1E40AF' }}>إلغاء التحديد</button>
        </div>
      )}
      <div className="bg-white dark:bg-[#192134] rounded-2xl border border-[#E2E8F0] dark:border-white/10 overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-white/5 text-[#64748B] text-xs">
              <tr>
                <th className="p-3.5 w-10"><input type="checkbox" checked={allChecked} onChange={(e) => setSel(e.target.checked ? new Set(shown.map((p) => p.id)) : new Set())} className="w-5 h-5 accent-[#0F172A]" aria-label="تحديد الكل" /></th>
                <th className="text-start p-3.5">التاريخ</th><th className="text-start p-3.5">الدافع</th><th className="text-start p-3.5">المبلغ</th><th className="text-start p-3.5">البصمة</th><th><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <PayRow key={p.id} p={p} checked={sel.has(p.id)} onToggle={(on) => toggle(p.id, on)} onEdit={() => onEdit(p)} onDelete={remove} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden">
          <div className="flex items-center gap-2 px-3.5 pt-3 text-xs">
            <input type="checkbox" checked={allChecked} onChange={(e) => setSel(e.target.checked ? new Set(shown.map((p) => p.id)) : new Set())} className="w-5 h-5 accent-[#0F172A]" aria-label="تحديد كل الدفعات" />
            <span className="text-[#64748B]">تحديد الكل</span>
          </div>
          <div className="space-y-2.5 p-3.5">
            {shown.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-3.5 flex gap-3 items-start">
                <input type="checkbox" checked={sel.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} className="w-5 h-5 mt-1 accent-[#0F172A] shrink-0" aria-label={`تحديد دفعة ${p.payer}`} />
                <Avatar name={p.payer} color="#1E40AF" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2 text-sm"><b>{p.payer}</b><span className="text-[11px] text-[#64748B] tabular-nums shrink-0">{displayDate(p.date)}</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">{p.lines.map((l, i) => <CurBadge key={i} amount={l.amount} cur={l.currency} />)}</div>
                  <p className="text-[11px] text-[#64748B] mt-1.5">{p.by}{p.note ? ` • ${p.note}` : ''}</p>
                </div>
                <PayActions id={p.id} onEdit={() => onEdit(p)} onDelete={remove} />
              </div>
            ))}
          </div>
        </div>
        {shown.length === 0 && <Empty text="لا توجد دفعات مطابقة —" action={<button className="font-bold" style={{ color: '#1E40AF' }} onClick={onNew}>أضف أول دفعة</button>} />}
      </div>
    </div>
  );
}

function PayActions({ id, onEdit, onDelete }: { id: string; onEdit: () => void; onDelete: (id: string, armed: boolean, reset: () => void) => void }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 2500);
    return () => clearTimeout(t);
  }, [arm]);
  return (
    <div className="flex md:flex-row flex-col shrink-0">
      <button className="w-11 h-11" style={{ color: '#1E40AF' }} aria-label="تعديل دفعة" onClick={onEdit}><i className="fi fi-rr-edit" /></button>
      <button
        className="w-11 h-11 text-[#DC2626] min-w-[44px]"
        aria-label="حذف دفعة"
        onClick={() => {
          if (arm) {
            void onDelete(id, true, () => setArm(false));
          } else setArm(true);
        }}
      >
        {arm ? <b className="text-xs">تأكيد؟</b> : <i className="fi fi-rr-trash fi-sm" />}
      </button>
    </div>
  );
}

function PayRow({ p, checked, onToggle, onEdit, onDelete }: { p: Payment; checked: boolean; onToggle: (on: boolean) => void; onEdit: () => void; onDelete: (id: string, armed: boolean, reset: () => void) => void }) {
  return (
    <tr className="border-t hover:bg-slate-50 dark:hover:bg-white/5 transition">
      <td className="p-3.5"><input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-5 h-5 accent-[#0F172A]" aria-label={`تحديد دفعة ${p.payer}`} /></td>
      <td className="p-3.5 tabular-nums whitespace-nowrap">{displayDate(p.date)}</td>
      <td className="p-3.5 font-bold">{p.payer}</td>
      <td className="p-3.5 font-bold tabular-nums">{linesTxt(p.lines)}</td>
      <td className="p-3.5 text-xs text-[#64748B]">{p.by}{p.note ? ` • ${p.note}` : ''}</td>
      <td className="p-3.5 whitespace-nowrap"><PayActions id={p.id} onEdit={onEdit} onDelete={onDelete} /></td>
    </tr>
  );
}

/* ================= Meals ================= */

export function Meals({ onNew, onEdit }: { onNew: () => void; onEdit: (m: Meal) => void }) {
  const { meals, deleteMeals, logAudit } = useFund();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());

  const shown = meals.filter((m) => !q.trim() || `${m.date} ${m.desc} ${m.buyer} ${linesTxt(m.lines)} ${m.parts}`.includes(q.trim()));
  const allChecked = shown.length > 0 && shown.every((m) => sel.has(m.id));

  async function bulkRemove() {
    const ids = shown.filter((m) => sel.has(m.id)).map((m) => m.id);
    if (!ids.length) return;
    await deleteMeals(ids);
    setSel(new Set());
    await logAudit('حذف جماعي', `حذف ${ids.length} وجبات`);
    toast(`تم حذف <b class="tabular-nums">${ids.length}</b> وجبات — سُجلت البصمة`);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="fi fi-rr-search fi-sm absolute right-3.5 top-4 text-[#64748B]" />
          <label className="sr-only" htmlFor="meal-q">بحث في الوجبات</label>
          <input id="meal-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بوصف أو مشتري…" className="w-full rounded-2xl border border-[#E2E8F0] bg-white dark:bg-[#192134] pr-11 pl-3 py-3 text-sm" />
        </div>
        <button onClick={onNew} className="text-white rounded-2xl px-4 font-bold flex items-center gap-2 text-sm min-h-[44px]" style={{ background: '#A16207' }}>
          <i className="fi fi-rr-plus fi-sm" /> وجبة
        </button>
      </div>
      {sel.size > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-bold" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }} role="toolbar" aria-label="إجراءات جماعية">
          <span className="tabular-nums">{sel.size} محدد</span>
          <span className="flex-1" />
          <button onClick={() => void bulkRemove()} className="rounded-xl px-3.5 py-2 text-white text-xs font-bold flex items-center gap-1.5 min-h-[44px]" style={{ background: '#DC2626' }}>
            <i className="fi fi-rr-trash fi-sm" /> حذف المحدد
          </button>
          <button onClick={() => setSel(new Set())} className="text-xs font-bold px-2 min-h-[44px]" style={{ color: '#1E40AF' }}>إلغاء التحديد</button>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={allChecked} onChange={(e) => setSel(e.target.checked ? new Set(shown.map((m) => m.id)) : new Set())} className="w-5 h-5 accent-[#A16207]" aria-label="تحديد كل الوجبات" />
        <span className="text-[#64748B]">تحديد الكل</span>
      </div>
      <div className="space-y-3">
        {shown.map((m) => (
          <MealCard
            key={m.id}
            m={m}
            checked={sel.has(m.id)}
            onToggle={(on) => setSel((prev) => {
              const next = new Set(prev);
              if (on) next.add(m.id);
              else next.delete(m.id);
              return next;
            })}
            onEdit={() => onEdit(m)}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] dark:border-white/10">
          <Empty text="لا توجد وجبات —" action={<button className="font-bold" style={{ color: '#A16207' }} onClick={onNew}>أضف أول وجبة</button>} />
        </div>
      )}
    </div>
  );
}

function MealCard({ m, checked, onToggle, onEdit }: { m: Meal; checked: boolean; onToggle: (on: boolean) => void; onEdit: () => void }) {
  const { deleteMeals, logAudit } = useFund();
  const toast = useToast();
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 2500);
    return () => clearTimeout(t);
  }, [arm]);

  async function confirmDelete() {
    await deleteMeals([m.id]);
    await logAudit('حذف وجبة', `${displayDate(m.date)} — ${linesTxt(m.lines)}`);
    toast('تم حذف الوجبة — سُجلت البصمة');
  }

  return (
    <div className="bg-white dark:bg-[#192134] border border-[#E2E8F0] dark:border-white/10 rounded-2xl p-4 sm:p-5 text-sm">
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-5 h-5 mt-1 accent-[#A16207] shrink-0" aria-label={`تحديد وجبة ${m.date}`} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2 flex-wrap">
            <b className="flex items-center gap-2"><i className="fi fi-rr-utensils fi-sm" style={{ color: '#A16207' }} /> {displayDate(m.date)} — {m.desc}</b>
            <span className="text-xs text-[#64748B]">{m.buyer} • {m.parts}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {m.lines.map((l, i) => (
              <span key={i} className="font-bold tabular-nums border rounded-full px-3 py-1" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>{fmt(l.amount)} {l.currency}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-[#64748B]">
            <span className="flex items-center gap-1"><i className="fi fi-rr-receipt fi-sm" /> فاتورة</span>
            {m.ref && <span className="flex items-center gap-1"><i className="fi fi-rr-comment fi-sm" /> واتساب {m.ref}</span>}
            <span className="flex items-center gap-1"><i className="fi fi-rr-user fi-sm" /> {m.by}</span>
            <span className="mr-auto flex gap-1">
              <button className="min-h-[44px] px-3 font-bold" style={{ color: '#1E40AF' }} onClick={onEdit}>تعديل</button>
              <button
                className="min-h-[44px] px-3 text-[#DC2626]"
                onClick={() => {
                  if (arm) void confirmDelete();
                  else setArm(true);
                }}
              >
                {arm ? <b className="text-xs">تأكيد؟</b> : 'حذف'}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Members ================= */

export function Members({ onNew }: { onNew: () => void }) {
  const { members } = useFund();
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-extrabold flex items-center gap-2"><i className="fi fi-rr-users fi-sm text-[#1E40AF]" /> الأعضاء — {members.filter((m) => m.active !== false).length}</h2>
        <button onClick={onNew} className="text-white rounded-2xl px-4 py-2 text-sm font-bold flex items-center gap-2 min-h-[44px]" style={{ background: '#0F172A' }}>
          <i className="fi fi-rr-user-add fi-sm" /> عضو / ضيف
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5 text-sm">
        {members.map((m) => (
          <div key={m.id} className="bg-white dark:bg-[#192134] border border-[#E2E8F0] dark:border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <Avatar name={m.name} color={m.color} size={44} />
            <div className="flex-1">
              <b>{m.name} {m.kind === 'guest' && <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: '#FEF3C7', color: '#92400E' }}>ضيف</span>}</b>
              <br />
              <span className="text-[11px] text-[#64748B]">{m.active === false ? 'غير نشط' : m.kind === 'guest' ? 'ضيف مؤقت • أسبوع' : 'عضو دائم'}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#64748B] flex items-center gap-1.5"><i className="fi fi-rr-info fi-sm" /> الضيف المؤقت يشارك أسبوعاً — السجل يبقى للمراجعة.</p>
    </div>
  );
}

/* ================= Activity ================= */

export function Activity() {
  const { audit } = useFund();
  return (
    <div className="bg-white dark:bg-[#192134] border border-[#E2E8F0] dark:border-white/10 rounded-2xl p-5">
      <h2 className="font-bold mb-3 flex items-center gap-2"><i className="fi fi-rr-time-past fi-sm text-[#059669]" /> السجل والتدقيق — البصمة</h2>
      {audit.length === 0 && <p className="text-sm text-[#64748B]">لا حركات بعد.</p>}
      <ol className="relative border-r-2 border-slate-100 dark:border-white/10 pr-5 space-y-4 text-sm">
        {audit.map((a) => (
          <li key={a.id}>
            <b>{a.at} — {a.who}</b>{' '}
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: '#E8EEF5', color: '#0F172A' }}>{a.action}</span>
            <p className="font-bold mt-1">{a.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
