# 開発タスクリスト

## 1. 共通・基盤構築タスク

- [ ] フロントエンド
  - [ ] Bun + React (TypeScript) のプロジェクト作成
  - [ ] Firebase (Hosting, Auth, Firestore) のセットアップとSDK導入
  - [ ] Chakra UI の導入とテーマ設定
  - [ ] react-router-dom 等を用いたルーティング設定
  - [ ] 状態管理ライブラリの選定・導入（例: Zustand, Recoil）
  - [ ] API通信用のクライアント設定 (例: axios)
- [ ] バックエンド
  - [ ] Firebase Cloud Functions のプロジェクト作成 (TypeScript)
  - [ ] APIの基本的な設定
  - [ ] Firebase Admin SDK のセットアップ
- [ ] その他
  - [ ] GitLabリポジトリのCI/CD設定

## 2. 認証機能タスク

- [ ] フロントエンド
  - [ ] ログイン画面のUIコンポーネント作成
  - [ ] ログインAPIとの連携処理の実装
  - [ ] 認証状態（ログイン中/ログアウト中）に応じたリダイレクト処理
- [ ] バックエンド (API)
  - [ ] `/api/auth/login`: ログインAPIの実装
  - [ ] `/api/auth/logout`: ログアウトAPIの実装
  - [ ] `/api/auth/me`: ログインユーザー情報取得APIの実装
  - [ ] 認証トークンの検証を行うミドルウェアの実装

## 3. 生徒機能タスク

- [ ] フロントエンド
  - [ ] 生徒ダッシュボード画面のUIコンポーネント作成（記録一覧表示）
  - [ ] 連絡帳入力画面のUIコンポーネント作成（フォーム、カレンダー）
  - [ ] 記録一覧取得APIとの連携
  - [ ] 記録作成・更新APIとの連携（react-hook-form を使用）
- [ ] バックエンド (API)
  - [ ] `/api/records` (GET): 記録一覧取得APIの実装
  - [ ] `/api/records/:date` (GET): 指定日の記録取得APIの実装
  - [ ] `/api/records` (POST): 記録作成APIの実装
  - [ ] `/api/records/:date` (PUT): 記録更新APIの実装
  
## 4. 担任機能タスク

- [ ] フロントエンド
  - [ ] 担任ダッシュボード画面のUIコンポーネント作成（担当生徒一覧、提出状況）
  - [ ] 生徒詳細・記録一覧画面のUIコンポーネント作成
  - [ ] 記録詳細・メモ入力画面のUIコンポーネント作成
  - [ ] 各画面に対応するAPIとの連携処理
- [ ] バックエンド (API)
  - [ ] `/api/teacher/students` (GET): 担当生徒一覧取得APIの実装
  - [ ] `/api/teacher/students/`:student_id/records (GET): 特定生徒の記録一覧取得APIの実装
  - [ ] `/api/teacher/records/:record_id` (GET): 特定記録の詳細取得APIの実装
  - [ ] `/api/teacher/records/:record_id/read` (POST): 既読処理APIの実装
  - [ ] `/api/teacher/records/:record_id/memos` (POST): メモ保存・更新APIの実装

## 5. データベース設定

- [ ] Firestoreのコレクション・ドキュメント構造の初期設定
- [ ] Firestoreセキュリティルールの記述（ロールに応じた読み書き権限の設定）

## 6. デプロイとテスト

- [ ] フロントエンドのFirebase Hostingへのデプロイ設定
- [ ] バックエンドのFirebase Cloud Functionsへのデプロイ設定
- [ ] テスト用アカウントの作成と動作確認
- [ ] 利用マニュアルの作成
