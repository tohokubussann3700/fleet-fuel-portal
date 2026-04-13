import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwyfN0X1FW9M_DaFIRWlXxTooOpqJcc1_6O_EB9Nh8kxfRVGolESAF1pvEZuv3wYwnwA/exec'

const DEFAULT_VEHICLES = [
  'トヨタ ハイエース (品川500あ1234)',
  'ホンダ フィット (横浜300ら5678)',
  '日産 NV200 (川崎400い9012)',
]

export default function Home() {
  const [user, setUser] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [page, setPage] = useState('record')
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES)
  const [newVehicle, setNewVehicle] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [records, setRecords] = useState([])
  const [step, setStep] = useState(1)
  const [odoB64, setOdoB64] = useState(null)
  const [receiptB64, setReceiptB64] = useState(null)
  const [odoThumb, setOdoThumb] = useState(null)
  const [receiptThumb, setReceiptThumb] = useState(null)
  const [odoStatus, setOdoStatus] = useState('タップで撮影')
  const [receiptStatus, setReceiptStatus] = useState('タップで撮影')
  const [odoAnalyzed, setOdoAnalyzed] = useState(false)
  const [receiptAnalyzed, setReceiptAnalyzed] = useState(false)
  const [aiResultHtml, setAiResultHtml] = useState('')
  const [fOdo, setFOdo] = useState('')
  const [fLiters, setFLiters] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fDist, setFDist] = useState('')
  const [fKmpl, setFKmpl] = useState('')
  const [odoAiTag, setOdoAiTag] = useState(false)
  const [litersAiTag, setLitersAiTag] = useState(false)
  const [amountAiTag, setAmountAiTag] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const [statsVisible, setStatsVisible] = useState(false)
  const [sOdo, setSOdo] = useState('--')
  const [sDist, setSDist] = useState('--')
  const [sKmpl, setSKmpl] = useState('--')
  const [sCost, setSCost] = useState('--')
  const [showGasCode, setShowGasCode] = useState(false)
  const odoFileRef = useRef()
  const receiptFileRef = useRef()

  // Load from localStorage
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('fms_next') || '{}')
      if (s.user) setUser(s.user)
      if (s.loginName) setLoginName(s.loginName)
      if (s.vehicles) setVehicles(s.vehicles)
      if (s.records) setRecords(s.records)
    } catch (e) {}
  }, [])

  // Fetch records from Supabase when logged in
  useEffect(() => {
    if (user) {
      fetchRecords()
    }
  }, [user])

  const save = (updates) => {
    try {
      const current = JSON.parse(localStorage.getItem('fms_next') || '{}')
      localStorage.setItem('fms_next', JSON.stringify({ ...current, ...updates }))
    } catch (e) {}
  }

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/get-records')
      const data = await res.json()
      if (data.success && data.records) {
        const mapped = data.records.map(r => ({
          ts: new Date(r.created_at).getTime(),
          date: r.date,
          vehicle: r.vehicle,
          employee: r.employee,
          odometer: r.odometer,
          distance: r.distance,
          liters: r.liters,
          amount: r.amount,
          pricePerL: r.price_per_l,
          kmpl: r.kmpl,
          station: r.station,
        }))
        setRecords(mapped)
        save({ records: mapped })
      }
    } catch (e) {
      // fallback to localStorage records
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800)
  }

  const doLogin = () => {
    const name = loginName.trim()
    if (!name) { showToast('お名前を入力してください', 'error'); return }
    const u = { name }
    setUser(u)
    save({ user: u, loginName: name })
  }

  const doLogout = () => {
    setUser(null)
    save({ user: null })
  }

  const onVehicleChange = (v) => {
    setSelectedVehicle(v)
    if (!v) { setStatsVisible(false); return }
    const recs = records.filter(r => r.vehicle === v).sort((a, b) => b.ts - a.ts)
    if (recs.length > 0) {
      const l = recs[0]
      setSOdo(l.odometer?.toLocaleString() || '--')
      setSDist((l.distance || 0).toFixed(1))
      setSKmpl(l.kmpl != null ? l.kmpl.toFixed(2) : '--')
      const ym = new Date().toISOString().substring(0, 7)
      const mc = recs.filter(r => r.date?.startsWith(ym)).reduce((s, r) => s + (r.amount || 0), 0)
      setSCost(mc.toLocaleString())
      setStatsVisible(true)
    } else {
      setStatsVisible(false)
    }
    calcLive(v, fOdo, fLiters)
  }

  const calcLive = (vehicle, odo, liters) => {
    const cur = parseInt(odo) || 0
    if (!vehicle || !cur) return
    const recs = records.filter(r => r.vehicle === vehicle).sort((a, b) => b.ts - a.ts)
    if (recs.length > 0) {
      const dist = Math.max(0, cur - recs[0].odometer)
      setFDist(dist.toFixed(1))
      const l = parseFloat(liters)
      if (l > 0) setFKmpl((dist / l).toFixed(2))
    }
  }

  const updatePricePerL = (liters, amount) => {
    const l = parseFloat(liters), a = parseFloat(amount)
    if (l > 0 && a > 0) setFPrice((a / l).toFixed(1))
    calcLive(selectedVehicle, fOdo, liters)
  }

  const fileToB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const onOdoFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const b64 = await fileToB64(file)
    setOdoB64(b64)
    setOdoThumb(URL.createObjectURL(file))
    setOdoStatus('撮影済み')
    setStep(1)
  }

  const onReceiptFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const b64 = await fileToB64(file)
    setReceiptB64(b64)
    setReceiptThumb(URL.createObjectURL(file))
    setReceiptStatus('撮影済み')
    setStep(1)
  }

  const analyzeAll = async () => {
    setAnalyzing(true); setStep(2)
    let html = ''

    if (odoB64) {
      try {
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: odoB64, type: 'odometer' }),
        })
        const data = await res.json()
        if (data.success && data.result) {
          const r = data.result
          setOdoAnalyzed(true)
          setOdoStatus(r.odometer != null ? `${r.odometer.toLocaleString()}km 読取完了` : '読み取り失敗')
          if (r.odometer != null) {
            setFOdo(String(r.odometer))
            setOdoAiTag(true)
            calcLive(selectedVehicle, String(r.odometer), fLiters)
          }
          html += `<div class="ai-val"><div class="ai-val-label">走行メーター</div><div class="ai-val-num">${r.odometer != null ? r.odometer.toLocaleString() + ' km' : '読み取り失敗'}</div></div>`
        }
      } catch (err) {
        html += `<div class="ai-val"><div class="ai-val-label">走行メーター</div><div class="ai-val-num" style="color:var(--red);font-size:13px">解析失敗</div></div>`
      }
    }

    if (receiptB64) {
      try {
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: receiptB64, type: 'receipt' }),
        })
        const data = await res.json()
        if (data.success && data.result) {
          const r = data.result
          setReceiptAnalyzed(true)
          setReceiptStatus(r.amount != null ? `¥${r.amount.toLocaleString()} 読取完了` : '読み取り失敗')
          if (r.liters != null) { setFLiters(String(r.liters)); setLitersAiTag(true) }
          if (r.amount != null) { setFAmount(String(r.amount)); setAmountAiTag(true) }
          if (r.liters && r.amount) updatePricePerL(String(r.liters), String(r.amount))
          if (r.liters != null) html += `<div class="ai-val"><div class="ai-val-label">給油量</div><div class="ai-val-num">${r.liters} L</div></div>`
          if (r.amount != null) html += `<div class="ai-val"><div class="ai-val-label">金額</div><div class="ai-val-num">¥${r.amount.toLocaleString()}</div></div>`
          if (r.pricePerL != null) html += `<div class="ai-val"><div class="ai-val-label">単価</div><div class="ai-val-num">¥${r.pricePerL}/L</div></div>`
        }
      } catch (err) {
        html += `<div class="ai-val"><div class="ai-val-label">レシート</div><div class="ai-val-num" style="color:var(--red);font-size:13px">解析失敗</div></div>`
      }
    }

    if (html) setAiResultHtml(html)
    setAnalyzing(false); setStep(3)
    showToast('解析完了！内容を確認して保存してください')
  }

  const canSave = selectedVehicle && fOdo && fLiters && fAmount

  const saveRecord = async () => {
    if (!canSave) return
    setSaving(true)
    const odo = parseInt(fOdo)
    const liters = parseFloat(fLiters)
    const amount = parseFloat(fAmount)
    const pricePerL = parseFloat(fPrice) || Math.round(amount / liters * 10) / 10
    const recs = records.filter(r => r.vehicle === selectedVehicle).sort((a, b) => b.ts - a.ts)
    const prev = recs.length > 0 ? recs[0].odometer : null
    const distance = prev != null ? Math.max(0, odo - prev) : null
    const kmpl = distance != null && liters > 0 ? Math.round(distance / liters * 100) / 100 : null
    const now = new Date()
    const record = {
      ts: now.getTime(),
      date: now.toISOString().split('T')[0],
      vehicle: selectedVehicle,
      employee: user.name,
      odometer: odo, distance, liters, amount, pricePerL, kmpl,
      station: '',
    }

    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      const data = await res.json()
      if (data.success) {
        showToast('スプレッドシートに保存しました')
        const newRecords = [record, ...records]
        setRecords(newRecords)
        save({ records: newRecords })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      // fallback: save locally only
      const newRecords = [record, ...records]
      setRecords(newRecords)
      save({ records: newRecords })
      showToast('ローカルに保存しました（オフライン）')
    }

    // reset
    setFOdo(''); setFLiters(''); setFAmount(''); setFPrice(''); setFDist(''); setFKmpl('')
    setOdoAiTag(false); setLitersAiTag(false); setAmountAiTag(false)
    setOdoB64(null); setReceiptB64(null); setOdoThumb(null); setReceiptThumb(null)
    setOdoStatus('タップで撮影'); setReceiptStatus('タップで撮影')
    setOdoAnalyzed(false); setReceiptAnalyzed(false)
    setAiResultHtml(''); setStep(1)
    setSaving(false)
    onVehicleChange(selectedVehicle)
  }

  const addVehicle = () => {
    if (!newVehicle.trim()) return
    const updated = [...vehicles, newVehicle.trim()]
    setVehicles(updated); setNewVehicle(''); save({ vehicles: updated })
    showToast('車両を追加しました')
  }

  const removeVehicle = (i) => {
    const updated = vehicles.filter((_, idx) => idx !== i)
    setVehicles(updated); save({ vehicles: updated })
  }

  const historyRecords = [...records].sort((a, b) => b.ts - a.ts)

  const statsData = (() => {
    const map = {}
    records.forEach(r => {
      const k = (r.date || '').substring(0, 7) + '|' + r.vehicle
      if (!map[k]) map[k] = { month: (r.date || '').substring(0, 7), vehicle: r.vehicle, dist: 0, l: 0, amt: 0 }
      map[k].dist += r.distance || 0; map[k].l += r.liters || 0; map[k].amt += r.amount || 0
    })
    return Object.values(map).sort((a, b) => a.month < b.month ? 1 : -1)
  })()

  const months = [...new Set(statsData.map(r => r.month))]

  if (!user) {
    return (
      <>
        <Head><title>社用車管理ポータル</title></Head>
        <div style={styles.loginScreen}>
          <div style={styles.loginCard}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.3 1L3 12v4c0 .6.4 1 1 1h1"/>
                  <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
                </svg>
              </div>
              <div>
                <div style={styles.logoText}>社用車管理</div>
                <div style={styles.logoSub}>Fleet Management Portal</div>
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>お名前</label>
              <input
                style={styles.input}
                type="text"
                placeholder="山田 太郎"
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                autoComplete="name"
              />
            </div>
            <button style={styles.btnLogin} onClick={doLogin}>ログイン</button>
            <div style={styles.hint}>名前だけでOK</div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>社用車管理ポータル</title></Head>

      {/* Toast */}
      <div style={{ ...styles.toast, ...(toast.show ? styles.toastShow : {}), ...(toast.type === 'error' ? styles.toastError : styles.toastSuccess) }}>
        {toast.msg}
      </div>

      {/* Overlay */}
      {(analyzing || saving) && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
          <div style={styles.overlayText}>{analyzing ? 'AIが画像を解析中...' : 'スプレッドシートに送信中...'}</div>
        </div>
      )}

      <div style={styles.appScreen}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>社用車管理</div>
          <div style={styles.headerSpacer} />
          <div style={styles.userBadge}>
            <div style={styles.av}>{user.name[0]}</div>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{user.name.split(/\s/)[0]}</span>
          </div>
          <button style={styles.btnLogout} onClick={doLogout}>ログアウト</button>
        </div>

        {/* Content */}
        <div style={styles.pageContent}>

          {/* RECORD PAGE */}
          {page === 'record' && (
            <div style={styles.page}>
              {/* Vehicle selector */}
              <div style={styles.selectorCard}>
                <label style={styles.selectorLabel}>使用車両</label>
                <select
                  style={styles.select}
                  value={selectedVehicle}
                  onChange={e => onVehicleChange(e.target.value)}
                >
                  <option value="">-- 車両を選んでください --</option>
                  {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* Stats */}
              {statsVisible && (
                <div style={styles.statsGrid}>
                  {[['前回オドメーター', sOdo + ' km', 'var(--accent)'], ['直近燃費', sKmpl + ' km/L', 'var(--amber)'],
                    ['前回走行距離', sDist + ' km', 'var(--green)'], ['今月ガソリン代', '¥' + sCost, 'var(--text)']
                  ].map(([label, val, color]) => (
                    <div key={label} style={styles.statCard}>
                      <div style={styles.statLabel}>{label}</div>
                      <div style={{ ...styles.statValue, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps */}
              <div style={styles.steps}>
                {['撮影', '解析', '保存'].map((label, i) => {
                  const n = i + 1
                  const cls = n < step ? 'done' : n === step ? 'active' : 'none'
                  const color = cls === 'done' ? 'var(--green)' : cls === 'active' ? 'var(--accent)' : 'var(--text3)'
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color, background: cls !== 'none' ? color : 'transparent' }}>
                        <span style={{ color: cls !== 'none' ? 'var(--bg)' : color }}>{n}</span>
                      </div>
                      <span style={{ fontSize: 12, color }}>{label}</span>
                      {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 4px' }} />}
                    </div>
                  )
                })}
              </div>

              {/* Camera buttons */}
              <div style={styles.cameraSection}>
                <div style={styles.cameraSectionTitle}>写真を撮影・選択</div>
                <div style={styles.cameraGrid}>
                  {/* Odometer */}
                  <div style={{ ...styles.cameraBtn, ...(odoThumb ? styles.cameraBtnHasPhoto : {}), ...(odoAnalyzed ? styles.cameraBtnAnalyzed : {}) }}
                    onClick={() => odoFileRef.current.click()}>
                    {odoThumb && <img src={odoThumb} style={styles.photoThumb} alt="" />}
                    {odoThumb && <div style={styles.photoOverlay}><span style={styles.photoOverlayLabel}>タップして再撮影</span></div>}
                    {!odoThumb && <>
                      <div style={styles.camIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div style={styles.camLabel}>走行メーター</div>
                      <div style={styles.camStatus}>{odoStatus}</div>
                    </>}
                    {odoThumb && <div style={styles.camStatusOver}>{odoStatus}</div>}
                    <input ref={odoFileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onOdoFile} />
                  </div>
                  {/* Receipt */}
                  <div style={{ ...styles.cameraBtn, ...(receiptThumb ? styles.cameraBtnHasPhoto : {}), ...(receiptAnalyzed ? styles.cameraBtnAnalyzed : {}) }}
                    onClick={() => receiptFileRef.current.click()}>
                    {receiptThumb && <img src={receiptThumb} style={styles.photoThumb} alt="" />}
                    {receiptThumb && <div style={styles.photoOverlay}><span style={styles.photoOverlayLabel}>タップして再撮影</span></div>}
                    {!receiptThumb && <>
                      <div style={styles.camIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div style={styles.camLabel}>給油レシート</div>
                      <div style={styles.camStatus}>{receiptStatus}</div>
                    </>}
                    {receiptThumb && <div style={styles.camStatusOver}>{receiptStatus}</div>}
                    <input ref={receiptFileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onReceiptFile} />
                  </div>
                </div>
              </div>

              <button
                style={{ ...styles.btnAnalyze, ...(!odoB64 && !receiptB64 ? styles.btnDisabled : {}) }}
                onClick={analyzeAll}
                disabled={!odoB64 && !receiptB64}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                AIで自動読み取り
              </button>

              {aiResultHtml && (
                <div style={styles.aiResultCard}>
                  <div style={styles.aiTag}>✦ AI読み取り完了 — 下で確認してください</div>
                  <div style={styles.aiValues} dangerouslySetInnerHTML={{ __html: aiResultHtml }} />
                </div>
              )}

              {/* Form */}
              <div style={styles.formCard}>
                <div style={styles.formCardTitle}>内容を確認・修正</div>
                <Field label="オドメーター (km)" aiTag={odoAiTag} value={fOdo} onChange={v => { setFOdo(v); calcLive(selectedVehicle, v, fLiters) }} type="number" inputMode="numeric" placeholder="例：12540" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <Field label="走行距離 (km)" value={fDist} readOnly placeholder="自動計算" />
                  <Field label="燃費 (km/L)" value={fKmpl} readOnly placeholder="自動計算" />
                </div>
                <Field label="給油量 (L)" aiTag={litersAiTag} value={fLiters} onChange={v => { setFLiters(v); updatePricePerL(v, fAmount) }} type="number" inputMode="decimal" placeholder="例：40.5" />
                <Field label="給油金額 (円)" aiTag={amountAiTag} value={fAmount} onChange={v => { setFAmount(v); updatePricePerL(fLiters, v) }} type="number" inputMode="numeric" placeholder="例：6800" />
                <Field label="単価 (円/L)" value={fPrice} readOnly placeholder="自動計算" />
              </div>

              <button
                style={{ ...styles.btnSave, ...(canSave ? styles.btnSaveReady : {}) }}
                onClick={saveRecord}
                disabled={!canSave}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                スプレッドシートに保存
              </button>
            </div>
          )}

          {/* HISTORY PAGE */}
          {page === 'history' && (
            <div style={styles.page}>
              {historyRecords.length === 0
                ? <EmptyState icon="doc" text="記録がまだありません" />
                : historyRecords.map((r, i) => (
                  <div key={i} style={styles.historyItem}>
                    <div style={styles.historyTop}>
                      <div style={styles.historyVehicle}>{r.vehicle}</div>
                      <div>
                        <div style={styles.historyDate}>{r.date}</div>
                        <div style={styles.historyWho}>{r.employee}</div>
                      </div>
                    </div>
                    <div style={styles.historyStats}>
                      {[['オドメーター', r.odometer?.toLocaleString(), 'km'],
                        ['給油量', r.liters, 'L'],
                        ['金額', r.amount ? '¥' + r.amount.toLocaleString() : '--', ''],
                        ['燃費', r.kmpl?.toFixed(1) ?? '--', r.kmpl ? 'km/L' : '']
                      ].map(([label, val, unit]) => (
                        <div key={label} style={styles.hStat}>
                          <div style={styles.hStatLabel}>{label}</div>
                          <div style={styles.hStatVal}>{val}<span style={{ fontSize: 10, color: 'var(--text3)' }}>{unit}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* STATS PAGE */}
          {page === 'stats' && (
            <div style={styles.page}>
              {months.length === 0
                ? <EmptyState icon="chart" text="データがまだありません" />
                : months.map(m => {
                  const mrows = statsData.filter(r => r.month === m)
                  const total = mrows.reduce((s, r) => s + r.amt, 0)
                  return (
                    <div key={m} style={{ marginBottom: 20 }}>
                      <div style={styles.monthHeader}>
                        <span>{m}</span>
                        <span style={{ color: 'var(--amber)', fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 600 }}>合計 ¥{total.toLocaleString()}</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 8 }} />
                      </div>
                      {mrows.map((v, i) => (
                        <div key={i} style={styles.monthCard}>
                          <div style={styles.monthCardTop}>
                            <div style={styles.monthCardVehicle}>{v.vehicle}</div>
                            <div>
                              <div style={styles.monthCardTotal}>¥{v.amt.toLocaleString()}</div>
                              <div style={styles.monthCardSub}>{v.l.toFixed(1)}L給油</div>
                            </div>
                          </div>
                          <div style={styles.monthDetails}>
                            {[['走行距離', v.dist.toFixed(0) + 'km'],
                              ['平均燃費', v.l > 0 ? v.dist / v.l.toFixed(1) + 'km/L' : '—'],
                              ['平均単価', v.l > 0 ? '¥' + (v.amt / v.l).toFixed(0) + '/L' : '—']
                            ].map(([label, val]) => (
                              <div key={label} style={styles.monthDetail}>
                                <div style={styles.monthDetailLabel}>{label}</div>
                                <div style={styles.monthDetailVal}>{val}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
            </div>
          )}

          {/* SETTINGS PAGE */}
          {page === 'settings' && (
            <div style={styles.page}>
              <div style={styles.settingsSection}>
                <div style={styles.settingsTitle}>車両登録</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {vehicles.map((v, i) => (
                    <div key={i} style={styles.chip}>
                      {v}
                      <button style={styles.chipDel} onClick={() => removeVehicle(i)}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={styles.addRow}>
                  <input style={styles.addInput} type="text" placeholder="車両名・ナンバーを入力"
                    value={newVehicle} onChange={e => setNewVehicle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addVehicle()} />
                  <button style={styles.btnAdd} onClick={addVehicle}>追加</button>
                </div>
              </div>

              <div style={styles.settingsSection}>
                <div style={styles.settingsTitle}>Googleスプレッドシート連携</div>
                <a href="https://docs.google.com/spreadsheets/d/1Q2yLAjZYEflQpwfj3KGaRuHy9gVbBNgU-GNtALoJrA8/edit"
                  target="_blank" rel="noreferrer"
                  style={styles.ssLink}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>月別燃費台帳を開く</span>
                  <span style={styles.ssLinkBtn}>スプレッドシート ↗</span>
                </a>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7, marginTop: 8 }}>
                  給油記録はSupabase（クラウドDB）に保存され、<br />
                  Google Apps Script経由でスプレッドシートにも自動反映されます。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div style={styles.bottomNav}>
          {[
            { id: 'record', label: '給油記録', icon: 'record' },
            { id: 'history', label: '履歴', icon: 'history' },
            { id: 'stats', label: '集計', icon: 'stats' },
            { id: 'settings', label: '設定', icon: 'settings' },
          ].map(({ id, label, icon }) => (
            <button key={id} style={{ ...styles.navItem, ...(page === id ? styles.navItemActive : {}) }} onClick={() => setPage(id)}>
              <NavIcon name={icon} active={page === id} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .ai-val { background: var(--bg3); border-radius: 8px; padding: 8px 10px; }
        .ai-val-label { font-size: 10px; color: var(--text3); margin-bottom: 3px; }
        .ai-val-num { font-size: 16px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; color: var(--text); }
        * { -webkit-tap-highlight-color: transparent; }
        select option { background: #1a1d27; }
      `}</style>
    </>
  )
}

function Field({ label, aiTag, value, onChange, readOnly, type = 'text', inputMode, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
        {label}
        {aiTag && <span style={{ background: 'rgba(45,212,170,.15)', color: 'var(--green)', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>AI読み取り</span>}
      </label>
      <input
        style={{ width: '100%', background: readOnly ? 'var(--bg)' : 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 14px', color: 'var(--text)', fontSize: 16, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', opacity: readOnly ? 0.5 : 1, WebkitAppearance: 'none' }}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  )
}

function NavIcon({ name, active }) {
  const color = active ? 'var(--accent)' : 'var(--text3)'
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'record') return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  if (name === 'history') return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  if (name === 'stats') return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  if (name === 'settings') return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  return null
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)', fontSize: 14 }}>
      <div style={{ width: 48, height: 48, background: 'var(--bg2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        {icon === 'doc' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        {icon === 'chart' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
      </div>
      {text}
    </div>
  )
}

const styles = {
  loginScreen: { background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: '100vh' },
  loginCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 24, padding: '2.5rem 2rem', width: '100%', maxWidth: 380 },
  logo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: '2rem' },
  logoIcon: { width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 },
  logoSub: { fontSize: 12, color: 'var(--text3)' },
  fieldGroup: { marginBottom: '1.25rem' },
  fieldLabel: { display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 },
  input: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 16, fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none' },
  btnLogin: { width: '100%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', border: 'none', borderRadius: 14, padding: 16, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
  hint: { fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: '1rem' },
  appScreen: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' },
  header: { background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  headerTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, flex: 1 },
  headerSpacer: { flex: 1 },
  userBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' },
  av: { width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', flexShrink: 0 },
  btnLogout: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' },
  pageContent: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(72px + var(--safe-bottom))' },
  page: { padding: 16 },
  selectorCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14 },
  selectorLabel: { fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8, fontWeight: 500 },
  select: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none', appearance: 'none' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 },
  statLabel: { fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 },
  statValue: { fontSize: 18, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 },
  steps: { display: 'flex', alignItems: 'center', marginBottom: 14, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  cameraSection: { marginBottom: 14 },
  cameraSectionTitle: { fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  cameraGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  cameraBtn: { background: 'var(--bg2)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', position: 'relative', overflow: 'hidden', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cameraBtnHasPhoto: { borderStyle: 'solid', borderColor: 'var(--accent)' },
  cameraBtnAnalyzed: { borderColor: 'var(--green)' },
  camIcon: { width: 42, height: 42, background: 'var(--bg3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  camLabel: { fontSize: 12, color: 'var(--text2)', fontWeight: 500, textAlign: 'center', lineHeight: 1.4, padding: '0 8px' },
  camStatus: { fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '0 8px' },
  camStatusOver: { position: 'absolute', bottom: 8, left: 0, right: 0, fontSize: 11, color: 'white', textAlign: 'center', zIndex: 3, textShadow: '0 1px 3px rgba(0,0,0,.8)' },
  photoThumb: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 },
  photoOverlay: { position: 'absolute', inset: 0, background: 'rgba(15,17,23,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 10, borderRadius: 12, zIndex: 2 },
  photoOverlayLabel: { fontSize: 11, color: 'white', background: 'rgba(0,0,0,.6)', padding: '3px 10px', borderRadius: 6 },
  btnAnalyze: { width: '100%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', border: 'none', borderRadius: 14, padding: 16, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 },
  btnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  aiResultCard: { background: 'rgba(45,212,170,.06)', border: '1px solid rgba(45,212,170,.3)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 14 },
  aiTag: { fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 8 },
  aiValues: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  formCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 14 },
  formCardTitle: { fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  btnSave: { width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 16, color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.4 },
  btnSaveReady: { background: 'linear-gradient(135deg, rgba(45,212,170,.15), rgba(45,212,170,.05))', borderColor: 'rgba(45,212,170,.4)', color: 'var(--green)', opacity: 1 },
  historyItem: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 10 },
  historyTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  historyVehicle: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '58%' },
  historyDate: { fontSize: 11, color: 'var(--text3)', textAlign: 'right' },
  historyWho: { fontSize: 11, color: 'var(--text3)', textAlign: 'right' },
  historyStats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 },
  hStat: { background: 'var(--bg3)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' },
  hStatLabel: { fontSize: 10, color: 'var(--text3)', marginBottom: 3 },
  hStatVal: { fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" },
  monthHeader: { fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 },
  monthCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 8 },
  monthCardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  monthCardVehicle: { fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 },
  monthCardTotal: { fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--amber)', textAlign: 'right' },
  monthCardSub: { fontSize: 10, color: 'var(--text3)', textAlign: 'right' },
  monthDetails: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
  monthDetail: { background: 'var(--bg3)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' },
  monthDetailLabel: { fontSize: 10, color: 'var(--text3)', marginBottom: 3 },
  monthDetailVal: { fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" },
  settingsSection: { marginBottom: 20 },
  settingsTitle: { fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  chip: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 },
  chipDel: { width: 18, height: 18, border: 'none', background: 'var(--bg3)', borderRadius: 5, cursor: 'pointer', color: 'var(--text3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addRow: { display: 'flex', gap: 8 },
  addInput: { flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none' },
  btnAdd: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
  ssLink: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.25)', borderRadius: 10, padding: '12px 14px', textDecoration: 'none' },
  ssLinkBtn: { fontSize: 12, color: 'var(--accent)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', paddingBottom: 'var(--safe-bottom)', zIndex: 50 },
  navItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text3)', fontSize: 10, fontFamily: 'inherit' },
  navItemActive: { color: 'var(--accent)' },
  toast: { position: 'fixed', bottom: 'calc(80px + var(--safe-bottom))', left: 16, right: 16, maxWidth: 400, margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', fontSize: 14, zIndex: 999, transform: 'translateY(20px)', opacity: 0, transition: '.25s', pointerEvents: 'none', textAlign: 'center' },
  toastShow: { transform: 'none', opacity: 1 },
  toastSuccess: { borderColor: 'rgba(45,212,170,.4)', color: 'var(--green)', background: 'rgba(45,212,170,.08)' },
  toastError: { borderColor: 'rgba(240,128,128,.4)', color: 'var(--red)', background: 'rgba(240,128,128,.06)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,17,23,.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 },
  spinner: { width: 40, height: 40, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  overlayText: { fontSize: 14, color: 'var(--text2)' },
}
