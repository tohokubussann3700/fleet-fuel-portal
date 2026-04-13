# 社用車 燃費管理ポータル

スマホで給油記録・AI画像読み取り・Googleスプレッドシート自動反映ができる社用車管理Webアプリです。

## 技術構成

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 (React) |
| ホスティング | Vercel |
| データベース | Supabase (PostgreSQL) |
| スプレッドシート | Google Apps Script |
| AI画像解析 | Anthropic Claude |

---

## セットアップ手順

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. **SQL Editor** を開き `supabase_schema.sql` を実行
3. **Settings > API** から以下をコピー：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Anthropic API キー

1. [console.anthropic.com](https://console.anthropic.com) でAPIキー取得
2. `ANTHROPIC_API_KEY` に設定

### 3. GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fleet-fuel-portal.git
git push -u origin main
```

### 4. Vercel

1. [vercel.com](https://vercel.com) でGitHubリポジトリをインポート
2. **Environment Variables** に以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
GAS_URL=https://script.google.com/macros/s/.../exec
ANTHROPIC_API_KEY=sk-ant-xxx
```

3. Deploy → 完了！

---

## スプレッドシート

給油記録は Supabase に保存されると同時に、Google Apps Script 経由でスプレッドシートの月別タブにも自動反映されます。

- スプレッドシート: https://docs.google.com/spreadsheets/d/1Q2yLAjZYEflQpwfj3KGaRuHy9gVbBNgU-GNtALoJrA8/edit

---

## ホーム画面アイコン（PWA）

iPhoneの場合：
1. Safariでアプリを開く
2. 共有ボタン → 「ホーム画面に追加」
3. 名前を確認して「追加」

Androidの場合：
1. Chromeでアプリを開く
2. メニュー → 「ホーム画面に追加」
