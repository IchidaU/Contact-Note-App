> [!NOTE]
>
> ### 本プロジェクトについて
>
> 本リポジトリは、特定の企業向け技術選考（長期）において作成した成果物を、ポートフォリオ用に再構成したものです。
>
> **※機密保持のため、企業名や一部の固有情報は匿名化し、コミット履歴を整理した状態で公開しています。**
>
> #### 生成AI使用について
>
> 本プロジェクトでは、コーディングにおいて生成AIを使用しております。

## プロジェクトの概要

以前、とある企業の長期技術選考において作成した、架空の中学校での連絡帳をシステム化する、という想定で制作した成果物です。
作業期間は4週間、100時間以内という制限があり、提示された要求に従い、要件定義・設計・開発を行いました。

## アプリケーションのイメージ

![アプリケーションのイメージ](/doc/img/ScreenShots/App-View.gif)

## 機能一覧

<table width="100%">
  <tr>
    <th width="50%">ログイン画面</th>
    <th width="50%">管理画面</th>
  </tr>
  <tr>
    <td><img src="/doc/img/ScreenShots/Login.png" alt="ログイン画面"></td>
    <td><img src="/doc/img/ScreenShots/Admin.png" alt="管理画面"></td>
  </tr>
  <tr>
    <td>メールアドレスとパスワードでの認証機能を実装しました。</td>
    <td>管理画面からは、新規ユーザー登録が可能です。</td>
  </tr>
</table>

<table width="100%">
  <tr>
    <th width="50%">生徒ダッシュボード</th>
    <th width="50%">連絡帳記入画面</th>
  </tr>
  <tr>
    <td><img src="/doc/img/ScreenShots/Student.png" alt="生徒ダッシュボード"></td>
    <td><img src="/doc/img/ScreenShots/New.png" alt="連絡帳記入画面"></td>
  </tr>
  <tr>
    <td>生徒ダッシュボード画面からは、過去の自分の記録と担任の既読処理の有無が確認可能です。</td>
    <td>生徒ダッシュボードの「新しい記録を追加」ボタンを押すと、新たな連絡帳の記録画面に遷移します。</td>
  </tr>
</table>

<table width="100%">
  <tr>
    <th width="50%">担任ダッシュボード</th>
    <th width="50%">生徒詳細画面1</th>
  </tr>
  <tr>
    <td><img src="/doc/img/ScreenShots/Teacher.png" alt="担任ダッシュボード"></td>
    <td><img src="/doc/img/ScreenShots/StudentLog.png" alt="生徒詳細画面1"></td>
  </tr>
  <tr>
    <td>担任ダッシュボードからは、クラス全員の提出状況と、体調/メンタルの平均スコアが確認できます。<br>「詳細」欄の吹き出しボタンから、各生徒の記録詳細画面に遷移します。</td>
    <td>各生徒の体調/メンタルスコアの推移（直近30件）と、連絡帳記入内容の詳細が確認できます。記録の既読処理もこの画面から行えます。<br>また、「気になる」ボタンを押すことで、生徒の情報が学年主任に共有されます。</td>
  </tr>
</table>

<table width="100%">
  <tr>
    <th width="50%">生徒詳細画面2</th>
    <th width="50%">学年主任ダッシュボード</th>
  </tr>
  <tr>
    <td><img src="/doc/img/ScreenShots/StudentLogDetail.png" alt="生徒詳細画面2"></td>
    <td><img src="/doc/img/ScreenShots/Coordinator.png" alt="学年主任ダッシュボード"></td>
  </tr>
  <tr>
    <td>提出された各記録に対し、担任が生徒には見えないメモを残すことができます。<br>「気になる」フラグが付いている生徒に関しては、副担任も記録閲覧とコメント記入が可能です。</td>
    <td>学年主任ダッシュボードからは、担当学年で「気になる」フラグが付いた生徒の一覧と、各生徒の記録詳細・コメント記入が可能です。</td>
  </tr>
</table>

## 使用技術

### フロントエンド

|カテゴリー|技術スタック|
|:----|:----|
|言語|TypeScript|
|フレームワーク|React|
|ルーティング|React Router|
|ビルドツール|Vite|
|UIコンポーネント|Chakra UI|
|フォーム・バリデーション|React Hook Form, Zod|
|グラフ描画|Recharts|

### バックエンド / インフラ

|カテゴリー|技術スタック|
|:----|:----|
|プラットフォーム|Firebase|
|データベース|FireStore|
|サーバーレス関数|Firebase Functions|
|SDK|Firebase JavaScript SDK, Firebase Admin SDK|

## システム構成

<!-- ここに図を入れる -->

## ER図

![ER図](/doc/img/ER図.png)

## 画面遷移図

![画面遷移図](/doc/img/画面遷移図.png)
