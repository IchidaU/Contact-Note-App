# APIエンドポイント

## 認証

| Method | Endpoint | 備考 |
| --- | --- | --- |
|POST|/api/auth/login|アドレスとパスワードでログイン、認証トークン取得|
|POST|/api/auth/logout|ログアウト|
|GET|/api/auth/me|現在ログインしているユーザーの情報を取得|

## 生徒向け機能

| Method | Endpoint | 備考 |
| --- | --- | --- |
|GET|/api/records|ログインしている生徒の過去記録を一覧で取得|
|GET|/api/records/:date|指定した日付の記録を取得|
|POST|/api/records|新しい連絡帳の記録を作成|
|PUT|/api/records/:date|指定した日付の記録を更新|

## 担任向け機能

| Method | Endpoint | 備考 |
| --- | --- | --- |
|GET|/api/teacher/students|担当クラスの生徒一覧と提出状況を取得|
|GET|/api/teacher/students/:student_id/records|特定の生徒記録を一覧で取得|
|GET|/api/teacher/records/:record_id|特定の記録の詳細と、メモを取得|
|POST|/api/teacher/records/:record_id/read|特定の記録を既読にする（スタンプ）|
|POST|/api/teacher/records/:record_id/memos|特定の記録にメモを保存/更新する|
