# 平松建築YouTube企画ジェネレーター

AIを活用した平松建築のYouTube企画・台本自動生成システム

## 🎯 システム概要

22ステップのマルチエージェントシステムにより、平松建築のYouTube企画を自動生成します。

### 主な機能
- ✅ **Phase 1実装完了**: 企画立案・リサーチ（11ステップ）
- ✅ Claude Sonnet 4.5 + GPT-4o 切り替え対応
- ✅ リアルタイム進捗表示
- ✅ 企画・実行ログの保存・管理
- 🔄 Phase 2-4（開発中）: タイトル決定、台本生成

### 技術スタック
- **フロントエンド**: Next.js 15, React 19, TailwindCSS 4.0
- **バックエンド**: tRPC, Prisma ORM
- **AI**: Claude Sonnet 4.5, GPT-4o
- **データベース**: SQLite (開発), PostgreSQL (本番)

---

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install --legacy-peer-deps
```

### 2. 環境変数の設定
```bash
# .envファイルを編集してAPIキーを設定
nano .env
```

必要な環境変数:
```env
# LLM APIs（どちらか必須）
ANTHROPIC_API_KEY="sk-ant-..."  # Claude使用時
OPENAI_API_KEY="sk-..."         # GPT-4o使用時

# Database（既にSQLite用に設定済み）
DATABASE_URL="file:./dev.db"
```

### 3. データベースのセットアップ
```bash
npm run db:push
```

### 4. 開発サーバー起動
```bash
npm run dev
```

→ ブラウザで http://localhost:3000 を開く

---

## 📖 使い方

### 新規企画作成

1. **ホーム画面**で「+ 新規企画作成」をクリック
2. **企画の内容を入力**（例: 「住宅ローンの選び方について、初心者向けに解説」）
3. **LLMモデルを選択**（Claude Sonnet 4.5 推奨）
4. **「Phase 1のみ実行」**をクリック

### Phase 1の11ステップ

企画作成時に以下のステップが自動実行されます：

1. 目的決定
2. SEOキーワード選定
3. 検索結果分析
4. ペルソナ作成
5. 検索直前心理分析
6. 知識レベル判定
7. 競合情報分析
8. 競合解決済み分析
9. 競合未解決分析
10. 差別化ポイント発見
11. 新事実発見

実行完了後、企画詳細画面でJSON形式の結果を確認できます。

---

## 📁 プロジェクト構造

```
hiramatsu-youtube-planner/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # ホーム画面
│   │   ├── projects/
│   │   │   ├── new/             # 新規企画作成
│   │   │   └── [id]/            # 企画詳細
│   │   └── api/trpc/            # tRPC エンドポイント
│   │
│   ├── lib/
│   │   ├── agents/              # エージェントシステム
│   │   │   ├── orchestrator.ts  # メインオーケストレーター
│   │   │   ├── base-agent.ts    # 基底エージェント
│   │   │   └── sub-agents/      # Phase 1-4のサブエージェント
│   │   ├── llm/                 # LLM統合（Claude + OpenAI）
│   │   ├── prompts/             # プロンプトテンプレート
│   │   └── trpc/                # tRPCクライアント
│   │
│   └── server/
│       └── routers/             # tRPC API ルーター
│           ├── project.ts       # 企画管理API
│           └── planner.ts       # 企画生成API
│
├── prisma/
│   └── schema.prisma            # データベーススキーマ
│
└── README.md
```

---

## 🔧 実装状況

### ✅ 完了
- [x] プロジェクト構造
- [x] Next.js 15 + TypeScript セットアップ
- [x] TailwindCSS 4.0 セットアップ
- [x] Prisma ORM + SQLite
- [x] tRPC セットアップ
- [x] Phase 1-4プロンプト移植（平松建築向けカスタマイズ）
- [x] LLM統合（Claude Sonnet 4.5 + GPT-4o）
- [x] **Phase 1エージェント実装（11ステップ完了）**
- [x] Orchestrator実装（Phase 1対応）
- [x] 基本UI実装（ホーム、新規作成、詳細画面）

### 🔄 開発中
- [ ] Phase 2エージェント実装（タイトル・サムネ決定）
- [ ] Phase 3エージェント実装（台本生成）
- [ ] Phase 4エージェント実装（最終台本執筆）
- [ ] RAGシステム実装（Pinecone連携）
- [ ] ナレッジベースインデックス構築
- [ ] ストリーミング対応（リアルタイム進捗）
- [ ] 企画編集機能
- [ ] エクスポート機能（Markdown）

---

## 🗄️ データベース

### 開発環境
- SQLite (`dev.db`)
- Prismaでスキーマ管理

### 本番環境（推奨）
- PostgreSQL
- Supabase or Vercel Postgres

### スキーマ
- **Project**: 企画データ
- **Execution**: 実行ログ
- **Settings**: システム設定

---

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# ビルド成果物を起動
npm start

# Prisma Studio（DB GUI）
npm run db:studio

# Prisma Client再生成
npm run db:generate

# スキーマをDBに反映
npm run db:push
```

---

## 🔐 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Claude API Key | Claude使用時 |
| `OPENAI_API_KEY` | OpenAI API Key | GPT-4o使用時 |
| `DATABASE_URL` | Database接続URL | ✅ |
| `PINECONE_API_KEY` | Pinecone API Key | RAG使用時 |
| `PINECONE_INDEX_NAME` | Pineconeインデックス名 | RAG使用時 |

---

## 📝 次のステップ

1. **APIキーの設定**: `.env`にClaude or OpenAI APIキーを設定
2. **Phase 1のテスト**: 実際に企画を作成して動作確認
3. **Phase 2-4の実装**: 残りのエージェント実装
4. **RAGシステム構築**: 過去台本の学習機能追加

---

## 🐛 トラブルシューティング

### ビルドエラーが出る
```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### データベースエラー
```bash
# データベースをリセット
rm prisma/dev.db
npm run db:push
```

### 開発サーバーが起動しない
```bash
# ポート3000が使われているか確認
lsof -i :3000
# プロセスを終了してから再起動
npm run dev
```

---

## 📄 ライセンス

Private - 平松建築専用

---

## 🙋 サポート

問題が発生した場合は、プロジェクトの開発者に連絡してください。
