import { useEffect, useState } from 'react';
import { useFund } from '../lib/store';
import { todayISO } from '../lib/db';
import type { Currency, Meal, Member, MoneyLine, Payment } from '../lib/types';
import { CURRENCIES } from '../lib/types';
import { Sheet, useToast } from './chrome';

function LineRow({ line, onChange, onRemove, removable, prefix }: { line: MoneyLine; onChange: (l: MoneyLine) => void; onRemove: () => void; removable: boolean; prefix: string }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="sr-only" htmlFor={`${prefix}-amt`}>المبلغ</label>
        <input
          id={`${prefix}-amt`}
          type="number"
          min={1}
          required={!removable}
          value={line.amount || ''}
          placeholder={removable ? 'المبلغ (اختياري)' : 'المبلغ'}
          onChange={(e) => onChange({ ...line, amount: Number(e.target.value) })}
          className="w-full rounded-xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent tabular-nums text-sm"
        />
      </div>
      <select value={line.currency} onChange={(e) => onChange({ ...line, currency: e.target.value as Currency })} aria-label="العملة" className="rounded-xl border border-[#E2E8F0] dark:border-white/10 px-2.5 bg-transparent text-sm min-h-[44px]">
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {removable && (
        <button type="button" onClick={onRemove} className="w-11 h-11 text-[#DC2626] shrink-0" aria-label="حذف السطر">
          <i className="fi fi-rr-trash fi-sm" />
        </button>
      )}
    </div>
  );
}

function activeMembers(members: Member[]): Member[] {
  return members.filter((m) => m.active !== false);
}

