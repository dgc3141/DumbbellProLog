# Dumbbell Pro Log

Dumbbell Pro Logは、ダンベルトレーニング（特にPPLルーチン）の記録を最小限の操作で行うために設計された、モバイル特化型のWebアプリケーションです。

## 🚀 特徴

- **2タップ・ロギング**: レップ数とRPE（疲労度）を選ぶだけの高速記録。
- **オートパイロット**: セット完了後、即座にレストタイマーが起動し、終了後は次のセットへ案内。
- **Endless Mode**: AIが生成したメニューに基づき、部位別に1エクササイズずつ自由に進められる柔軟なトレーニング。
- **Offline First**: 通信環境の悪いジム内でも動作し、`localStorage` に状態を保存。
- **AWS Serverless**: AWS無料枠を最大限活用したスケーラブルな構成。

## 🛠 技術構成

### Frontend
- **Framework**: React 19 + Vite
- **Style**: Tailwind CSS v4
- **State**: React Hooks (localStorage persistence)
- **Deployment**: Amazon S3 + CloudFront

### Backend
- **Language**: TypeScript (Node.js 24+)
- **Framework**: Express + serverless-http
- **Runtime**: AWS Lambda (nodejs24.x / Amazon Linux 2023)
- **AI**: Google Gemini API (gemini-1.5-flash)
- **Database**: Amazon DynamoDB

### Infrastructure
- **Infrastructure as Code**: AWS CDK v2 (TypeScript)

## 📁 ディレクトリ構造

```text
DumbbellProLog/
├── frontend/           # React + Vite (Web App)
├── backend/            # Node.js + Express (API Layer)
├── infra/              # AWS CDK (Infrastructure)
├── shared/             # 共有型定義など
└── docs/               # API仕様書などのドキュメント
```

## 📦 セットアップ・デプロイ

### 準備
- AWS CLI が設定されていること
- Node.js (v24+)
- npm / pnpm
- AWS CLI & CDK (v2)
- Google Gemini API Key (`GEMINI_API_KEY` 環境変数)

### 各ディレクトリのビルド
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### デプロイ
```bash
cd ../infra
npm install
npx cdk deploy
```

## 📄 ドキュメント
- [API仕様書 (Markdown)](docs/api.md)
- [OpenAPI (Swagger) 仕様書](docs/openapi.yaml)

## 📱 対応デバイス
Pixel 9 を含む現代のスマートフォンに最適化されています。

## 📄 ライセンス
This project is for personal use.
