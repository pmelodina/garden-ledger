import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Leaf, Plus, Trash2, Sprout, Wallet, Users, ChevronDown, X, Loader2 } from "lucide-react";

// ---------- constants ----------
const STORAGE_KEY = "garden-ledger-records";

const INCOME_CATEGORIES = ["ขายต้นไม้", "ขายผลผลิต", "รับจ้างจัดสวน", "อื่นๆ"];
const EXPENSE_CATEGORIES = ["ค่าจ้างพนักงาน", "ปุ๋ย/ยา", "เมล็ด/ต้นกล้า", "น้ำ/ไฟ", "อุปกรณ์", "อื่นๆ"];

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

// ---------- font / global style ----------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      .gl-root {
        --bg: #F1EEE3;
        --panel: #FBFAF5;
        --ink: #1E3226;
        --ink-soft: #55654F;
        --pine: #1F3D2B;
        --moss: #4A6B4E;
        --clay: #B9762F;
        --sun: #D9A441;
        --danger: #A24634;
        --line: #DAD5C2;
        font-family: 'Work Sans', sans-serif;
        color: var(--ink);
        background: var(--bg);
        min-height: 100vh;
      }
      .gl-serif { font-family: 'Fraunces', serif; }
      .gl-mono { font-family: 'IBM Plex Mono', monospace; }
      .gl-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .gl-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
      .gl-focus:focus-visible { outline: 2px solid var(--moss); outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .gl-root * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
      }
    `}</style>
  );
}

// ---------- vine divider (signature element) ----------
function VineDivider({ flip }) {
  return (
    <svg
      viewBox="0 0 200 16"
      className="w-full h-4"
      style={{ transform: flip ? "scaleX(-1)" : "none" }}
      preserveAspectRatio="none"
    >
      <path
        d="M0 8 Q 20 0, 40 8 T 80 8 T 120 8 T 160 8 T 200 8"
        fill="none"
        stroke="#DAD5C2"
        strokeWidth="1.5"
      />
      {[20, 60, 100, 140, 180].map((x, i) => (
        <path
          key={i}
          d={`M${x} 8 q 4 -7 8 -3 q -2 5 -8 3`}
          fill={i % 2 === 0 ? "#4A6B4E" : "#B9762F"}
          opacity="0.55"
        />
      ))}
    </svg>
  );
}

// ---------- main app ----------
export default function GardenLedger() {
  const [records, setRecords] = useState(null); // null = loading
  const [saveError, setSaveError] = useState(false);
  const [tab, setTab] = useState("overview"); // overview | ledger | staff
  const [selectedMonth, setSelectedMonth] = useState(monthKey(todayStr()));
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("expense");
  const [staffFormOpen, setStaffFormOpen] = useState(false);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setRecords(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setRecords([]);
    }
  }, []);

  const persist = useCallback((next) => {
    setRecords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const addRecord = (rec) => {
    persist([{ ...rec, id: uid() }, ...records]);
  };
  const deleteRecord = (id) => {
    persist(records.filter((r) => r.id !== id));
  };

  const months = useMemo(() => {
    const set = new Set(records?.map((r) => monthKey(r.date)) || []);
    set.add(monthKey(todayStr()));
    return Array.from(set).sort().reverse();
  }, [records]);

  const monthRecords = useMemo(
    () => (records || []).filter((r) => monthKey(r.date) === selectedMonth),
    [records, selectedMonth]
  );

  const totals = useMemo(() => {
    const income = monthRecords.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
    const expense = monthRecords.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, balance: income - expense };
  }, [monthRecords]);

  const staffTotals = useMemo(() => {
    const wages = (records || []).filter((r) => r.category === "ค่าจ้างพนักงาน");
    const byName = {};
    wages.forEach((r) => {
      const name = r.staffName?.trim() || "ไม่ระบุชื่อ";
      byName[name] = byName[name] || { total: 0, count: 0, last: null };
      byName[name].total += Number(r.amount);
      byName[name].count += 1;
      if (!byName[name].last || r.date > byName[name].last) byName[name].last = r.date;
    });
    return { byName, wages: wages.sort((a, b) => (a.date < b.date ? 1 : -1)) };
  }, [records]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    monthRecords
      .filter((r) => r.type === "expense")
      .forEach((r) => {
        map[r.category] = (map[r.category] || 0) + Number(r.amount);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

  if (records === null) {
    return (
      <div className="gl-root flex items-center justify-center p-10">
        <Loader2 className="animate-spin" size={22} color="#4A6B4E" />
      </div>
    );
  }

  return (
    <div className="gl-root">
      <GlobalStyle />
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--pine)" }}
          >
            <Sprout size={20} color="#E8E0C8" />
          </div>
          <div>
            <h1 className="gl-serif text-xl leading-tight" style={{ color: "var(--pine)" }}>
              บัญชีสวน
            </h1>
            <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
              จดรายรับ-รายจ่าย และค่าจ้างพนักงาน
            </p>
          </div>
        </header>

        {saveError && (
          <div
            className="text-xs px-3 py-2 rounded-lg mb-4"
            style={{ background: "#F4E4DD", color: "var(--danger)" }}
          >
            บันทึกข้อมูลไม่สำเร็จ ลองอีกครั้ง
          </div>
        )}

        {/* Tabs */}
        <nav className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "#E7E2D2" }}>
          {[
            { id: "overview", label: "ภาพรวม" },
            { id: "ledger", label: "รายการ" },
            { id: "staff", label: "พนักงาน" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="gl-focus flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: tab === t.id ? "var(--panel)" : "transparent",
                color: tab === t.id ? "var(--pine)" : "var(--ink-soft)",
                boxShadow: tab === t.id ? "0 1px 3px rgba(30,50,38,0.12)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <OverviewTab
            months={months}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            totals={totals}
            categoryBreakdown={categoryBreakdown}
            monthRecords={monthRecords}
            onDelete={deleteRecord}
          />
        )}

        {tab === "ledger" && (
          <LedgerTab records={records} onDelete={deleteRecord} />
        )}

        {tab === "staff" && (
          <StaffTab
            staffTotals={staffTotals}
            onDelete={deleteRecord}
            onAdd={() => {
              setFormType("expense");
              setStaffFormOpen(true);
              setShowForm(true);
            }}
          />
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => {
          setStaffFormOpen(false);
          setFormType(tab === "staff" ? "expense" : "expense");
          setShowForm(true);
        }}
        className="gl-focus fixed bottom-6 right-1/2 translate-x-1/2 md:right-8 md:translate-x-0 rounded-full shadow-lg flex items-center gap-2 px-5 py-3"
        style={{ background: "var(--pine)", color: "#F1EEE3", maxWidth: "28rem" }}
      >
        <Plus size={18} />
        <span className="text-sm font-medium">เพิ่มรายการ</span>
      </button>

      {showForm && (
        <RecordForm
          defaultType={formType}
          defaultStaffMode={staffFormOpen}
          existingStaffNames={Object.keys(staffTotals.byName)}
          onClose={() => setShowForm(false)}
          onSubmit={(rec) => {
            addRecord(rec);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- Overview ----------
function OverviewTab({ months, selectedMonth, setSelectedMonth, totals, categoryBreakdown, monthRecords, onDelete }) {
  const maxCat = Math.max(1, ...categoryBreakdown.map(([, v]) => v));
  return (
    <div>
      <MonthPicker months={months} value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid grid-cols-2 gap-3 mt-4 mb-2">
        <StatCard label="รายรับ" value={totals.income} color="var(--moss)" />
        <StatCard label="รายจ่าย" value={totals.expense} color="var(--clay)" />
      </div>

      <div
        className="rounded-2xl p-4 mb-5 flex items-center justify-between"
        style={{ background: "var(--pine)" }}
      >
        <div>
          <p className="text-xs mb-1" style={{ color: "#B9C9B4" }}>คงเหลือเดือนนี้</p>
          <p className="gl-mono text-2xl font-semibold" style={{ color: totals.balance >= 0 ? "#EADFAE" : "#E8B3A2" }}>
            ฿{money(totals.balance)}
          </p>
        </div>
        <Leaf size={28} color="#4A6B4E" />
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="mb-6">
          <h3 className="gl-serif text-sm mb-3" style={{ color: "var(--pine)" }}>
            รายจ่ายตามหมวด
          </h3>
          <div className="space-y-2.5">
            {categoryBreakdown.map(([cat, val]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--ink-soft)" }}>{cat}</span>
                  <span className="gl-mono">฿{money(val)}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#E7E2D2" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(val / maxCat) * 100}%`, background: "var(--clay)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <VineDivider />

      <h3 className="gl-serif text-sm my-3" style={{ color: "var(--pine)" }}>
        รายการเดือนนี้
      </h3>
      {monthRecords.length === 0 ? (
        <EmptyState text="ยังไม่มีรายการในเดือนนี้ กดปุ่ม '+ เพิ่มรายการ' เพื่อเริ่มจด" />
      ) : (
        <RecordList records={monthRecords} onDelete={onDelete} />
      )}
    </div>
  );
}

