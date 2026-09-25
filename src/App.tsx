import { useCallback, useEffect, useState } from 'react';
import { DockNav, Sheet, ToastProvider, Topbar } from './components/chrome';
import { LoginGate, MealModal, MemberModal, PayModal } from './components/modals';
import { Activity, Dashboard, Meals, Members, Payments } from './components/views';
import { FundProvider, useFund } from './lib/store';
import type { Meal, Payment, TabId } from './lib/types';

const SEEN_KEY = 'cofund-seen-v1';

function Shell() {
  const { loading, demo, me, members, audit } = useFund();
  const [tab, setTab] = useState<TabId>('home');
  const [payTarget, setPayTarget] = useState<Payment | 'new' | null>(null);
  const [mealTarget, setMealTarget] = useState<Meal | 'new' | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [seen, setSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {
      return 0;
    }
  });

  const unread = audit.filter((a) => a.ts > seen).length;

  useEffect(() => {
    if (tab === 'activity' && audit.length > 0) {
      const max = Math.max(...audit.map((a) => a.ts));
      setSeen(max);
      try {
        localStorage.setItem(SEEN_KEY, String(max));
      } catch {
        /* ignore */
      }
    }
  }, [tab, audit]);

  const goPaymentsSearch = useCallback(() => {
    setTab('payments');
    setTimeout(() => {
      const q = document.getElementById('pay-q');
      if (q) {
        q.focus();
        q.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 260);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        e.preventDefault();
        goPaymentsSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goPaymentsSearch]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-3" aria-label="جارٍ التحميل">
        <div className="skel h-24" />
        <div className="skel h-40" />
        <div className="skel h-40" />
      </div>
    );
  }

  if (!me) return <LoginGate />;

  return (
    <div className="min-h-screen pb-32">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[70] focus:bg-white focus:px-4 focus:py-2 focus:rounded-xl">تخطَّ إلى المحتوى</a>
      <Topbar onGoPayments={goPaymentsSearch} />
      {demo && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <p className="text-[11px] text-center rounded-full border border-dashed border-[#E2E8F0] dark:border-white/15 text-[#64748B] py-1.5">
            وضع تجريبي على هذا الجهاز — اربط Supabase (مفاتيح مجانية) لتتشارك البيانات مع الزملاء
          </p>
        </div>
      )}
      <main id="main" className="max-w-5xl mx-auto px-4 pt-4">
        {tab === 'home' && (
          <Dashboard
            onNewPay={() => setPayTarget('new')}
            onNewMeal={() => setMealTarget('new')}
            onTab={(t) => setTab(t)}
          />
        )}
        {tab === 'payments' && <Payments onNew={() => setPayTarget('new')} onEdit={(p) => setPayTarget(p)} />}
        {tab === 'meals' && <Meals onNew={() => setMealTarget('new')} onEdit={(m) => setMealTarget(m)} />}
        {tab === 'members' && <Members onNew={() => setMemberOpen(true)} />}
        {tab === 'activity' && <Activity />}
        <p className="text-[11px] text-center text-[#64748B] mt-6">
          الصندوق المشترك • {members.filter((m) => m.active !== false).length} أعضاء • بدون تحويل عملات
        </p>
      </main>

      <button
        onClick={() => setFabOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition"
        style={{ background: 'linear-gradient(135deg,#A16207,#EAB308)' }}
        aria-label="إضافة سريعة"
      >
        <i className="fi fi-rr-plus text-2xl" />
      </button>

      <DockNav tab={tab} onTab={setTab} auditBadge={unread} guestDot={members.some((m) => m.kind === 'guest' && m.active !== false)} />

      {fabOpen && (
        <Sheet label="إضافة" onClose={() => setFabOpen(false)}>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => { setFabOpen(false); setPayTarget('new'); }}
              className="rounded-2xl p-5 text-start text-white"
              style={{ background: '#0F172A' }}
            >
              <i className="fi fi-rr-wallet fi-lg" style={{ color: '#EAB308' }} />
              <b className="block mt-2">دفعة جديدة</b>
              <span className="text-[11px] opacity-70">1-3 عملات معاً</span>
            </button>
            <button onClick={() => { setFabOpen(false); setMealTarget('new'); }} className="rounded-2xl p-5 text-start border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <i className="fi fi-rr-utensils fi-lg" style={{ color: '#A16207' }} />
              <b className="block mt-2">وجبة جديدة</b>
              <span className="text-[11px] opacity-60">1-3 عملات معاً</span>
            </button>
            <button onClick={() => setFabOpen(false)} className="col-span-2 text-xs text-[#64748B] py-2 min-h-[44px]">إغلاق</button>
          </div>
        </Sheet>
      )}

      {payTarget && <PayModal initial={payTarget === 'new' ? null : payTarget} onClose={() => setPayTarget(null)} />}
      {mealTarget && <MealModal initial={mealTarget === 'new' ? null : mealTarget} onClose={() => setMealTarget(null)} />}
      {memberOpen && <MemberModal onClose={() => setMemberOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <FundProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </FundProvider>
  );
}

export default App;
