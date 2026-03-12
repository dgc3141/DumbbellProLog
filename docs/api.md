# Dumbbell Pro Log API Documentation

全てのバックエンドAPIは AWS Lambda (Node.js/Express) 上で動作し、Amazon API Gateway を通じて公開されています。

## 認証 (Authentication)

全てのAPIエンドポイント（`/` を除く）は認証を必要とします。
Amazon Cognito User Pool を使用しており、API Gateway の HttpUserPoolAuthorizer によって検証されます。

- **方法**: Bearer Token
- **ヘッダー**: `Authorization: Bearer <ID_TOKEN>`

---

## ワークアウト記録 (Workout Logging)

### 記録の保存・更新
`POST /log` または `PATCH /log` を使用して、1セットのワークアウト内容を保存・更新します。

- **URL**: `/log`
- **Method**: `POST` | `PATCH`
- **Body**:
```json
{
  "timestamp": "2024-03-20T10:00:00Z",
  "exercise_id": "bench-press",
  "weight": 60,
  "reps": 10,
  "rpe": "just" 
}
```
- `rpe`: `easy` | `just` | `limit`

---

### 記録の削除
指定したタイムスタンプの記録を削除します。

- **URL**: `/log`
- **Method**: `DELETE`
- **Body**:
```json
{
  "timestamp": "2024-03-20T10:00:00Z"
}
```

---

## AI 機能 (AI Features)

### トレーニング推奨
直近7日間の記録を元に、次回のトレーニング内容をAIが推奨します。

- **URL**: `/ai/recommend`
- **Method**: `POST`
- **Response**: `AIRecommendation` 型 (実装詳細参照)

---

### 成長分析
全期間の記録を分析し、成長のインサイトや停滞期の警告を返します。

- **URL**: `/ai/analyze-growth`
- **Method**: `POST`
- **Response**: `AIAnalysisResponse` 型

---

### AI モデル情報
現在使用しているAIモデルの情報を取得します。

- **URL**: `/ai/info`
- **Method**: `GET`

---

### メニュー生成 (Endless Mode)
直近50件の記録を参考に、部位別のトレーニングメニューを生成して保存します。

- **URL**: `/ai/generate-menus`
- **Method**: `POST`
- **Response**: 生成されたメニューのリスト

---

## クエリ & 統計 (Queries & Stats)

### 部位別メニュー取得
保存済みの部位別メニューを取得します。

- **URL**: `/menus/by-body-part`
- **Method**: `POST`
- **Body**:
```json
{
  "bodyPart": "push"
}
```
- `bodyPart`: `push` | `pull` | `legs`

---

### ワークアウト履歴 (90日間)
直近90日間のワークアウト履歴を取得します。

- **URL**: `/stats/history`
- **Method**: `POST`
