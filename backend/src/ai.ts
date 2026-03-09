import { WorkoutSet, AIRecommendation, AIAnalysisResponse, EndlessMenu } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3.0-flash';

async function callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
        contents: [
            {
                parts: [{ text: prompt }]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("Gemini returned an empty response.");
    }

    return text;
}

export async function getTrainingRecommendation(workoutHistory: WorkoutSet[]): Promise<AIRecommendation> {
    if (workoutHistory.length === 0) {
        return {
            recommendations: [],
            general_advice: "トレーニング履歴がありません。まずトレーニングを記録してください。"
        };
    }

    const historyJson = JSON.stringify(workoutHistory);
    const prompt = `あなたはパーソナルトレーニングコーチです。
以下のトレーニング履歴を分析し、次回のトレーニングにおける推奨重量と回数を提案してください。

## RPEの意味
- easy: 余裕があった（重量を上げることを推奨）
- just: ちょうど良い（現状維持または微増を推奨）
- limit: 限界だった（重量維持または回数調整を推奨）

## トレーニング履歴（直近7日間）
${historyJson}

## 出力形式
以下のJSON形式「のみ」で回答してください。説明文は不要です：
{
  "recommendations": [
    {
      "exercise_id": "エクササイズID",
      "recommended_weight": 推奨重量（数値）,
      "recommended_reps": 推奨回数（整数）,
      "comment": "短い理由（日本語）"
    }
  ],
  "general_advice": "全体的なアドバイス（日本語）"
}`;

    const text = await callGemini(prompt);
    return JSON.parse(text) as AIRecommendation;
}

export async function getGrowthAnalysis(workoutHistory: WorkoutSet[]): Promise<AIAnalysisResponse> {
    if (workoutHistory.length === 0) {
        return {
            insights: ["まだ十分なデータがありません。トレーニングを継続しましょう！"],
            plateau_warnings: [],
            encouragement: "最初の一歩を踏み出しましょう。"
        };
    }

    const historyJson = JSON.stringify(workoutHistory);
    const prompt = `あなたは専門的なフィットネスアナライザーです。
以下の全期間のトレーニング履歴を分析し、ユーザーの成長傾向に関する長期的なインサイトを提供してください。

## 分析のポイント
1. 重量やボリュームの伸び（プログレッシブ・オーバーロードが達成されているか）
2. 成長が止まっている種目（プラトー）の特定
3. 種目間のバランスや得意・不得意の分析

## トレーニング全履歴
${historyJson}

## 出力形式
以下のJSON形式「のみ」で回答してください。説明文は不要です：
{
  "insights": ["具体的な分析結果1", "具体的な分析結果2"],
  "plateau_warnings": ["停滞が懸念される種目と理由"],
  "encouragement": "ユーザーを鼓舞するメッセージ"
}`;

    const text = await callGemini(prompt);
    return JSON.parse(text) as AIAnalysisResponse;
}

export async function generateEndlessMenus(workoutHistory: WorkoutSet[]): Promise<EndlessMenu[]> {
    const historySummary = workoutHistory.length === 0
        ? "トレーニング履歴なし（初心者向けメニューを作成してください）"
        : JSON.stringify(workoutHistory.slice(0, 20).reverse());

    const prompt = `あなたはダンベルトレーニング専門のパーソナルトレーナーです。
以下のトレーニング履歴を元に、3つの部位（push/pull/legs）のトレーニングメニューを生成してください。
時間の制限はありません。各部位につき、優先度の高い順番から 6〜8種目 を提案してください。

## 重要なルール
- ダンベルのみで実施可能なエクササイズに限定
- レスト時間は種目の強度に応じて推奨値を出力（最低60秒、コンパウンド種目は90〜180秒）
- 種目の並び順は、多関節（コンパウンド）種目から単関節（アイソレーション）種目へと進むようにしてください

## ユーザーの直近履歴
${historySummary}

## 出力形式
以下のJSON形式「のみ」で回答してください：
[
  {
    "bodyPart": "push",
    "exercises": [
      {
        "exerciseName": "種目名（日本語）",
        "sets": 3,
        "reps": 12,
        "recommendedWeight": 10.0,
        "restSeconds": 90,
        "notes": "フォームのポイント"
      }
    ],
    "generatedAt": "2026-02-17T21:00:00Z"
  }
]

合計3パターン（push, pull, legs）を配列で返してください。`;

    const text = await callGemini(prompt);
    return JSON.parse(text) as EndlessMenu[];
}