export function PayModal({ initial, onClose }: { initial: Payment | null; onClose: () => void }) {
  const { members, savePayment, logAudit, me } = useFund();
  const toast = useToast();
  const act = activeMembers(members);
  const [payerId, setPayerId] = useState(initial?.payerId ?? me?.id ?? act[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');
  const [lines, setLines] = useState<MoneyLine[]>(initial?.lines.map((l) => ({ ...l })) ?? [{ amount: 0, currency: 'SYP' }]);

  async function submit() {
    const valid = lines.filter((l) => l.amount > 0);
    if (!valid.length || !payerId) {
      toast('أدخل الدافع ومبلغاً واحداً على الأقل', false);
      return;
    }
    const oldTxt = initial ? initial.lines.map((l) => `${l.amount.toLocaleString('en-US')} ${l.currency}`).join(' + ') : '';
    await savePayment(initial?.id ?? null, { payerId, date, lines: valid, note });
    await logAudit(initial ? 'تعديل دفعة' : 'إضافة دفعة', initial ? `${oldTxt} ← ${valid.map((l) => `${l.amount.toLocaleString('en-US')} ${l.currency}`).join(' + ')}` : valid.map((l) => `${l.amount.toLocaleString('en-US')} ${l.currency}`).join(' + '));
    toast(initial ? 'تم تعديل الدفعة — سُجلت البصمة' : `تم حفظ الدفعة — البصمة: ${me?.name ?? ''} • الآن`);
    onClose();
  }

  return (
    <Sheet label={initial ? 'تعديل دفعة' : 'دفعة جديدة'} onClose={onClose}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <i className="fi fi-rr-wallet fi-sm text-[#059669]" /> {initial ? `تعديل دفعة — ${initial.payer}` : 'دفعة جديدة — متعددة العملات'}
        </h3>
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center" aria-label="إغلاق">
          <i className="fi fi-rr-cross-small fi-sm" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold" htmlFor="pay-payer">الدافع *</label>
            <select id="pay-payer" value={payerId} onChange={(e) => setPayerId(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]">
              {act.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.kind === 'guest' ? ' (ضيف)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold" htmlFor="pay-date">التاريخ *</label>
            <input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]" />
          </div>
        </div>
        <fieldset className="border border-[#E2E8F0] dark:border-white/10 rounded-2xl p-3 space-y-2">
          <legend className="text-xs px-1 font-bold">المبالغ — سطر لكل عملة *</legend>
          {lines.map((l, i) => (
            <LineRow
              key={i}
              prefix={`pay-${i}`}
              line={l}
              removable={i > 0}
              onChange={(nl) => setLines((prev) => prev.map((x, j) => (j === i ? nl : x)))}
              onRemove={() => setLines((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {lines.length < 3 && (
            <button type="button" onClick={() => setLines((prev) => [...prev, { amount: 0, currency: 'TRL' }])} className="text-xs font-bold flex items-center gap-1 min-h-[44px]" style={{ color: '#1E40AF' }}>
              <i className="fi fi-rr-plus-small fi-sm" /> إضافة سطر عملة
            </button>
          )}
          <p className="text-[11px] text-[#64748B]">تُضاف كل عملة لسلتها بدون تحويل.</p>
        </fieldset>
        <div>
          <label className="text-xs font-bold" htmlFor="pay-note">ملاحظة</label>
          <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="دفعة أسبوعية…" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm" />
        </div>
        <button onClick={() => void submit()} className="w-full text-white rounded-2xl py-3 font-extrabold text-sm min-h-[44px]" style={{ background: '#0F172A' }}>
          حفظ الدفعة
        </button>
      </div>
    </Sheet>
  );
}

export function MealModal({ initial, onClose }: { initial: Meal | null; onClose: () => void }) {
  const { members, saveMeal, logAudit, me } = useFund();
  const toast = useToast();
  const act = activeMembers(members);
  const [buyerId, setBuyerId] = useState(initial?.buyerId ?? me?.id ?? act[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [parts, setParts] = useState(initial?.parts ?? '');
  const [ref, setRef] = useState(initial?.ref ?? '');
  const [lines, setLines] = useState<MoneyLine[]>(initial?.lines.map((l) => ({ ...l })) ?? [{ amount: 0, currency: 'SYP' }]);

  async function submit() {
    const valid = lines.filter((l) => l.amount > 0);
    if (!valid.length || !desc.trim() || !buyerId) {
      toast('أكمل الوصف والمشتري ومبلغاً واحداً', false);
      return;
    }
    await saveMeal(initial?.id ?? null, { buyerId, date, desc: desc.trim(), lines: valid, parts, ref });
    await logAudit(initial ? 'تعديل وجبة' : 'إضافة وجبة', valid.map((l) => `${l.amount.toLocaleString('en-US')} ${l.currency}`).join(' + '));
    toast(initial ? 'تم تعديل الوجبة — سُجلت البصمة' : 'تم حفظ الوجبة — سُجلت البصمة');
    onClose();
  }

  return (
    <Sheet label={initial ? 'تعديل وجبة' : 'وجبة جديدة'} onClose={onClose}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <i className="fi fi-rr-utensils fi-sm" style={{ color: '#A16207' }} /> {initial ? `تعديل وجبة — ${initial.date}` : 'وجبة جديدة'}
        </h3>
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center" aria-label="إغلاق">
          <i className="fi fi-rr-cross-small fi-sm" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold" htmlFor="meal-desc">وصف الوجبة *</label>
          <input id="meal-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="فطور خميس: فول + فلافل…" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold" htmlFor="meal-buyer">المشتري *</label>
            <select id="meal-buyer" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]">
              {act.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold" htmlFor="meal-date">التاريخ *</label>
            <input id="meal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]" />
          </div>
        </div>
        <fieldset className="border border-[#E2E8F0] dark:border-white/10 rounded-2xl p-3 space-y-2">
          <legend className="text-xs px-1 font-bold">التكلفة — 1-3 عملات *</legend>
          {lines.map((l, i) => (
            <LineRow
              key={i}
              prefix={`meal-${i}`}
              line={l}
              removable={i > 0}
              onChange={(nl) => setLines((prev) => prev.map((x, j) => (j === i ? nl : x)))}
              onRemove={() => setLines((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {lines.length < 3 && (
            <button type="button" onClick={() => setLines((prev) => [...prev, { amount: 0, currency: 'TRL' }])} className="text-xs font-bold flex items-center gap-1 min-h-[44px]" style={{ color: '#A16207' }}>
              <i className="fi fi-rr-plus-small fi-sm" /> إضافة سطر عملة
            </button>
          )}
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold" htmlFor="meal-parts">المشاركون</label>
            <input id="meal-parts" value={parts} onChange={(e) => setParts(e.target.value)} placeholder="9 مشاركين" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold" htmlFor="meal-ref">مرجع واتساب</label>
            <input id="meal-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="poll-25-09" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm" />
          </div>
        </div>
        <button onClick={() => void submit()} className="w-full text-white rounded-2xl py-3 font-extrabold text-sm min-h-[44px]" style={{ background: '#A16207' }}>
          حفظ الوجبة
        </button>
      </div>
    </Sheet>
  );
}

export function MemberModal({ onClose }: { onClose: () => void }) {
  const { addMember, logAudit } = useFund();
  const toast = useToast();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'member' | 'guest'>('member');
  const [pin, setPin] = useState('');

  async function submit() {
    if (!name.trim() || !/^[0-9]{4}$/.test(pin)) {
      toast('أدخل الاسم و PIN من 4 أرقام', false);
      return;
    }
    await addMember(name.trim(), kind, pin);
    await logAudit('إضافة عضو', `${name.trim()}${kind === 'guest' ? ' (ضيف)' : ''}`);
    toast('تمت إضافة العضو — سُجلت البصمة');
    onClose();
  }

  return (
    <Sheet label="عضو جديد" onClose={onClose}>
      <h3 className="font-bold flex items-center gap-2 mb-3">
        <i className="fi fi-rr-user-add fi-sm text-[#1E40AF]" /> عضو / ضيف + PIN
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold" htmlFor="mb-name">الاسم *</label>
          <input id="mb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: علي" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold" htmlFor="mb-kind">النوع *</label>
            <select id="mb-kind" value={kind} onChange={(e) => setKind(e.target.value as 'member' | 'guest')} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]">
              <option value="member">عضو دائم</option>
              <option value="guest">ضيف مؤقت (أسبوع)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold" htmlFor="mb-pin">PIN *</label>
            <input id="mb-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-center tracking-[.4em] tabular-nums text-sm" />
          </div>
        </div>
        <button onClick={() => void submit()} className="w-full text-white rounded-2xl py-3 font-extrabold text-sm min-h-[44px]" style={{ background: '#0F172A' }}>
          حفظ
        </button>
      </div>
    </Sheet>
  );
}

export function LoginGate() {
  const { members, login } = useFund();
  const toast = useToast();
  const act = activeMembers(members);
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!id && act.length > 0) setId(act[0].id);
  }, [id, act.length]);

  function submit() {
    if (login(id, pin)) {
      if (navigator.vibrate) navigator.vibrate(10);
    } else {
      setErr(true);
      toast('PIN غير صحيح — حاول مجدداً', false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="anim bg-white dark:bg-[#192134] border border-[#E2E8F0] dark:border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl" style={{ background: 'linear-gradient(135deg,#0F172A,#1E40AF)' }}>
            <i className="fi fi-rr-utensils" />
          </div>
          <h1 className="font-extrabold text-xl mt-3">الصندوق المشترك</h1>
          <p className="text-xs text-[#64748B]">اختر اسمك وأدخل PIN للدخول</p>
        </div>
        <div>
          <label className="text-xs font-bold" htmlFor="login-who">الاسم *</label>
          <select id="login-who" value={id} onChange={(e) => setId(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#E2E8F0] dark:border-white/10 px-3 py-3 bg-transparent text-sm min-h-[44px]">
            {act.map((m) => (
              <option key={m.id} value={m.id}>{m.name}{m.kind === 'guest' ? ' (ضيف)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold" htmlFor="login-pin">PIN *</label>
          <input
            id="login-pin"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setErr(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            inputMode="numeric"
            placeholder="••••"
            aria-invalid={err}
            className={`mt-1 w-full rounded-2xl border px-3 py-3 bg-transparent text-center tracking-[.5em] text-xl tabular-nums ${err ? 'border-[#DC2626]' : 'border-[#E2E8F0] dark:border-white/10'}`}
          />
          {err && <p className="text-[11px] text-[#DC2626] mt-1">PIN غير صحيح لهذا الاسم.</p>}
        </div>
        <button onClick={submit} className="w-full text-white rounded-2xl py-3 font-extrabold text-sm min-h-[44px]" style={{ background: '#059669' }}>
          دخول
        </button>
      </div>
    </div>
  );
}
