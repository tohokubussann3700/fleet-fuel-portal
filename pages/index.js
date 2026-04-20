import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Image from 'next/image';

// ========== 画像圧縮ユーティリティ ==========
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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== メインコンポーネント ==========
export default function Home() {
  const [screen, setScreen] = useState('loading'); // loading/login/record/history/monthly/settings
  const [tab, setTab] = useState('record');
  
  // ユーザー情報
  const [currentEmployee, setCurrentEmployee] = useState(null); // {id, name, department, is_admin}
  const [currentVehicle, setCurrentVehicle] = useState(null); // {id, name, plate_number}
  
  // マスターデータ
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // 初期ロード
  useEffect(() => {
    loadMasters();
  }, []);

  async function loadMasters() {
    try {
      const [empRes, vehRes] = await Promise.all([
        supabase.from('employees').select('*').eq('is_active', true).order('name'),
        supabase.from('vehicles').select('*').eq('is_active', true).order('name'),
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (vehRes.data) setVehicles(vehRes.data);

      // ローカルストレージから前回選択を復元
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

  if (screen === 'loading') {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">読込中...</div>;
  }

  if (screen === 'login') {
    return <LoginScreen employees={employees} vehicles={vehicles} onLogin={handleLogin} defaultEmployee={currentEmployee} defaultVehicle={currentVehicle} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <Header employee={currentEmployee} vehicle={currentVehicle} onChangeVehicle={() => setScreen('login')} onLogout={handleLogout} />
      
      {tab === 'record' && <RecordScreen employee={currentEmployee} vehicle={currentVehicle} vehicles={vehicles} />}
      {tab === 'history' && <HistoryScreen vehicles={vehicles} />}
      {tab === 'monthly' && <MonthlyScreen vehicles={vehicles} />}
      {tab === 'settings' && <SettingsScreen employee={currentEmployee} employees={employees} vehicles={vehicles} onReload={loadMasters} />}
      
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

// ========== ログイン画面 ==========
function LoginScreen({ employees, vehicles, onLogin, defaultEmployee, defaultVehicle }) {
  const [selectedEmp, setSelectedEmp] = useState(defaultEmployee || null);
  const [selectedVeh, setSelectedVeh] = useState(defaultVehicle || null);
  const [empSearch, setEmpSearch] = useState('');
  const [vehSearch, setVehSearch] = useState('');
  const [showEmpList, setShowEmpList] = useState(false);
  const [showVehList, setShowVehList] = useState(false);

  const filteredEmps = employees.filter(e => 
    !empSearch || e.name.includes(empSearch) || (e.department || '').includes(empSearch)
  );
  
  const filteredVehs = vehicles.filter(v =>
    !vehSearch || v.name.includes(vehSearch) || (v.plate_number || '').includes(vehSearch)
  );
  
  // 前回車両を先頭に
  const sortedVehs = defaultVehicle 
    ? [defaultVehicle, ...filteredVehs.filter(v => v.id !== defaultVehicle.id)]
    : filteredVehs;

  const canStart = selectedEmp && selectedVeh;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-5 flex flex-col">
      {/* ロゴ */}
      <div className="flex flex-col items-center mt-8 mb-10">
        <div className="relative w-36 h-24 mb-2">
          <Image src="/tbk-logo.png" alt="TBK" fill style={{ objectFit: 'contain' }} priority />
        </div>
        <div className="text-xs text-slate-500 tracking-widest">社用車 燃費管理</div>
      </div>

      {/* 社員選択 */}
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-2">お名前</label>
      <button
        onClick={() => setShowEmpList(!showEmpList)}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-left text-base flex items-center justify-between mb-2 hover:border-blue-500 transition"
      >
        <span className={selectedEmp ? 'text-slate-100' : 'text-slate-500'}>
          {selectedEmp ? `${selectedEmp.name} (${selectedEmp.department || '-'})` : '社員を選択してください'}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showEmpList ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {showEmpList && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
          <input
            type="text"
            placeholder="社員名/部署で検索..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            className="w-full bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none border-b border-slate-700"
            autoFocus
          />
          <div className="max-h-80 overflow-y-auto">
            {filteredEmps.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">社員が見つかりません</div>
            ) : filteredEmps.map(emp => (
              <button
                key={emp.id}
                onClick={() => { setSelectedEmp(emp); setShowEmpList(false); setEmpSearch(''); }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex items-center gap-3 ${selectedEmp?.id === emp.id ? 'bg-blue-900/30' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {emp.name.split(' ')[0].slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {emp.name}
                    {emp.is_admin && <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">Admin</span>}
                  </div>
                  <div className="text-xs text-slate-500">{emp.department || '-'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 車両選択 */}
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-2">使う車両</label>
      <button
        onClick={() => setShowVehList(!showVehList)}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-left text-base flex items-center justify-between mb-2 hover:border-blue-500 transition"
      >
        <span className={selectedVeh ? 'text-slate-100' : 'text-slate-500'}>
          {selectedVeh ? `${selectedVeh.name}` : '車両を選択してください'}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showVehList ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {showVehList && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
          <input
            type="text"
            placeholder="車種/ナンバーで検索..."
            value={vehSearch}
            onChange={(e) => setVehSearch(e.target.value)}
            className="w-full bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none border-b border-slate-700"
            autoFocus
          />
          <div className="max-h-80 overflow-y-auto">
            {sortedVehs.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">車両が見つかりません</div>
            ) : sortedVehs.map((veh, idx) => (
              <button
                key={veh.id}
                onClick={() => { setSelectedVeh(veh); setShowVehList(false); setVehSearch(''); }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex items-center gap-3 ${selectedVeh?.id === veh.id ? 'bg-blue-900/30' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${defaultVehicle?.id === veh.id && idx === 0 ? 'bg-blue-800' : 'bg-slate-800'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0zM1 9h18l2 6v2H3v-2zM3 9l2-4h12l2 4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {veh.name}
                    {defaultVehicle?.id === veh.id && idx === 0 && <span className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">前回</span>}
                  </div>
                  <div className="text-xs text-slate-500">{veh.plate_number || 'ナンバー未登録'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 開始ボタン */}
      <button
        onClick={() => canStart && onLogin(selectedEmp, selectedVeh)}
        disabled={!canStart}
        className={`w-full rounded-xl py-4 text-base font-medium mt-auto ${canStart ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}
      >
        はじめる
      </button>
      <div className="text-center text-xs text-slate-600 mt-3">※ パスワードは不要です</div>
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
          <div className="text-xs text-slate-500 truncate">{employee?.name} / {employee?.department || '-'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onChangeVehicle} className="text-xs text-blue-400 px-2 py-1">変更</button>
        <button onClick={onLogout} className="text-slate-400" title="ログアウト">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </div>
  );
}

// ========== 給油記録画面 ==========
function RecordScreen({ employee, vehicle, vehicles }) {
  const [receiptImage, setReceiptImage] = useState(null);
  const [meterImage, setMeterImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);

  // フォーム
  const [liters, setLiters] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [stationName, setStationName] = useState('');
  const [memo, setMemo] = useState('');
  
  const [lastOdometer, setLastOdometer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // 前回オドメーター取得
  useEffect(() => {
    if (!vehicle?.id) return;
    supabase
      .from('fuel_records')
      .select('odometer')
      .eq('vehicle_id', vehicle.id)
      .order('datetime', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) setLastOdometer(data[0].odometer);
      });
  }, [vehicle?.id]);

  // 自動計算
  const distance = (odometer && lastOdometer) ? Math.max(0, Number(odometer) - lastOdometer) : null;
  const mileage = (distance && liters && Number(liters) > 0) ? (distance / Number(liters)).toFixed(2) : null;

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
    if (!receiptImage && !meterImage) {
      alert('レシートかメーター画像を先に選択してください');
      return;
    }
    setAnalyzing(true);
    setAiError(null);
    try {
      // レシート + メーターを並列で解析
      const tasks = [];
      if (receiptImage) {
        tasks.push(
          fetch('/api/analyze-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: receiptImage, imageType: 'receipt' }),
          }).then(r => r.json().then(j => ({ type: 'receipt', ok: r.ok, json: j })))
        );
      }
      if (meterImage) {
        tasks.push(
          fetch('/api/analyze-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: meterImage, imageType: 'meter' }),
          }).then(r => r.json().then(j => ({ type: 'meter', ok: r.ok, json: j })))
        );
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
          if (d.odometer != null) setOdometer(String(d.odometer));
          // trip A/B はメモに入れる(必要なら後で専用欄に)
          const tripInfo = [];
          if (d.tripA != null) tripInfo.push(`trip A: ${d.tripA} km`);
          if (d.tripB != null) tripInfo.push(`trip B: ${d.tripB} km`);
          if (tripInfo.length > 0) {
            setMemo(prev => prev ? `${prev} / ${tripInfo.join(' / ')}` : tripInfo.join(' / '));
          }
        }
      }

      if (errors.length > 0) {
        setAiError(errors.join(' | '));
      }
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
      const { error } = await supabase.from('fuel_records').insert({
        vehicle_id: vehicle.id,
        employee_id: employee.id,
        driver_name: employee.name,
        department: employee.department,
        datetime,
        liters: liters ? Number(liters) : null,
        unit_price: unitPrice ? Number(unitPrice) : null,
        total_amount: Number(totalAmount),
        odometer: odometer ? Number(odometer) : null,
        distance: distance,
        mileage: mileage ? Number(mileage) : null,
        station_name: stationName || null,
        memo: memo || null,
        receipt_image: receiptImage,
        meter_image: meterImage,
      });
      if (error) throw error;
      setSaveMsg({ type: 'success', text: '保存しました!' });
      // フォームリセット
      setReceiptImage(null); setMeterImage(null);
      setLiters(''); setUnitPrice(''); setTotalAmount('');
      setOdometer(''); setStationName(''); setMemo('');
      // オドメーター更新
      if (odometer) setLastOdometer(Number(odometer));
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* 写真2つ */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center h-32 cursor-pointer hover:border-blue-500 transition">
          {receiptImage ? (
            <img src={receiptImage} alt="レシート" className="max-h-full max-w-full object-contain rounded" />
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-500">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="text-xs text-slate-400">レシート</div>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageChange(e, 'receipt')} className="hidden" />
        </label>
        <label className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center h-32 cursor-pointer hover:border-blue-500 transition">
          {meterImage ? (
            <img src={meterImage} alt="メーター" className="max-h-full max-w-full object-contain rounded" />
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 text-slate-500">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <div className="text-xs text-slate-400">メーター</div>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageChange(e, 'meter')} className="hidden" />
        </label>
      </div>

      {/* AI解析ボタン */}
      <button
        onClick={handleAnalyze}
        disabled={(!receiptImage && !meterImage) || analyzing}
        className={`w-full rounded-xl py-3 text-sm font-medium mb-4 flex items-center justify-center gap-2 ${receiptImage && !analyzing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}
      >
        {analyzing ? '解析中...' : '✨ AIで画像を読み取る'}
      </button>

      {aiError && (
        <div className="bg-red-950/30 border border-red-900 rounded-xl p-3 mb-4 text-sm text-red-300">
          AI解析失敗: {aiError}
        </div>
      )}

      {/* 入力フォーム */}
      <div className="space-y-3 mb-4">
        <FormField label="給油量 (L)" value={liters} onChange={setLiters} type="number" step="0.01" placeholder="35.42" />
        <FormField label="単価 (円/L)" value={unitPrice} onChange={setUnitPrice} type="number" step="0.01" placeholder="172.5" />
        <FormField label="合計金額 (円) *" value={totalAmount} onChange={setTotalAmount} type="number" placeholder="6111" required />
        <FormField label="オドメーター (km)" value={odometer} onChange={setOdometer} type="number" placeholder="12345" />
        
        {lastOdometer && (
          <div className="text-xs text-slate-500 -mt-1">前回: {lastOdometer.toLocaleString()} km</div>
        )}

        <FormField label="給油日時 *" value={datetime} onChange={setDatetime} type="datetime-local" required />
        <FormField label="給油所" value={stationName} onChange={setStationName} placeholder="ENEOS 秋田中央SS" />
        <FormField label="メモ" value={memo} onChange={setMemo} placeholder="任意" />
      </div>

      {/* 自動計算カード */}
      {(distance !== null || mileage !== null) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-500">今回の走行距離</div>
            <div className="text-lg font-medium mt-1">{distance !== null ? `${distance.toLocaleString()} km` : '—'}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-500">今回の燃費</div>
            <div className="text-lg font-medium mt-1">{mileage ? `${mileage} km/L` : '—'}</div>
          </div>
        </div>
      )}

      {saveMsg && (
        <div className={`rounded-xl p-3 mb-4 text-sm ${saveMsg.type === 'success' ? 'bg-green-950/30 border border-green-900 text-green-300' : 'bg-red-950/30 border border-red-900 text-red-300'}`}>
          {saveMsg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded-xl py-4 text-base font-medium ${saving ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
      >
        {saving ? '保存中...' : '保存する'}
      </button>
    </div>
  );
}

// ========== フォームフィールド ==========
function FormField({ label, value, onChange, type = 'text', step, placeholder, required }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-100 outline-none focus:border-blue-500"
      />
    </div>
  );
}

// ========== 履歴画面 ==========
function HistoryScreen({ vehicles }) {
  const [records, setRecords] = useState([]);
  const [filterVehicleId, setFilterVehicleId] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all'); // YYYY-MM or 'all'
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, [filterVehicleId, filterMonth]);

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

  // 月別グルーピング
  const grouped = records.reduce((acc, r) => {
    const key = r.datetime ? r.datetime.slice(0, 7) : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex gap-2 mb-4">
        <select value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm">
          <option value="all">全車両</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm">
          <option value="all">全期間</option>
          {Object.keys(grouped).sort().reverse().map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading && <div className="text-center text-slate-500 py-8">読込中...</div>}
      {!loading && records.length === 0 && <div className="text-center text-slate-500 py-8">記録がありません</div>}

      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, recs]) => {
        const totalDist = recs.reduce((s, r) => s + (r.distance || 0), 0);
        const totalAmount = recs.reduce((s, r) => s + (r.total_amount || 0), 0);
        const totalLiters = recs.reduce((s, r) => s + (r.liters || 0), 0);
        const avgMileage = totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : '—';
        return (
          <div key={month} className="mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-2">
              <div className="text-xs text-slate-500 mb-1">{month}</div>
              <div className="text-2xl font-medium mb-2">{totalDist.toLocaleString()} km</div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>¥{totalAmount.toLocaleString()}</span>
                <span>{totalLiters.toFixed(1)}L</span>
                <span>平均 {avgMileage} km/L</span>
              </div>
            </div>
            {recs.map(r => {
              const veh = vehicles.find(v => v.id === r.vehicle_id);
              return (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{r.datetime ? new Date(r.datetime).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    <span>{veh?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-base font-medium">¥{(r.total_amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-slate-400">{r.liters ? `${r.liters}L` : '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800 rounded px-2 py-1">走行: {r.distance ? `${r.distance} km` : '—'}</div>
                    <div className="bg-slate-800 rounded px-2 py-1">燃費: {r.mileage ? `${r.mileage} km/L` : '—'}</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{r.driver_name || '-'} / {r.station_name || '-'}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ========== 月次集計画面(簡易) ==========
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

  // 車両別
  const byVehicle = {};
  records.forEach(r => {
    if (!byVehicle[r.vehicle_id]) byVehicle[r.vehicle_id] = { dist: 0, amount: 0, liters: 0 };
    byVehicle[r.vehicle_id].dist += r.distance || 0;
    byVehicle[r.vehicle_id].amount += r.total_amount || 0;
    byVehicle[r.vehicle_id].liters += r.liters || 0;
  });

  return (
    <div className="p-4 max-w-xl mx-auto">
      <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base mb-4" />
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard label="月間走行距離" value={`${totalDist.toLocaleString()} km`} />
        <MetricCard label="月間費用" value={`¥${totalAmount.toLocaleString()}`} />
        <MetricCard label="月間給油量" value={`${totalLiters.toFixed(1)} L`} />
        <MetricCard label="月平均燃費" value={`${avgMileage} km/L`} />
      </div>

      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">車両別</div>
      {Object.entries(byVehicle).sort(([,a], [,b]) => b.dist - a.dist).map(([vid, d]) => {
        const veh = vehicles.find(v => v.id === vid);
        return (
          <div key={vid} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{veh?.name || '不明'}</div>
              <div className="text-xs text-slate-500">¥{d.amount.toLocaleString()} / {d.liters.toFixed(1)}L</div>
            </div>
            <div className="text-base font-medium">{d.dist.toLocaleString()} km</div>
          </div>
        );
      })}
      
      {records.length === 0 && <div className="text-center text-slate-500 py-8">この月の記録はありません</div>}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-medium mt-1">{value}</div>
    </div>
  );
}

// ========== 設定画面 ==========
function SettingsScreen({ employee, employees, vehicles, onReload }) {
  const [mode, setMode] = useState('menu'); // menu/employees/vehicles
  
  if (mode === 'employees') return <EmployeeManagement onBack={() => setMode('menu')} onReload={onReload} employees={employees} />;
  if (mode === 'vehicles') return <VehicleManagement onBack={() => setMode('menu')} onReload={onReload} vehicles={vehicles} />;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">全員</div>
      <button onClick={() => setMode('vehicles')} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between mb-2 hover:border-slate-700">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0zM1 9h18l2 6v2H3v-2zM3 9l2-4h12l2 4"/></svg>
          <span className="text-sm">車両管理</span>
        </div>
        <span className="text-xs text-slate-500">{vehicles.length}台 ›</span>
      </button>

      {employee?.is_admin && (
        <>
          <div className="text-xs text-amber-500 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
            アドミン機能
          </div>
          <button onClick={() => setMode('employees')} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between mb-2 hover:border-slate-700">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/><circle cx="9" cy="7" r="4"/></svg>
              <span className="text-sm">社員管理</span>
            </div>
            <span className="text-xs text-slate-500">{employees.length}名 ›</span>
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

  async function handleAdd() {
    if (!addName.trim()) { alert('名前を入力してください'); return; }
    setAdding(true);
    const { error } = await supabase.from('employees').insert({
      name: addName.trim(),
      department: addDept,
      is_active: true,
      is_admin: addAdmin,
    });
    setAdding(false);
    if (error) { alert('エラー: ' + error.message); return; }
    setAddName(''); setAddAdmin(false);
    onReload();
  }

  async function handleDeactivate(emp) {
    if (!confirm(`${emp.name} を退職扱いにしますか?(過去データは保持されます)`)) return;
    await supabase.from('employees').update({ is_active: false }).eq('id', emp.id);
    onReload();
  }

  async function handleToggleAdmin(emp) {
    await supabase.from('employees').update({ is_admin: !emp.is_admin }).eq('id', emp.id);
    onReload();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button onClick={onBack} className="text-sm text-blue-400 mb-4">‹ 戻る</button>
      <h2 className="text-lg font-medium mb-4">社員管理</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-500 uppercase mb-2">新規追加</div>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="社員名" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2" />
        <select value={addDept} onChange={e => setAddDept(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2">
          <option>ライフデザイン部</option>
          <option>エンジニアリング部</option>
          <option>不動産部</option>
          <option>総務部</option>
          <option>その他</option>
        </select>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={addAdmin} onChange={e => setAddAdmin(e.target.checked)} />
          アドミン権限を付与
        </label>
        <button onClick={handleAdd} disabled={adding} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm">
          {adding ? '追加中...' : '追加'}
        </button>
      </div>

      <div className="text-xs text-slate-500 uppercase mb-2">現在の社員({employees.length}名)</div>
      {employees.map(emp => (
        <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              {emp.name}
              {emp.is_admin && <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">Admin</span>}
            </div>
            <div className="text-xs text-slate-500">{emp.department}</div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleToggleAdmin(emp)} className="text-xs text-slate-400 px-2 py-1">
              {emp.is_admin ? '権限解除' : 'Admin付与'}
            </button>
            <button onClick={() => handleDeactivate(emp)} className="text-xs text-red-400 px-2 py-1">退職</button>
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
      name: addName.trim(),
      plate_number: addPlate.trim() || '',
      fuel_type: 'gasoline',
      is_active: true,
    });
    if (error) { alert('エラー: ' + error.message); return; }
    setAddName(''); setAddPlate('');
    onReload();
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
      <button onClick={onBack} className="text-sm text-blue-400 mb-4">‹ 戻る</button>
      <h2 className="text-lg font-medium mb-4">車両管理</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-xs text-slate-500 uppercase mb-2">新規追加</div>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="車両名 例: アクア(山田)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2" />
        <input value={addPlate} onChange={e => setAddPlate(e.target.value)} placeholder="ナンバー 例: 秋田 301 ち 117" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-3" />
        <button onClick={handleAdd} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm">追加</button>
      </div>

      <div className="text-xs text-slate-500 uppercase mb-2">登録車両({vehicles.length}台)</div>
      {vehicles.map(veh => (
        <div key={veh.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-2">
          {editing === veh.id ? (
            <div>
              <input defaultValue={veh.name} onBlur={e => handleUpdate(veh, 'name', e.target.value)} className="w-full bg-slate-800 rounded px-2 py-1 text-sm mb-1" />
              <input defaultValue={veh.plate_number || ''} onBlur={e => handleUpdate(veh, 'plate_number', e.target.value)} placeholder="ナンバー" className="w-full bg-slate-800 rounded px-2 py-1 text-xs mb-2" />
              <button onClick={() => setEditing(null)} className="text-xs text-blue-400">完了</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{veh.name}</div>
                <div className="text-xs text-slate-500">{veh.plate_number || 'ナンバー未登録'}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(veh.id)} className="text-xs text-blue-400 px-2 py-1">編集</button>
                <button onClick={() => handleDeactivate(veh)} className="text-xs text-red-400 px-2 py-1">無効化</button>
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
    { id: 'record', label: '給油記録', icon: <path d="M3 22V8a2 2 0 012-2h8a2 2 0 012 2v14M7 22V10h6v12M17 10h2a2 2 0 012 2v6a2 2 0 002 2"/> },
    { id: 'history', label: '履歴', icon: <><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></> },
    { id: 'monthly', label: '月次集計', icon: <><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></> },
    { id: 'settings', label: '設定', icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></> },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 grid grid-cols-4 py-2">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-1 py-1 ${tab === t.id ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
          <span className="text-xs">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
