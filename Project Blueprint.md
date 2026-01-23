# **Project: Dumbbell Pro Log (AWS Serverless & AI-Native)**

## **1\. 概要 (Executive Summary)**

本プロジェクトは、ダンベルを用いた自重・フリーウェイトトレーニング（特にPPLルーチン）を最短のタップ数で記録し、ユーザーを次のセットへ「オートパイロット」で導くためのモバイル特化型Webアプリである。

## **2\. 要件定義 (Requirements)**

### **2.1 機能要件**

* **順次トレーニング表示**: 予め定義されたルーチン（例：Push Day）に従い、1種目ずつ表示。  
* **2ステップ・ロギング**:  
  1. レップ数（8-15のグリッド）を選択。  
  2. RPE（自覚的運動強度：余裕・妥当・限界）を選択。  
* **オート・インターバル**: RPE選択後、即座に90秒のレストタイマーを起動。  
* **プログレス表示**: セッション全体の進捗をパーセンテージバーで可視化。  
* **履歴とボリューム**: 当日の履歴一覧表示と、総挙上重量（Total Volume）の自動算出。

### **2.2 非機能要件**

* **AWS Serverless**: AWS無料枠を極限まで活用（Amplify, API Gateway, Lambda, DynamoDB）。  
* **AI-Native Stack**:  
  * 動的型付けを排除し、**Rust (Backend)** と **TypeScript (Frontend)** を採用。  
  * 型定義を Single Source of Truth とし、AIによるコード生成精度を向上させる。  
* **Offline First**: インターネット環境が不安定なジム内を想定し、フロントエンドでの状態管理を優先。

## **3\. システム設計 (System Design)**

### **3.1 アーキテクチャ**

* **Frontend**: React \+ Tailwind CSS (TypeScript)  
* **Backend**: Rust (lambda\_http \+ Axum)  
* **Infrastructure**: AWS CDK (TypeScript)  
* **Database**: DynamoDB (Partition Key: userId, Sort Key: timestamp)

### **3.2 データモデル (Shared Schema)**

pub enum RpeLevel { Easy, Just, Limit }  
pub struct WorkoutSet {  
    pub userId: String,  
    pub timestamp: String,  
    pub exerciseId: String,  
    pub weight: f32,  
    pub reps: u32,  
    pub rpe: RpeLevel,  
}

## **4\. 開発ガイドライン**

* AIに対し、常に「Rustの型定義を優先し、それに合わせてTypeScriptのinterfaceを生成せよ」と指示すること。  
* インフラは全てAWS CDKで管理し、手動でのリソース作成を禁止する。