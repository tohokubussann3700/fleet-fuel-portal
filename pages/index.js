import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import {
  Fuel,
  History,
  BarChart3,
  Settings,
  Camera,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Sparkles,
  X,
  Car,
  Check,
  ExternalLink,
} from 'lucide-react';

const DEPARTMENTS = [
  'ライフデザイン部',
  'エンジニアリング部',
  '不動産部',
  '総務部',
  'その他',
];

const TABS = [
  { id: 'record', label: '給油記録', icon: Fuel },
  { id: 'history', label: '履歴', icon: History },
  { id: 'summary', label: '月次集計', icon: BarChart3 },
  { id: 'settings', label: '設定', icon: Settings },
];

export default function Home() {
  const [driver, setDriver] = useState('');
  const [department, setDepartment] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [activeTab, setActiveTab] = useState('record');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const n = window.sessionStorage.getItem('driver_name');
      const d = window.sessionStorage.getItem('driver_dept');
      if (n) setDriver(n);
      if (d) setDepartment(d);
    }
  }, []);

  const handleLogin = () => {
    const name = nameInput.trim();
    if (!name || !deptInput) return;
    setDriver(name);
    setDepartment(deptInput);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('driver_name', name);
      window.sessionStorage.setItem('driver_dept', deptInput);
    }
  };

  const handleLogout = () => {
    setDriver('');
    setDepartment('');
    setNameInput('');
    setDeptInput('');
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('driver_name');
      window.sessionStorage.removeItem('driver_dept');
    }
  };

  return (
    <>
      <Head>
        <title>社用車 燃費管理ポータル</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta name="theme-color" content="#020617" />
      </Head>

      <div className="min-h-screen bg-slate-950 text-slate-100">
        {!driver ? (
          <LoginView
            nameInput={nameInput}
            setNameInput={setNameInput}
            deptInput={deptInput}
            setDeptInput={setDeptInput}
            onLogin={handleLogin}
          />
        ) : (
          <AppView
            driver={driver}
            department={department}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
          />
        )}
      </div>
    </>
  );
}

function LoginView({
  nameInput,
  setNameInput,
  deptInput,
  setDeptInput,
  onLogin,
}) {
  const canSubmit = nameInput.trim() && deptInput;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
          <Fuel className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">社用車 燃費管理</h1>
          <p className="text-xs text-slate-400">東北物産株式会社</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <label className="mb-2 block text-sm text-slate-300">お名前</label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="例: 山田太郎"
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="mb-2 mt-4 block text-sm text-slate-300">部署</label>
        <div className="grid grid-cols-2 gap-2">
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => setDeptInput(d)}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                deptInput === d
                  ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={onLogin}
          disabled={!canSubmit}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          ログイン
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          ※ パスワードは不要です
        </p>
      </div>
    </div>
  );
}