function MonthPicker({ months, value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="gl-focus w-full appearance-none rounded-xl px-4 py-2.5 text-sm font-medium pr-9"
        style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--pine)" }}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" color="var(--ink-soft)" />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>{label}</p>
      <p className="gl-mono text-lg font-semibold" style={{ color }}>฿{money(value)}</p>
    </div>
  );
}

// ---------- Ledger ----------
function LedgerTab({ records, onDelete }) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (filter === "all") return sorted;
    return sorted.filter((r) => r.type === filter);
  }, [records, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: "all", label: "ทั้งหมด" },
          { id: "income", label: "รายรับ" },
          { id: "expense", label: "รายจ่าย" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="gl-focus px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: filter === f.id ? "var(--pine)" : "var(--panel)",
              color: filter === f.id ? "#F1EEE3" : "var(--ink-soft)",
              border: "1px solid " + (filter === f.id ? "var(--pine)" : "var(--line)"),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState text="ไม่มีรายการ" />
      ) : (
        <RecordList records={filtered} onDelete={onDelete} showDate />
      )}
    </div>
  );
}

// ---------- Staff ----------
function StaffTab({ staffTotals, onDelete }) {
  const names = Object.entries(staffTotals.byName).sort((a, b) => b[1].total - a[1].total);
  return (
    <div>
      <div className="rounded-2xl p-4 mb-5" style={{ background: "var(--pine)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} color="#B9C9B4" />
          <p className="text-xs" style={{ color: "#B9C9B4" }}>จ่ายค่าจ้างรวมทั้งหมด</p>
        </div>
        <p className="gl-mono text-2xl font-semibold" style={{ color: "#EADFAE" }}>
          ฿{money(names.reduce((s, [, v]) => s + v.total, 0))}
        </p>
      </div>

      {names.length === 0 ? (
        <EmptyState text="ยังไม่มีการจ่ายค่าจ้างพนักงาน กดปุ่ม '+ เพิ่มรายการ' แล้วเลือกหมวด 'ค่าจ้างพนักงาน'" />
      ) : (
        <div className="space-y-3 mb-6">
          {names.map(([name, v]) => (
            <div
              key={name}
              className="rounded-xl p-3.5 flex items-center justify-between"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{name}</p>
                <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                  จ่ายแล้ว {v.count} ครั้ง · ล่าสุด {v.last}
                </p>
              </div>
              <p className="gl-mono text-sm font-semibold" style={{ color: "var(--clay)" }}>
                ฿{money(v.total)}
              </p>
            </div>
          ))}
        </div>
      )}

      <VineDivider flip />
      <h3 className="gl-serif text-sm my-3" style={{ color: "var(--pine)" }}>
        ประวัติการจ่าย
      </h3>
      {staffTotals.wages.length === 0 ? (
        <EmptyState text="ไม่มีประวัติ" />
      ) : (
        <RecordList records={staffTotals.wages} onDelete={onDelete} showDate showStaff />
      )}
    </div>
  );
}

// ---------- shared record list ----------
function RecordList({ records, onDelete, showDate, showStaff }) {
  return (
    <ul className="space-y-2 gl-scroll">
      {records.map((r) => (
        <li
          key={r.id}
          className="rounded-xl px-3.5 py-3 flex items-center gap-3"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: r.type === "income" ? "var(--moss)" : "var(--clay)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
              {showStaff && r.staffName ? r.staffName : r.category}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--ink-soft)" }}>
              {showDate ? `${r.date} · ` : ""}
              {r.note || (showStaff ? r.category : "\u00A0")}
            </p>
          </div>
          <p
            className="gl-mono text-sm font-semibold shrink-0"
            style={{ color: r.type === "income" ? "var(--moss)" : "var(--clay)" }}
          >
            {r.type === "income" ? "+" : "-"}฿{money(r.amount)}
          </p>
          <button
            onClick={() => onDelete(r.id)}
            className="gl-focus shrink-0 p-1 rounded-md"
            aria-label="ลบรายการ"
          >
            <Trash2 size={15} color="var(--ink-soft)" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="rounded-xl px-4 py-8 text-center text-sm"
      style={{ background: "var(--panel)", border: "1px dashed var(--line)", color: "var(--ink-soft)" }}
    >
      {text}
    </div>
  );
}

// ---------- form ----------
function RecordForm({ defaultType, defaultStaffMode, existingStaffNames, onClose, onSubmit }) {
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState(defaultStaffMode ? "ค่าจ้างพนักงาน" : EXPENSE_CATEGORIES[0]);
  const [staffName, setStaffName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isStaff = type === "expense" && category === "ค่าจ้างพนักงาน";

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0]);
  }, [type]); // eslint-disable-line

  const canSubmit = amount && Number(amount) > 0 && date && (!isStaff || staffName.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      type,
      category,
      amount: Number(amount),
      date,
      note: note.trim(),
      staffName: isStaff ? staffName.trim() : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(30,50,38,0.35)" }}
      onClick={onClose}
    >
      <div
        className="gl-root w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 gl-scroll"
        style={{ maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="gl-serif text-lg" style={{ color: "var(--pine)" }}>เพิ่มรายการ</h2>
          <button onClick={onClose} className="gl-focus p-1 rounded-md" aria-label="ปิด">
            <X size={18} color="var(--ink-soft)" />
          </button>
        </div>

        {/* type toggle */}
        <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "#E7E2D2" }}>
          {[
            { id: "income", label: "รายรับ" },
            { id: "expense", label: "รายจ่าย" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="gl-focus flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: type === t.id ? "var(--panel)" : "transparent",
                color: type === t.id ? "var(--pine)" : "var(--ink-soft)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft)" }}>หมวดหมู่</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="gl-focus w-full rounded-xl px-3.5 py-2.5 text-sm mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {isStaff && (
          <>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft)" }}>ชื่อพนักงาน</label>
            <input
              list="staff-names"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="เช่น สมชาย"
              className="gl-focus w-full rounded-xl px-3.5 py-2.5 text-sm mb-4"
              style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
            />
            <datalist id="staff-names">
              {existingStaffNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </>
        )}

        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft)" }}>จำนวนเงิน (บาท)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="gl-focus gl-mono w-full rounded-xl px-3.5 py-2.5 text-sm mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
        />

        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft)" }}>วันที่</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="gl-focus w-full rounded-xl px-3.5 py-2.5 text-sm mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
        />

        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft)" }}>โน้ต (ไม่บังคับ)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="รายละเอียดเพิ่มเติม"
          className="gl-focus w-full rounded-xl px-3.5 py-2.5 text-sm mb-5"
          style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="gl-focus w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: canSubmit ? "var(--pine)" : "#C9C4B2",
            color: "#F1EEE3",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          <Wallet size={16} />
          บันทึกรายการ
        </button>
      </div>
    </div>
  );
}
