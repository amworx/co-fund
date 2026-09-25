import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFund } from '../lib/store';
import type { TabId } from '../lib/types';

/* ---------- toasts ---------- */

interface Toast {
  id: number;
  html: string;
  ok: boolean;
}

const ToastContext = createContext<{ push: (html: string, ok?: boolean) => void }>({ push: () => undefined });

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((html: string, ok = true) => {
    const id = toastSeq++;
    setItems((prev) => [...prev, { id, html, ok }]);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-40 right-4 z-[60] space-y-2 max-w-xs" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast-anim flex items-start gap-2.5 rounded-2xl p-3.5 shadow-2xl text-[13px] bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: t.ok ? '#059669' : '#DC2626' }}>
              <i className={`fi ${t.ok ? 'fi-rr-check' : 'fi-rr-triangle-warning'} fi-sm`} />
            </span>
            <span dangerouslySetInnerHTML={{ __html: t.html }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (html: string, ok?: boolean) => void {
  return useContext(ToastContext).push;
}

/* ---------- primitives ---------- */

export function Avatar({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="rounded-2xl text-white flex items-center justify-center font-bold shrink-0"
      style={{ background: color ?? '#1E40AF', width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {name[0]}
    </span>
  );
}

export function CurBadge({ amount, cur }: { amount: number; cur: string }) {
  return (
    <span className="text-[11px] font-bold bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/10 rounded-full px-2.5 py-1 tabular-nums">
      {amount.toLocaleString('en-US')} {cur}
    </span>
  );
}

export function Empty({ text, action }: { text: string; action: ReactNode }) {
  return <div className="p-8 text-center text-sm text-[#64748B]">{text} {action}</div>;
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 p-4 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(2,6,23,.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-anim bg-white dark:bg-[#192134] rounded-3xl w-full max-w-md p-5" role="dialog" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/* ---------- topbar ---------- */

function useDark(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('cofund-theme') === 'dark';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('cofund-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

export function Topbar({ onGoPayments }: { onGoPayments: () => void }) {
  const { me, logout, audit, members } = useFund();
  const [dark, toggleDark] = useDark();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<'bell' | 'user' | null>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-drop]')) setOpen(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-white/75 dark:bg-[#0F172A]/75 border-b border-[#E2E8F0] dark:border-white/10 ${scrolled ? 'shadow-[0_12px_32px_-16px_rgba(15,23,42,.35)]' : ''}`}
      style={{ backdropFilter: 'blur(22px) saturate(1.4)', WebkitBackdropFilter: 'blur(22px) saturate(1.4)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-[2px] -mb-[2px]" style={{ background: 'linear-gradient(90deg,#A16207,#EAB308 30%,#1E40AF 70%,#0F172A)' }} aria-hidden="true" />
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ring-1 ring-black/10" style={{ background: 'linear-gradient(135deg,#0F172A,#1E40AF)' }}>
              <i className="fi fi-rr-utensils text-2xl" />
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-[#059669] border-2 border-white dark:border-[#0F172A] rounded-full" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold leading-5 text-lg truncate">الصندوق المشترك</h1>
            <p className={`text-xs text-[#64748B] items-center gap-1.5 mt-0.5 whitespace-nowrap overflow-hidden transition-all ${scrolled ? 'max-h-0 opacity-0' : 'max-h-6 opacity-100'} flex`}>
              <i className="fi fi-rr-users fi-sm" /> {members.filter((m) => m.active !== false && m.kind === 'member').length} أعضاء{members.some((m) => m.kind === 'guest' && m.active !== false) ? ' • ضيف مؤقت' : ''} • بدون تحويل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={onGoPayments} className="hidden md:flex items-center gap-2 text-sm text-[#64748B] bg-slate-100 dark:bg-white/10 hover:bg-slate-200 rounded-full pl-3 pr-4 py-2 transition min-h-[44px] min-w-[190px]" aria-label="بحث في المدفوعات">
            <i className="fi fi-rr-search fi-sm" />
            <span className="flex-1 text-start">بحث…</span>
            <kbd className="text-[11px] bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/10 rounded-md px-1.5 py-0.5 tabular-nums">/</kbd>
          </button>
          <button onClick={onGoPayments} className="md:hidden w-11 h-11 rounded-full bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/10 flex items-center justify-center shadow-sm" aria-label="بحث">
            <i className="fi fi-rr-search" />
          </button>
          <div className="relative" data-drop>
            <button className="relative w-11 h-11 rounded-full bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/10 flex items-center justify-center shadow-sm" aria-label={`تنبيهات — ${audit.length} غير مقروءة`} aria-expanded={open === 'bell'} onClick={() => setOpen((o) => (o === 'bell' ? null : 'bell'))}>
              <i className="fi fi-rr-bell" />
              {audit.length > 0 && (
                <span className="absolute top-2 left-2 min-w-[16px] h-4 px-1 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center tabular-nums" style={{ background: '#DC2626' }}>
                  {audit.length > 99 ? '99+' : audit.length}
                </span>
              )}
            </button>
            {open === 'bell' && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#192134] shadow-2xl p-2 text-sm z-50" role="menu" aria-label="التنبيهات">
                <p className="px-2.5 py-1.5 text-xs font-bold text-[#64748B]">أحدث الحركات</p>
                {audit.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-xl px-2.5 py-2 flex gap-2">
                    <i className="fi fi-rr-time-past fi-sm mt-0.5 text-sky-500" />
                    <span>
                      <b>{a.who}</b> — {a.action}
                      <br />
                      <span className="text-[11px] text-[#64748B]">{a.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleDark} className="w-11 h-11 rounded-full bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/10 flex items-center justify-center shadow-sm" aria-label="تبديل المظهر">
            <i className={`fi ${dark ? 'fi-rr-sun' : 'fi-rr-moon'}`} />
          </button>
          {me && (
            <div className="relative" data-drop>
              <button className="hidden sm:flex items-center gap-2 text-sm bg-slate-100 dark:bg-white/10 hover:bg-slate-200 rounded-full pl-2 pr-3 py-1.5 transition min-h-[44px]" aria-label={`حساب ${me.name}`} aria-expanded={open === 'user'} onClick={() => setOpen((o) => (o === 'user' ? null : 'user'))}>
                <span className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold" style={{ background: me.color }}>
                  {me.name[0]}
                </span>
                <span>{me.name}</span>
                <span className="text-[#059669] text-xs font-bold flex items-center gap-1">
                  <i className="fi fi-rr-shield-check fi-sm" /> PIN
                </span>
              </button>
              {open === 'user' && (
                <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#192134] shadow-2xl p-2 text-sm z-50" role="menu" aria-label="حساب">
                  <div className="px-3 py-2 text-xs text-[#64748B]">
                    مسجّل كـ <b>{me.name}</b>
                  </div>
                  <button className="w-full text-start rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 min-h-[44px] text-[#DC2626]" onClick={() => { setOpen(null); logout(); }}>
                    <i className="fi fi-rr-exit fi-sm" /> خروج
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- bottom dock ---------- */

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: 'fi-rr-home' },
  { id: 'payments', label: 'المدفوعات', icon: 'fi-rr-wallet' },
  { id: 'meals', label: 'الوجبات', icon: 'fi-rr-utensils' },
  { id: 'members', label: 'الأعضاء', icon: 'fi-rr-users' },
  { id: 'activity', label: 'السجل', icon: 'fi-rr-time-past' },
];

export function DockNav({ tab, onTab, auditBadge, guestDot }: { tab: TabId; onTab: (t: TabId) => void; auditBadge: number; guestDot: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<TabId, HTMLSpanElement | null>>>({});
  const barIndRef = useRef<HTMLSpanElement>(null);

  const move = useCallback(() => {
    const bar = barRef.current;
    const ind = barIndRef.current;
    const lbl = labelRefs.current[tab];
    if (!bar || !ind || !lbl) return;
    const barRect = bar.getBoundingClientRect();
    const r = lbl.getBoundingClientRect();
    ind.style.left = `${r.left - barRect.left + (r.width - 34) / 2}px`;
  }, [tab]);

  useLayoutEffect(() => {
    move();
  }, [move]);
  useEffect(() => {
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [move]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = TABS.findIndex((t) => t.id === tab);
    const n = e.key === 'ArrowLeft' ? (i + 1) % TABS.length : (i - 1 + TABS.length) % TABS.length;
    onTab(TABS[n].id);
    e.preventDefault();
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40" style={{ padding: '0 12px calc(10px + env(safe-area-inset-bottom))' }} aria-label="التنقل السفلي">
      <div ref={barRef} className="max-w-md mx-auto relative rounded-[26px] border border-[#E2E8F0] dark:border-white/10 bg-white/75 dark:bg-[#0F172A]/75 shadow-[0_18px_45px_-18px_rgba(15,23,42,.45)]" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} role="tablist" aria-label="أقسام الصندوق" onKeyDown={onKey}>
        <span ref={barIndRef} className="absolute bottom-1 h-1 w-[34px] rounded-full" style={{ left: 6, background: 'linear-gradient(90deg,#A16207,#EAB308)', transition: 'left .3s cubic-bezier(.34,1.3,.64,1)' }} aria-hidden="true" />
        <div className="relative grid grid-cols-5 gap-0 text-[11px] font-bold text-center px-1.5 py-1.5">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                data-tab={t.id}
                role="tab"
                aria-selected={active}
                aria-label={t.id === 'activity' && auditBadge > 0 ? `${t.label} — ${auditBadge} جديدة` : t.label}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(8);
                  onTab(t.id);
                }}
                className={`relative z-10 flex flex-col items-center gap-0.5 py-2 pb-2.5 min-h-[62px] rounded-[18px] transition-colors active:scale-95 ${active ? 'text-[#0F172A] dark:text-white' : 'text-[#64748B]'}`}
              >
                <span className="relative transition-transform" style={{ transform: active ? 'scale(1.18)' : 'none', transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)', transitionDuration: '.25s' }}>
                  <i className={`fi ${t.icon} fi-nav`} />
                  {t.id === 'members' && guestDot && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0F172A]" style={{ background: '#EAB308' }} title="ضيف جديد" />}
                  {t.id === 'activity' && auditBadge > 0 && (
                    <span className="absolute -top-1.5 -left-2 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center tabular-nums" style={{ background: '#DC2626' }}>
                      {auditBadge > 99 ? '99+' : auditBadge}
                    </span>
                  )}
                </span>
                <span
                  ref={(el) => {
                    labelRefs.current[t.id] = el;
                  }}
                  className={active ? 'font-extrabold' : ''}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
