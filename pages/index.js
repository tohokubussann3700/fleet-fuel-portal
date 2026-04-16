import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwyfN0X1FW9M_DaFIRWlXxTooOpqJcc1_6O_EB9Nh8kxfRVGolESAF1pvEZuv3wYwnwA/exec'

const DEFAULT_VEHICLES = [
  '\u30c8\u30a7\u30bf \u30c8\u30a4\u30a1\u30fc\u30b9 (\u5e02\u752b500\u30421234)',
  '\u691c\u6d74300\u30625678)',
  '\u65b0\u5217\u30 NV200 (\u752b\u7384400\u30449012)',
]

export default function Home() {
  const [user, setUser] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [page, setPage] = useState('record')
  return <div>loading</div>
}
