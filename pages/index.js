import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Image from 'next/image';

// ========== 画像圧縮 ==========
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== メイン ==========
export default function Home() {
  const [screen, setScreen] = useState('loading');
  const [tab, setTab] = useState('record');
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [justSavedRecordId, setJustSavedRecordId] = useState(null);

  useEffect(() => { loadMasters(); }, []);

  async function loadMasters() {
    try {
      const [empRes, vehRes] = await Promise.all([
        supabase.from('employees').select('*').eq('is_active', true).order('name'),
        supabase.from('vehicles').select('*').eq('is_active', true).order('name'),
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (vehRes.data) setVehicles(vehRes.data);

      const savedEmpId = typeof window !== 'undefined' ? localStorage.getItem('lastEmployeeId') : null;
      const savedVehId = typeof window !== 'undefined' ? localStorage.getItem('lastVehicleId') : null;
      if (savedEmpId && empRes.data) {
        const emp = empRes.data.find(e => e.id === savedEmpId);
        if (emp) setCurrentEmployee(emp);
      }
      if (savedVehId && vehRes.data) {
        const veh = vehRes.data.find(v => v.id === savedVehId);
        if (veh) setCurrentVehicle(veh);
      }
      setScreen('login');
    } catch (err) {
      console.error('Master load error', err);
      setScreen('login');
    }
  }

  function handleLogin(emp, veh) {
    setCurrentEmployee(emp);
    setCurrentVehicle(veh);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastEmployeeId', emp.id);
      localStorage.setItem('lastVehicleId', veh.id);
    }
    setTab('record');
    setScreen('app');
  }

  function handleLogout() {
    setCurrentEmployee(null);
    setCurrentVehicle(null);
    setScreen('login');
  }

  function handleSaved(recordId) {
    setJustSavedRecordId(recordId);
    setTab('history');
  }

  if (screen === 'loading') {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">読込中...</div>;
  }
  if (screen === 'login') {
    return <LoginScreen employees={employees} vehicles={vehicles} onLogin={handleLogin} defaultEmployee={currentEmployee} defaultVehicle={currentVehicle} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <Header employee={currentEmployee} vehicle={currentVehicle} onChangeVehicle={() => setScreen('login')} onLogout={handleLogout} />
      {tab === 'record' && <RecordScreen employee={currentEmployee} vehicle={currentVehicle} onSaved={handleSaved} />}
      {tab === 'history' && <HistoryScreen vehicles={vehicles} employees={employees} autoOpenId={justSavedRecordId} onAutoOpened={() => setJustSavedRecordId(null)} />}
      {tab === 'monthly' && <MonthlyScreen vehicles={vehicles} />}
      {tab === 'settings' && <SettingsScreen employee={currentEmployee} employees={employees} vehicles={vehicles} onReload={loadMasters} />}
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

// ========== ログイン(検索バー削除) ==========
function LoginScreen({ employees, vehicles, onLogin, defaultEmployee, defaultVehicle }) {
  const [selectedEmp, setSelectedEmp] = useState(defaultEmployee || null);
  const [selectedVeh, setSelectedVeh] = useState(defaultVehicle || null);
  const [showEmpList, setShowEmpList] = useState(false);
  const [showVehList, setShowVehList] = useState(false);

  const sortedVehs = defaultVehicle ? [defaultVehicle, ...vehicles.filter(v => v.id !== defaultVehicle.id)] : vehicles;
  const canStart = selectedEmp && selectedVeh;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-5 flex flex-col">
      <div className="flex flex-col items-center mt-8 mb-10">
        <div className="relative w-36 h-24 mb-2">
          <Image src="/tbk-logo.png" alt="TBK" fill style={{ objectFit: 'contain' }} priority />
        </div>
        <div className="text-xs text-slate-400 tracking-widest">社用車 燃費管理</div>
      </div>

      <label className="text-xs text-slate-300 uppercase tracking-wider mb-2">お名前</label>
      <button onClick={() => setShowEmpList(!showEmpList)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-left text-base flex items-center justify-between mb-2 hover:border-blue-500 transition">
        <span className={selectedEmp ? 'text-slate-100' : 'text-slate-400'}>
          {selectedEmp ? `${selectedEmp.name} (${selectedEmp.department || '-'})` : '社員を選択してください'}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showEmpList ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {showEmpList && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {employees.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 text-center">社員が登録されていません</div>
            ) : employees.map(emp => (
              <button key={emp.id} onClick={() => { setSelectedEmp(emp); setShowEmpList(false); }} className={`w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex items-center gap-3 ${selectedEmp?.id === emp.id ? 'bg-blue-900/30' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium flex-shrink-0">{emp.name.split(' ')[0].slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {emp.name}
                    {emp.is_admin && <span className="text-xs bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">🔒 Admin</span>}
                  </div>
                  <div className="text-xs text-slate-400">{emp.department || '-'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="text-xs text-slate-300 uppercase tracking-wider mb-2 mt-2">使う車両</label>
      <button onClick={() => setShowVehList(!showVehList)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-left text-base flex items-center justify-between mb-2 hover:border-blue-500 transition">
        <span className={selectedVeh ? 'text-slate-100' : 'text-slate-400'}>{selectedVeh ? selectedVeh.name : '車両を選択してください'}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showVehList ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {showVehList && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {sortedVehs.map((veh, idx) => (
              <button key={veh.id} onClick={() => { setSelectedVeh(veh); setShowVehList(false); }} className={`w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex items-center gap-3 ${selectedVeh?.id === veh.id ? 'bg-blue-900/30' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${defaultVehicle?.id === veh.id && idx === 0 ? 'bg-blue-800' : 'bg-slate-800'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0zM1 9h18l2 6v2H3v-2zM3 9l2-4h12l2 4"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {veh.name}
                    {defaultVehicle?.id === veh.id && idx === 0 && <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">前回</span>}
                  </div>
                  <div className="text-xs text-slate-400">{veh.plate_number || 'ナンバー未登録'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => canStart && onLogin(selectedEmp, selectedVeh)} disabled={!canStart} className={`w-full rounded-xl py-4 text-base font-medium mt-auto ${canStart ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>はじめる</button>
      <div className="text-center text-xs text-slate-500 mt-3">※ パスワードは不要です</div>
    </div>
  );
}

// ========== ヘッダー ==========
function Header({ employee, vehicle, onChangeVehicle, onLogout }) {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-9 h-9 flex-shrink-0">
          <Image src="/tbk-logo.png" alt="TBK" fill style={{ objectFit: 'contain' }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{vehicle?.name}</div>
          <div className="text-xs text-slate-400 truncate">{employee?.name} / {employee?.department || '-'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onChangeVehicle} className="text-sm text-blue-300 px-2 py-1">変更</button>
        <button onClick={onLogout} className="text-slate-300" title="ログアウト">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </div>
  );
}

// ========== 給油記録 ==========
function RecordScreen({ employee, vehicle, onSaved }) {
  const [receiptImage, setReceiptImage] = useState(null);
  const [meterImage, setMeterImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [liters, setLiters] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [distance, setDistance] = useState('');
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [stationName, setStationName] = useState('');
  const [memo, setMemo] = useState('');
  const [lastOdometer, setLastOdometer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    if (!vehicle?.id) return;
    supabase.from('fuel_records').select('odometer').eq('vehicle_id', vehicle.id).order('datetime', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data[0]) setLastOdometer(data[0].odometer); });
  }, [vehicle?.id]);

  useEffect(() => {
    if (odometer && lastOdometer && !distance) {
      const calcDist = Math.max(0, Number(odometer) - lastOdometer);
      if (calcDist > 0) setDistance(String(calcDist));
    }
  }, [odometer, lastOdometer]);

  const mileage = (distance && liters && Number(liters) > 0) ? (Number(distance) / Number(liters)).toFixed(2) : null;

  async function handleImageChange(e, which) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      if (which === 'receipt') setReceiptImage(compressed);
      else setMeterImage(compressed);
    } catch (err) {
      alert('画像の読み込みに失敗しました');
    }
  }

  async function handleAnalyze() {
    if (!receiptImage && !meterImage) { alert('レシートかメーター画像を先に選択してください'); return; }
    setAnalyzing(true);
    setAiError(null);
    try {
      const tasks = [];
      if (receiptImage) {
        tasks.push(fetch('/api/analyze-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: receiptImage, imageType: 'receipt' }),
        }).then(r => r.json().then(j => ({ type: 'receipt', ok: r.ok, json: j }))));
      }
      if (meterImage) {
        tasks.push(fetch('/api/analyze-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: meterImage, imageType: 'meter' }),
        }).then(r => r.json().then(j => ({ type: 'meter', ok: r.ok, json: j }))));
      }
      const results = await Promise.all(tasks);
      const errors = [];
      for (const result of results) {
        if (!result.ok || !result.json.success) {
          errors.push(`${result.type === 'receipt' ? 'レシート' : 'メーター'}: ${result.json.error || 'AI解析失敗'}`);
          continue;
        }
        const d = result.json.data;
        if (result.type === 'receipt') {
          if (d.liters != null) setLiters(String(d.liters));
          if (d.unitPrice != null) setUnitPrice(String(d.unitPrice));
          if (d.totalAmount != null) setTotalAmount(String(d.totalAmount));
          if (d.stationName) setStationName(d.stationName);
          if (d.datetime) setDatetime(d.datetime);
        } else if (result.type === 'meter') {
          const candidates = [d.odometer, d.tripA, d.tripB].filter(v => v != null && !isNaN(v));
          let odoValue = null;
          let distValue = null;
          candidates.forEach(v => {
            const num = Number(v);
            if (num >= 1000) {
              if (odoValue == null || num > odoValue) odoValue = num;
            } else {
              if (distValue == null || num > distValue) distValue = num;
            }
          });
          if (odoValue != null) setOdometer(String(odoValue));
          if (distValue != null) setDistance(String(distValue));
        }
      }
      if (errors.length > 0) setAiError(errors.join(' | '));
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!totalAmount) { alert('合計金額は必須です'); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          employee_id: employee.id,
          driver_name: employee.name,
          department: employee.department,
          datetime,
          liters: liters ? Number(liters) : null,
          unit_price: unitPrice ? Number(unitPrice) : null,
          total_amount: Number(totalAmount),
          odometer: odometer ? Number(odometer) : null,
          distance: distance ? Number(distance) : null,
          mileage: mileage ? Number(mileage) : null,
          station_name: stationName || null,
          memo: memo || null,
          receipt_image: receiptImage,
          meter_image: meterImage,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '保存に失敗しました');

      setSaveMsg({ type: 'success', text: '保存しました!DB+Spreadsheet+Driveに反映済み' });
      setReceiptImage(null); setMeterImage(null);
      setLiters(''); setUnitPrice(''); setTotalAmount('');
      setOdometer(''); setDistance(''); setStationName(''); setMemo('');
      if (odometer) setLastOdometer(Number(odometer));

      setTimeout(() => {
        if (json.record?.id && onSaved) onSaved(json.record.id);
      }, 800);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-slate-300 mb-1.5 text-center">レシート</div>
          {receiptImage ? (
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-2 h-32 flex items-center justify-center">
              <img src={receiptImage} alt="レシート" className="max-h-full max-w-full object-contain rounded" />
              <button onClick={() => setReceiptImage(null)} className="absolute top-1 right-1 w-6 h-6 bg-slate-800/80 rounded-full text-slate-200 text-xs">×</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 h-32">
              <label className="bg-blue-950/40 border border-blue-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-300 mb-1"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <div className="text-xs text-blue-200">撮影</div>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageChange(e, 'receipt')} className="hidden" />
              </label>
              <label className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div className="text-xs text-slate-300">画像選択</div>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'receipt')} className="hidden" />
              </label>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-300 mb-1.5 text-center">メーター</div>
          {meterImage ? (
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-2 h-32 flex items-center justify-center">
              <img src={meterImage} alt="メーター" className="max-h-full max-w-full object-contain rounded" />
              <button onClick={() => setMeterImage(null)} className="absolute top-1 right-1 w-6 h-6 bg-slate-800/80 rounded-full text-slate-200 text-xs">×</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 h-32">
              <label className="bg-blue-950/40 border border-blue-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-300 mb-1"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <div className="text-xs text-blue-200">撮影</div>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageChange(e, 'meter')} className="hidden" />
              </label>
              <label className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div className="text-xs text-slate-300">画像選択</div>
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'meter')} className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>
      <button onClick={handleAnalyze} disabled={(!receiptImage && !meterImage) || analyzing} className={`w-full rounded-xl py-3 text-base font-medium mb-4 flex items-center justify-center gap-2 ${(receiptImage || meterImage) && !analyzing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
        {analyzing ? '解析中...' : '✨ AIで画像を読み取る'}
      </button>

      {aiError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-200">AI解析失敗: {aiError}</div>}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <FormField label="単価" value={unitPrice} onChange={setUnitPrice} type="number" step="0.01" placeholder="172.5" big />
        <FormField label="給油量(L)" value={liters} onChange={setLiters} type="number" step="0.01" placeholder="35.42" big />
        <FormField label="合計(円)*" value={totalAmount} onChange={setTotalAmount} type="number" placeholder="6111" required big />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <FormField label="オドメーター(km)" value={odometer} onChange={setOdometer} type="number" placeholder="73000" />
        <FormField label="今回走行距離(km)" value={distance} onChange={setDistance} type="number" placeholder="500" />
      </div>
      {lastOdometer && <div className="text-xs text-slate-400 mb-3">前回オドメーター: {lastOdometer.toLocaleString()} km</div>}

      <div className="space-y-3 mb-4">
        <FormField label="給油日時 *" value={datetime} onChange={setDatetime} type="datetime-local" required />
        <FormField label="給油所" value={stationName} onChange={setStationName} placeholder="カーピット八橋サービスステーション" />
        <FormField label="メモ" value={memo} onChange={setMemo} placeholder="任意" />
      </div>

      {mileage !== null && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex justify-around text-center">
          <div>
            <div className="text-xs text-slate-400">今回走行距離</div>
            <div className="text-lg font-medium mt-1 text-slate-100">{distance} km</div>
          </div>
          <div className="border-l border-slate-800"></div>
          <div>
            <div className="text-xs text-slate-400">今回の燃費</div>
            <div className="text-lg font-medium mt-1 text-slate-100">{mileage} km/L</div>
          </div>
        </div>
      )}

      {saveMsg && <div className={`rounded-xl p-3 mb-4 text-sm ${saveMsg.type === 'success' ? 'bg-green-950/40 border border-green-800 text-green-200' : 'bg-red-950/40 border border-red-800 text-red-200'}`}>{saveMsg.text}</div>}

      <button onClick={handleSave} disabled={saving} className={`w-full rounded-xl py-4 text-base font-medium ${saving ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', step, placeholder, required, big, readOnly }) {
  return (
    <div>
      <label className="text-xs text-slate-300 mb-1 block">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        style={{ fontSize: '16px' }}
        className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 outline-none focus:border-blue-500 ${big ? 'text-lg font-medium' : 'text-base'} ${readOnly ? 'opacity-80' : ''}`}
      />
    </div>
  );
}

// ========== 履歴 ==========
function HistoryScreen({ vehicles, employees, autoOpenId, onAutoOpened }) {
  const [records, setRecords] = useState([]);
  const [filterVehicleId, setFilterVehicleId] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => { loadRecords(); }, [filterVehicleId, filterMonth]);

  useEffect(() => {
    if (autoOpenId && records.length > 0) {
      const target = records.find(r => r.id === autoOpenId);
      if (target) {
        setEditingRecord(target);
        if (onAutoOpened) onAutoOpened();
      }
    }
  }, [autoOpenId, records]);

  async function loadRecords() {
    setLoading(true);
    let q = supabase.from('fuel_records').select('*').order('datetime', { ascending: false }).limit(200);
    if (filterVehicleId !== 'all') q = q.eq('vehicle_id', filterVehicleId);
    if (filterMonth !== 'all') {
      const [y, m] = filterMonth.split('-').map(Number);
      const start = new Date(y, m - 1, 1).toISOString();
      const end = new Date(y, m, 1).toISOString();
      q = q.gte('datetime', start).lt('datetime', end);
    }
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  }

  const grouped = records.reduce((acc, r) => {
    const key = r.datetime ? r.datetime.slice(0, 7) : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // 月表示用フォーマット(2026-04 → "2026年4月")
  function formatMonth(monthStr) {
    if (!monthStr || monthStr === 'unknown') return '不明';
    const [y, m] = monthStr.split('-').map(Number);
    return `${y}年${m}月`;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex gap-2 mb-4">
        <select value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)} style={{ fontSize: '16px' }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100">
          <option value="all">全車両</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: '16px' }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100">
          <option value="all">全期間</option>
          {Object.keys(grouped).sort().reverse().map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      {loading && <div className="text-center text-slate-300 py-8">読込中...</div>}
      {!loading && records.length === 0 && <div className="text-center text-slate-300 py-8">記録がありません</div>}

      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, recs]) => {
        const totalDist = recs.reduce((s, r) => s + (r.distance || 0), 0);
        const totalAmount = recs.reduce((s, r) => s + (r.total_amount || 0), 0);
        const totalLiters = recs.reduce((s, r) => s + (r.liters || 0), 0);
        const avgMileage = totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : '—';
        return (
          <div key={month} className="mb-8">
            {/* サマリーカード(強調) */}
            <div className="relative bg-gradient-to-br from-blue-950 to-slate-900 border-2 border-blue-600/50 rounded-2xl p-5 mb-4 shadow-lg shadow-blue-900/20">
              <div className="absolute top-3 right-3 text-[10px] text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">{formatMonth(month)}</div>
              <div className="text-xs text-blue-200/80 uppercase tracking-wider mb-1">今月の走行距離</div>
              <div className="text-3xl font-bold text-white mb-3">{totalDist.toLocaleString()} <span className="text-lg text-blue-200">km</span></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/60 rounded-lg py-2">
                  <div className="text-[10px] text-slate-400">費用</div>
                  <div className="text-sm font-semibold text-white">¥{totalAmount.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg py-2">
                  <div className="text-[10px] text-slate-400">給油量</div>
                  <div className="text-sm font-semibold text-white">{totalLiters.toFixed(1)}L</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg py-2">
                  <div className="text-[10px] text-slate-400">平均燃費</div>
                  <div className="text-sm font-semibold text-white">{avgMileage} km/L</div>
                </div>
              </div>
            </div>

            {/* 詳細レコードカード */}
            {recs.map(r => {
              const veh = vehicles.find(v => v.id === r.vehicle_id);
              return (
                <button key={r.id} onClick={() => setEditingRecord(r)} className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2 hover:border-blue-500 transition">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{r.datetime ? new Date(r.datetime).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    <span>{veh?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-base font-medium">¥{(r.total_amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-slate-300">{r.liters ? `${r.liters}L` : '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-slate-800 rounded px-2 py-1 text-slate-200">走行: {r.distance ? `${r.distance} km` : '—'}</div>
                    <div className="bg-slate-800 rounded px-2 py-1 text-slate-200">燃費: {r.mileage ? `${r.mileage} km/L` : '—'}</div>
                  </div>
                  <div className="text-xs text-slate-400">{r.driver_name || '-'} / {r.station_name || '-'}</div>
                </button>
              );
            })}
          </div>
        );
      })}

      {editingRecord && (
        <RecordModal
          record={editingRecord}
          vehicles={vehicles}
          employees={employees}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); loadRecords(); }}
        />
      )}
    </div>
  );
}

// ========== 詳細・編集モーダル(新仕様) ==========
function RecordModal({ record, vehicles, employees, onClose, onSaved }) {
  // viewMode: 'view' (読み取り専用、変更ボタンのみ) | 'edit' (編集可能、削除・保存ボタン)
  const [viewMode, setViewMode] = useState('view');
  const initialForm = {
    datetime: record.datetime ? record.datetime.slice(0, 16) : '',
    vehicle_id: record.vehicle_id || '',
    employee_id: record.employee_id || '',
    driver_name: record.driver_name || '',
    department: record.department || '',
    liters: record.liters ?? '',
    unit_price: record.unit_price ?? '',
    total_amount: record.total_amount ?? '',
    odometer: record.odometer ?? '',
    distance: record.distance ?? '',
    mileage: record.mileage ?? '',
    station_name: record.station_name || '',
    memo: record.memo || '',
  };
  const [form, setForm] = useState(initialForm);
  const [lastOdometer, setLastOdometer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!form.vehicle_id || !form.datetime) return;
    supabase.from('fuel_records')
      .select('odometer')
      .eq('vehicle_id', form.vehicle_id)
      .lt('datetime', form.datetime)
      .neq('id', record.id)
      .order('datetime', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data && data[0]) setLastOdometer(data[0].odometer); else setLastOdometer(null); });
  }, [form.vehicle_id, form.datetime, record.id]);

  // 差分検知
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  function update(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'odometer' && lastOdometer != null && value !== '') {
        const newDist = Math.max(0, Number(value) - lastOdometer);
        next.distance = String(newDist);
      }
      if (key === 'distance' || key === 'liters' || key === 'odometer') {
        const dist = Number(key === 'distance' ? value : next.distance);
        const lit = Number(key === 'liters' ? value : next.liters);
        if (dist > 0 && lit > 0) {
          next.mileage = (dist / lit).toFixed(2);
        }
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/update-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          datetime: form.datetime || null,
          vehicle_id: form.vehicle_id || null,
          employee_id: form.employee_id || null,
          driver_name: form.driver_name || null,
          department: form.department || null,
          liters: form.liters !== '' ? Number(form.liters) : null,
          unit_price: form.unit_price !== '' ? Number(form.unit_price) : null,
          total_amount: form.total_amount !== '' ? Number(form.total_amount) : null,
          odometer: form.odometer !== '' ? Number(form.odometer) : null,
          distance: form.distance !== '' ? Number(form.distance) : null,
          mileage: form.mileage !== '' ? Number(form.mileage) : null,
          station_name: form.station_name || null,
          memo: form.memo || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '更新失敗');
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('このレコードを完全に削除します。よろしいですか?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/delete-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '削除失敗');
      onSaved();
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }

  const isReadOnly = viewMode === 'view';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 my-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {viewMode === 'view' ? 'レコード詳細' : 'レコード編集'}
          </h2>
          <button onClick={onClose} className="text-slate-300 text-3xl leading-none hover:text-white px-2">×</button>
        </div>

        {err && <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-200">{err}</div>}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 mb-1 block">給油日時</label>
            <input type="datetime-local" value={form.datetime} onChange={e => update('datetime', e.target.value)} readOnly={isReadOnly} style={{ fontSize: '16px' }} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 ${isReadOnly ? 'opacity-80' : ''}`} />
          </div>
          <div>
            <label className="text-xs text-slate-300 mb-1 block">車両</label>
            <select value={form.vehicle_id} onChange={e => update('vehicle_id', e.target.value)} disabled={isReadOnly} style={{ fontSize: '16px' }} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 ${isReadOnly ? 'opacity-80' : ''}`}>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-300 mb-1 block">運転者</label>
            <select value={form.employee_id} onChange={e => {
              const emp = employees.find(x => x.id === e.target.value);
              update('employee_id', e.target.value);
              if (emp) { update('driver_name', emp.name); update('department', emp.department || ''); }
            }} disabled={isReadOnly} style={{ fontSize: '16px' }} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 ${isReadOnly ? 'opacity-80' : ''}`}>
              <option value="">-- 選択 --</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FormField label="単価" value={form.unit_price} onChange={v => update('unit_price', v)} type="number" step="0.01" big readOnly={isReadOnly} />
            <FormField label="給油量(L)" value={form.liters} onChange={v => update('liters', v)} type="number" step="0.01" big readOnly={isReadOnly} />
            <FormField label="合計(円)" value={form.total_amount} onChange={v => update('total_amount', v)} type="number" big readOnly={isReadOnly} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="オドメーター(km)" value={form.odometer} onChange={v => update('odometer', v)} type="number" readOnly={isReadOnly} />
            <FormField label="今回走行距離(km)" value={form.distance} onChange={v => update('distance', v)} type="number" step="0.1" readOnly={isReadOnly} />
          </div>
          {lastOdometer != null && <div className="text-xs text-slate-400">前回オドメーター: {lastOdometer.toLocaleString()} km</div>}

          <FormField label="燃費(km/L)" value={form.mileage} onChange={v => update('mileage', v)} type="number" step="0.01" readOnly={isReadOnly} />
          <FormField label="給油所" value={form.station_name} onChange={v => update('station_name', v)} readOnly={isReadOnly} />
          <FormField label="メモ" value={form.memo} onChange={v => update('memo', v)} readOnly={isReadOnly} />
        </div>

        <div className="flex gap-2 mt-5">
          {viewMode === 'view' ? (
            <button onClick={() => setViewMode('edit')} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium">
              変更
            </button>
          ) : (
            <>
              <button onClick={handleDelete} disabled={saving} className="bg-red-900/30 text-red-300 border border-red-800 rounded-xl px-4 py-3 text-sm">削除</button>
              <button onClick={() => { setForm(initialForm); setViewMode('view'); }} className="flex-1 bg-slate-800 text-slate-200 rounded-xl py-3 text-sm">キャンセル</button>
              {hasChanges && (
                <button onClick={handleSave} disabled={saving} className={`flex-1 rounded-xl py-3 text-sm font-medium ${saving ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 text-white'}`}>
                  {saving ? '保存中...' : '保存'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== 月次集計 ==========
function MonthlyScreen({ vehicles }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    supabase.from('fuel_records').select('*').gte('datetime', start).lt('datetime', end)
      .then(({ data }) => setRecords(data || []));
  }, [month]);

  const totalDist = records.reduce((s, r) => s + (r.distance || 0), 0);
  const totalAmount = records.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalLiters = records.reduce((s, r) => s + (r.liters || 0), 0);
  const avgMileage = totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : '—';

  const byVehicle = {};
  records.forEach(r => {
    if (!byVehicle[r.vehicle_id]) byVehicle[r.vehicle_id] = { dist: 0, amount: 0, liters: 0 };
    byVehicle[r.vehicle_id].dist += r.distance || 0;
    byVehicle[r.vehicle_id].amount += r.total_amount || 0;
    byVehicle[r.vehicle_id].liters += r.liters || 0;
  });

  return (
    <div className="p-4 max-w-xl mx-auto">
      <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ fontSize: '16px' }} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard label="月間走行距離" value={`${totalDist.toLocaleString()} km`} />
        <MetricCard label="月間費用" value={`¥${totalAmount.toLocaleString()}`} />
        <MetricCard label="月間給油量" value={`${totalLiters.toFixed(1)} L`} />
        <MetricCard label="月平均燃費" value={`${avgMileage} km/L`} />
      </div>
      <div className="text-xs text-slate-300 uppercase tracking-wider mb-2">車両別</div>
      {Object.entries(byVehicle).sort(([,a], [,b]) => b.dist - a.dist).map(([vid, d]) => {
        const veh = vehicles.find(v => v.id === vid);
        return (
          <div key={vid} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{veh?.name || '不明'}</div>
              <div className="text-xs text-slate-400">¥{d.amount.toLocaleString()} / {d.liters.toFixed(1)}L</div>
            </div>
            <div className="text-base font-medium">{d.dist.toLocaleString()} km</div>
          </div>
        );
      })}
      {records.length === 0 && <div className="text-center text-slate-300 py-8">この月の記録はありません</div>}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="text-lg font-medium mt-1">{value}</div>
    </div>
  );
}

// ========== 設定 ==========
function SettingsScreen({ employee, employees, vehicles, onReload }) {
  const [mode, setMode] = useState('menu');
  if (mode === 'employees') return <EmployeeManagement onBack={() => setMode('menu')} onReload={onReload} employees={employees} />;
  if (mode === 'vehicles') return <VehicleManagement onBack={() => setMode('menu')} onReload={onReload} vehicles={vehicles} />;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="text-xs text-slate-300 uppercase tracking-wider mb-3">全員</div>
      <button onClick={() => setMode('vehicles')} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between mb-2 hover:border-slate-700">
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0zM1 9h18l2 6v2H3v-2zM3 9l2-4h12l2 4"/></svg>
          <span className="text-base">車両管理</span>
        </div>
        <span className="text-xs text-slate-400">{vehicles.length}台 ›</span>
      </button>
      {employee?.is_admin && (
        <>
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            アドミン機能
          </div>
          <button onClick={() => setMode('employees')} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between mb-2 hover:border-slate-700">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/><circle cx="9" cy="7" r="4"/></svg>
              <span className="text-base">社員管理</span>
            </div>
            <span className="text-xs text-slate-400">{employees.length}名 ›</span>
          </button>
        </>
      )}
    </div>
  );
}

// ========== 社員管理 ==========
function EmployeeManagement({ onBack, onReload, employees }) {
  const [addName, setAddName] = useState('');
  const [addDept, setAddDept] = useState('ライフデザイン部');
  const [addAdmin, setAddAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  async function syncToSheet() {
    const { data } = await supabase.from('employees').select('*').order('name');
    fetch('/api/sync-employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees: data || [] }),
    }).catch(() => {});
  }

  async function handleAdd() {
    if (!addName.trim()) { alert('名前を入力してください'); return; }
    setAdding(true);
    const { error } = await supabase.from('employees').insert({
      name: addName.trim(), department: addDept, is_active: true, is_admin: addAdmin,
    });
    setAdding(false);
    if (error) { alert('エラー: ' + error.message); return; }
    setAddName(''); setAddAdmin(false);
    await onReload();
    syncToSheet();
  }

  async function handleDeactivate(emp) {
    if (!confirm(`${emp.name} を退職扱いにしますか?`)) return;
    await supabase.from('employees').update({ is_active: false }).eq('id', emp.id);
    await onReload();
    syncToSheet();
  }

  async function handleToggleAdmin(emp) {
    await supabase.from('employees').update({ is_admin: !emp.is_admin }).eq('id', emp.id);
    await onReload();
    syncToSheet();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button onClick={onBack} className="text-sm text-blue-300 mb-4">‹ 戻る</button>
      <h2 className="text-lg font-medium mb-4">社員管理</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-300 uppercase mb-2">新規追加</div>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="社員名" style={{ fontSize: '16px' }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-2" />
        <select value={addDept} onChange={e => setAddDept(e.target.value)} style={{ fontSize: '16px' }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-2">
          <option>ライフデザイン部</option><option>エンジニアリング部</option><option>不動産部</option><option>総務部</option><option>その他</option>
        </select>
        <label className="flex items-center gap-2 text-sm mb-3 text-slate-200">
          <input type="checkbox" checked={addAdmin} onChange={e => setAddAdmin(e.target.checked)} />
          🔒 アドミン権限を付与
        </label>
        <button onClick={handleAdd} disabled={adding} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm">
          {adding ? '追加中...' : '追加'}
        </button>
      </div>
      <div className="text-xs text-slate-300 uppercase mb-2">現在の社員({employees.length}名)</div>
      {employees.map(emp => (
        <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              {emp.name}
              {emp.is_admin && <span className="text-xs bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded">🔒 Admin</span>}
            </div>
            <div className="text-xs text-slate-400">{emp.department}</div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleToggleAdmin(emp)} className="text-xs text-slate-300 px-2 py-1">
              {emp.is_admin ? '権限解除' : 'Admin付与'}
            </button>
            <button onClick={() => handleDeactivate(emp)} className="text-xs text-red-300 px-2 py-1">退職</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== 車両管理 ==========
function VehicleManagement({ onBack, onReload, vehicles }) {
  const [editing, setEditing] = useState(null);
  const [addName, setAddName] = useState('');
  const [addPlate, setAddPlate] = useState('');

  async function handleAdd() {
    if (!addName.trim()) { alert('車両名を入力してください'); return; }
    const { error } = await supabase.from('vehicles').insert({
      name: addName.trim(), plate_number: addPlate.trim() || '', fuel_type: 'gasoline', is_active: true,
    });
    if (error) { alert('エラー: ' + error.message); return; }
    setAddName(''); setAddPlate(''); onReload();
  }

  async function handleUpdate(veh, field, value) {
    await supabase.from('vehicles').update({ [field]: value }).eq('id', veh.id);
    onReload();
  }

  async function handleDeactivate(veh) {
    if (!confirm(`${veh.name} を無効化しますか?`)) return;
    await supabase.from('vehicles').update({ is_active: false }).eq('id', veh.id);
    onReload();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button onClick={onBack} className="text-sm text-blue-300 mb-4">‹ 戻る</button>
      <h2 className="text-lg font-medium mb-4">車両管理</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-300 uppercase mb-2">新規追加</div>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="車両名 例: アクア(山田)" style={{ fontSize: '16px' }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-2" />
        <input value={addPlate} onChange={e => setAddPlate(e.target.value)} placeholder="ナンバー 例: 秋田 301 ち 117" style={{ fontSize: '16px' }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-3" />
        <button onClick={handleAdd} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm">追加</button>
      </div>
      <div className="text-xs text-slate-300 uppercase mb-2">登録車両({vehicles.length}台)</div>
      {vehicles.map(veh => (
        <div key={veh.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2">
          {editing === veh.id ? (
            <div>
              <input defaultValue={veh.name} onBlur={e => handleUpdate(veh, 'name', e.target.value)} style={{ fontSize: '16px' }} className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100 mb-1" />
              <input defaultValue={veh.plate_number || ''} onBlur={e => handleUpdate(veh, 'plate_number', e.target.value)} placeholder="ナンバー" style={{ fontSize: '16px' }} className="w-full bg-slate-800 rounded px-2 py-1 text-slate-100 mb-2" />
              <button onClick={() => setEditing(null)} className="text-xs text-blue-300">完了</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{veh.name}</div>
                <div className="text-xs text-slate-400">{veh.plate_number || 'ナンバー未登録'}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(veh.id)} className="text-xs text-blue-300 px-2 py-1">編集</button>
                <button onClick={() => handleDeactivate(veh)} className="text-xs text-red-300 px-2 py-1">無効化</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ========== タブバー ==========
function TabBar({ tab, setTab }) {
  const tabs = [
    { id: 'record', label: '給油記録', icon: <path d="M3 22V8a2 2 0 012-2h8a2 2 0 012 2v14M7 22V10h6v12M17 10h2a2 2 0 012 2v6a2 2 0 002 2"/>, size: 22 },
    { id: 'history', label: '履歴', icon: <><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>, size: 22 },
    { id: 'monthly', label: '月次集計', icon: <><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></>, size: 22 },
    { id: 'settings', label: '設定', icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>, size: 26 },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 grid grid-cols-4 py-2">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-1 py-1 ${tab === t.id ? 'text-blue-300' : 'text-slate-300'}`}>
          <svg width={t.size} height={t.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
          <span className="text-xs">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
