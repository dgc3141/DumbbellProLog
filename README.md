# Dumbbell Pro Log

Dumbbell Pro Logは、ダンベルトレーニング（特にPPLルーチン）の記録を最小限の操作で行うために設計された、モバイル特化型のWebアプリケーションです。

## 🚀 特徴

- **2タップ・ロギング**: レップ数とRPE（疲労度）を選ぶだけの高速記録。
- **オートパイロット**: セット完了後、即座にレストタイマーが起動し、終了後は次のセットへ案内。
- **Offline First**: 通信環境の悪いジム内でも動作し、`localStorage` に状態を保存。
- **AWS Serverless**: AWS無料枠を最大限活用したスケーラブルな構成。

## 🛠 技術構成

### Frontend
- **Framework**: React 19
- **Style**: Tailwind CSS v4
- **State**: React Hooks (localStorage persistence)
- **Deployment**: Amazon S3 + CloudFront

### Backend
- **Language**: Rust
- **Framework**: Axum + lambda_http
- **Runtime**: AWS Lambda (Custom Runtime AL2023 / arm64)
- **Database**: Amazon DynamoDB

### Infrastructure
- **Infrastructure as Code**: AWS CDK v2 (TypeScript)

## 📁 ディレクトリ構造

```text
DumbbellProLog/
├── frontend/           # React + Vite (Web App)
├── backend/            # Rust (API Layer)
├── infra/              # AWS CDK (Infrastructure)
├── shared/             # (将来的な共有リソース用)
└── build_and_deploy.sh  # 一括ビルド・デプロイスクリプト
```

## 📦 セットアップ・デプロイ

### 準備
- AWS CLI が設定されていること
- Node.js / npm
- Rust (`cargo`)
- `cdk` CLI

### デプロイ方法
プロジェクト配下で一括ビルドスクリプトを実行します。

```bash
# 権限付与（初回のみ）
chmod +x build_and_deploy.sh

# フロントエンド・バックエンドのビルド
./build_and_deploy.sh

# デプロイ
cd infra
npx cdk deploy
```

## 📱 対応デバイス
Pixel 9 を含む現代のスマートフォンに最適化されています。

## 📄 ライセンス
This project is for personal use.