function AppView({
  driver,
  department,
  activeTab,
  setActiveTab,
  onLogout,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [vRes, rRes] = await Promise.all([
      supabase.from('vehicles').select('*').order('name', { ascending: true }),
      supabase
        .from('fuel_records')
        .select('*, vehicles(name, plate_number)')
        .order('refueled_at', { ascending: false })
        .limit(300),
    ]);
    if (vRes.data) setVehicles(vRes.data);
    if (rRes.data) setRecords(rRes.data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Fuel className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">燃費管理</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-200">{driver}</div>
              <div className="text-[10px] text-slate-500">{department}</div>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="ログアウト"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {activeTab === 'record' && (
              <RecordTab
                driver={driver}
                department={department}
                vehicles={vehicles}
                onSaved={refresh}
              />
            )}
            {activeTab === 'history' && <HistoryTab records={records} />}
            {activeTab === 'summary' && (
              <SummaryTab records={records} vehicles={vehicles} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab vehicles={vehicles} onChanged={refresh} />
            )}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 py-3 text-[10px] transition ${
                activeTab === id
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function RecordTab({ driver, department, vehicles, onSaved }) {
  const [vehicleId, setVehicleId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    liters: '',
    price_per_liter: '',
    total_amount: '',
    odometer: '',
    refueled_at: '',
    station_name: '',
    note: '',
  });

  const fileInputRef = useRef(null);
  const activeVehicles = vehicles.filter((v) => v.is_active);

  useEffect(() => {
    if (!vehicleId && activeVehicles.length > 0) {
      setVehicleId(activeVehicles[0].id);
    }
  }, [activeVehicles]);

  useEffect(() => {
    if (!form.refueled_at) {
      setForm((f) => ({ ...f, refueled_at: nowLocalInput() }));
    }
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage(null);
  };

  const handleAnalyze = async () => {
    if (!photoFile) return;
    setAnalyzing(true);
    setMessage(null);
    try {
      const base64 = await fileToBase64(photoFile);
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: photoFile.type || 'image/jpeg',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI解析失敗');

      const d = json.data || {};
      setForm((f) => ({
        ...f,
        liters: d.liters != null ? String(d.liters) : f.liters,
        price_per_liter:
          d.price_per_liter != null
            ? String(d.price_per_liter)
            : f.price_per_liter,
        total_amount:
          d.total_amount != null ? String(d.total_amount) : f.total_amount,
        odometer: d.odometer != null ? String(d.odometer) : f.odometer,
        station_name: d.station_name || f.station_name,
        refueled_at: d.refueled_at
          ? toLocalInputValue(d.refueled_at)
          : f.refueled_at,
      }));
      setMessage({
        type: 'success',
        text: 'AI読み取り完了。内容を確認してください',
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'AI解析失敗: ' + err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!vehicleId) {
      setMessage({ type: 'error', text: '車両を選択してください' });
      return;
    }
    if (!form.liters || !form.total_amount) {
      setMessage({ type: 'error', text: '給油量と合計金額は必須です' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      let imageBase64 = null;
      let imageMediaType = null;
      if (photoFile) {
        imageBase64 = await fileToBase64(photoFile);
        imageMediaType = photoFile.type || 'image/jpeg';
      }

      const veh = activeVehicles.find((v) => v.id === vehicleId);

      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          vehicleName: veh?.name || '',
          plateNumber: veh?.plate_number || '',
          driver,
          department,
          refueledAt: form.refueled_at,
          liters: form.liters,
          pricePerLiter: form.price_per_liter || null,
          totalAmount: form.total_amount,
          odometer: form.odometer || null,
          stationName: form.station_name || null,
          note: form.note || null,
          imageBase64,
          imageMediaType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失敗');

      setMessage({ type: 'success', text: '保存しました' });
      setPhotoFile(null);
      setPhotoPreview(null);
      setForm({
        liters: '',
        price_per_liter: '',
        total_amount: '',
        odometer: '',
        refueled_at: nowLocalInput(),
        station_name: '',
        note: '',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: '保存失敗: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (activeVehicles.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6 text-center ring-1 ring-slate-800">
        <Car className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-400">
          登録済みの車両がありません。
          <br />
          「設定」タブから車両を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <label className="mb-2 block text-xs font-semibold text-slate-400">
          車両
        </label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {activeVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.plate_number ? ` (${v.plate_number})` : ''}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <label className="mb-2 block text-xs font-semibold text-slate-400">
          レシート写真
        </label>
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="レシート"
              className="max-h-72 w-full rounded-xl object-contain bg-slate-800"
            />
            <button
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1.5 ring-1 ring-slate-700 hover:bg-slate-800"
              aria-label="写真を削除"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 py-10 text-slate-400 hover:border-slate-600 hover:text-slate-300"
          >
            <Camera className="h-8 w-8" />
            <span className="text-sm">撮影 or 選択</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />

        {photoFile && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI解析中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AIで自動読み取り
              </>
            )}
          </button>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <FormRow
          label="給油量 (L) *"
          value={form.liters}
          onChange={(v) => setForm({ ...form, liters: v })}
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="35.42"
        />
        <FormRow
          label="単価 (円/L)"
          value={form.price_per_liter}
          onChange={(v) => setForm({ ...form, price_per_liter: v })}
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="172.5"
        />
        <FormRow
          label="合計金額 (円) *"
          value={form.total_amount}
          onChange={(v) => setForm({ ...form, total_amount: v })}
          type="number"
          inputMode="numeric"
          placeholder="6111"
        />
        <FormRow
          label="走行距離 (km)"
          value={form.odometer}
          onChange={(v) => setForm({ ...form, odometer: v })}
          type="number"
          inputMode="numeric"
          placeholder="12345"
        />
        <FormRow
          label="給油日時 *"
          value={form.refueled_at}
          onChange={(v) => setForm({ ...form, refueled_at: v })}
          type="datetime-local"
        />
        <FormRow
          label="給油所"
          value={form.station_name}
          onChange={(v) => setForm({ ...form, station_name: v })}
          placeholder="ENEOS 秋田中央SS"
        />
        <FormRow
          label="メモ"
          value={form.note}
          onChange={(v) => setForm({ ...form, note: v })}
          placeholder="任意"
        />
      </section>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-800'
              : 'bg-red-950 text-red-300 ring-1 ring-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            保存中...
          </>
        ) : (
          '保存する'
        )}
      </button>
    </div>
  );
}

function HistoryTab({ records }) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6 text-center ring-1 ring-slate-800">
        <History className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-400">まだ記録がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800"
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500">
                {formatJa(r.refueled_at)}
              </div>
              <div className="text-sm font-semibold">
                {r.vehicles?.name || '(車両削除済)'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold tabular-nums">
                ¥{Number(r.total_amount).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                {Number(r.liters).toFixed(2)}L
                {r.price_per_liter
                  ? ` × ¥${Number(r.price_per_liter).toFixed(1)}`
                  : ''}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{r.driver_name}</span>
            {r.department && <span>・{r.department}</span>}
            {r.odometer && (
              <span>・{Number(r.odometer).toLocaleString()}km</span>
            )}
            {r.station_name && <span>・{r.station_name}</span>}
          </div>
          {r.photo_url && (
            
              href={r.photo_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              レシート画像
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {r.note && (
            <div className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">
              {r.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryTab({ records, vehicles }) {
  const summary = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const d = new Date(r.refueled_at);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const vid = r.vehicle_id;
      const key = `${ym}__${vid}`;
      if (!map.has(key)) {
        map.set(key, {
          ym,
          vehicle_id: vid,
          vehicle_name: r.vehicles?.name || '(不明)',
          total_liters: 0,
          total_amount: 0,
          count: 0,
          max_odometer: null,
          min_odometer: null,
        });
      }
      const o = map.get(key);
      o.total_liters += Number(r.liters) || 0;
      o.total_amount += Number(r.total_amount) || 0;
      o.count += 1;
      const odo = r.odometer != null ? Number(r.odometer) : null;
      if (odo != null) {
        if (o.max_odometer == null || odo > o.max_odometer) o.max_odometer = odo;
        if (o.min_odometer == null || odo < o.min_odometer) o.min_odometer = odo;
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.ym === b.ym
        ? a.vehicle_name.localeCompare(b.vehicle_name)
        : b.ym.localeCompare(a.ym)
    );
  }, [records]);

  const groups = useMemo(() => {
    const g = new Map();
    for (const s of summary) {
      if (!g.has(s.ym)) g.set(s.ym, []);
      g.get(s.ym).push(s);
    }
    return Array.from(g.entries());
  }, [summary]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6 text-center ring-1 ring-slate-800">
        <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-400">まだ集計データがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([ym, list]) => {
        const monthTotal = list.reduce((s, x) => s + x.total_amount, 0);
        const monthLiters = list.reduce((s, x) => s + x.total_liters, 0);
        return (
          <section key={ym} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-lg font-bold">
                {ym.replace('-', '年')}月
              </h2>
              <div className="text-xs text-slate-400 tabular-nums">
                合計 ¥{monthTotal.toLocaleString()} /{' '}
                {monthLiters.toFixed(2)}L
              </div>
            </div>
            {list.map((s) => {
              const distance =
                s.max_odometer != null && s.min_odometer != null
                  ? s.max_odometer - s.min_odometer
                  : null;
              const km_per_l =
                distance && s.total_liters
                  ? distance / s.total_liters
                  : null;
              return (
                <div
                  key={s.vehicle_id + ym}
                  className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {s.vehicle_name}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {s.count}回給油
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat
                      label="金額"
                      value={`¥${s.total_amount.toLocaleString()}`}
                    />
                    <Stat
                      label="給油量"
                      value={`${s.total_liters.toFixed(2)}L`}
                    />
                    <Stat
                      label="燃費"
                      value={
                        km_per_l ? `${km_per_l.toFixed(2)} km/L` : '―'
                      }
                    />
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function SettingsTab({ vehicles, onChanged }) {
  const [newName, setNewName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) {
      setErr('車両名は必須です');
      return;
    }
    setAdding(true);
    setErr('');
    const { error } = await supabase.from('vehicles').insert({
      name: newName.trim(),
      plate_number: newPlate.trim() || null,
      fuel_type: 'gasoline',
      is_active: true,
    });
    setAdding(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNewName('');
    setNewPlate('');
    onChanged();
  };

  const handleToggleActive = async (v) => {
    await supabase
      .from('vehicles')
      .update({ is_active: !v.is_active })
      .eq('id', v.id);
    onChanged();
  };

  const handleDelete = async (v) => {
    if (
      !confirm(
        `${v.name} を削除します。関連する給油記録もすべて削除されます。よろしいですか?`
      )
    )
      return;
    await supabase.from('vehicles').delete().eq('id', v.id);
    onChanged();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <h2 className="mb-3 text-sm font-semibold">車両を追加</h2>
        <div className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="車両名 (例: 社用車4号)"
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
            placeholder="ナンバー (例: 秋田 500 あ 1234)"
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-slate-400">
          登録車両 ({vehicles.length})
        </h2>
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                v.is_active ? 'bg-blue-900/50' : 'bg-slate-800'
              }`}
            >
              <Car
                className={`h-5 w-5 ${
                  v.is_active ? 'text-blue-300' : 'text-slate-500'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-sm font-semibold ${
                  v.is_active ? 'text-slate-100' : 'text-slate-500 line-through'
                }`}
              >
                {v.name}
              </div>
              {v.plate_number && (
                <div className="truncate text-xs text-slate-500">
                  {v.plate_number}
                </div>
              )}
            </div>
            <button
              onClick={() => handleToggleActive(v)}
              className={`rounded-lg px-2.5 py-1 text-xs ${
                v.is_active
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900'
              }`}
            >
              {v.is_active ? '停止' : '再開'}
            </button>
            <button
              onClick={() => handleDelete(v)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950 hover:text-red-300"
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function FormRow({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-slate-800 px-4 py-3 text-base ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...rest}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800 px-2 py-2.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toLocalInputValue(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function formatJa(iso) {
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}
