import { WorkoutSet, AIRecommendation, AIAnalysisResponse, EndlessMenu, ChatMessage, ChatBuddyResponse, MagicLogResult } from './types';

import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
    } else {
        console.warn('GEMINI_API_KEY environment variable is missing. AI features will fail.');
    }
}
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash-latest';

// --- Zod Schemas ---

const ExerciseRecommendationSchema = z.object({
    exercise_id: z.string(),
    recommended_weight: z.number(),
    recommended_reps: z.number(),
    comment: z.string()
});

const AIRecommendationSchema = z.object({
    recommendations: z.array(ExerciseRecommendationSchema),
    general_advice: z.string()
});

const AIAnalysisResponseSchema = z.object({
    insights: z.array(z.string()),
    plateau_warnings: z.array(z.string()),
    encouragement: z.string()
});

const MenuExerciseSchema = z.object({
    exerciseName: z.string(),
    sets: z.number(),
    reps: z.number(),
    recommendedWeight: z.number(),
    restSeconds: z.number(),
    notes: z.string()
});

const EndlessMenuSchema = z.object({
    bodyPart: z.string(),
    exercises: z.array(MenuExerciseSchema),
    generatedAt: z.string()
});

const EndlessMenusArraySchema = z.array(EndlessMenuSchema);

const MagicLogResultSchema = z.object({
    weight: z.number().optional(),
    reps: z.number().optional(),
    rpe: z.enum(['easy', 'just', 'limit']).optional(),
    success: z.boolean(),
    error_msg: z.string().optional()
});

const ChatBuddyResponseSchema = z.object({
    reply: z.string()
});

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
    
    try {
        const parsedJson = JSON.parse(text);
        return AIRecommendationSchema.parse(parsedJson) as AIRecommendation;
    } catch (e: any) {
        throw new Error(`Failed to parse AI response: ${e.message}`);
    }
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
    
    try {
        const parsedJson = JSON.parse(text);
        return AIAnalysisResponseSchema.parse(parsedJson) as AIAnalysisResponse;
    } catch (e: any) {
        throw new Error(`Failed to parse AI response: ${e.message}`);
    }
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
    
    try {
        const parsedJson = JSON.parse(text);
        return EndlessMenusArraySchema.parse(parsedJson) as EndlessMenu[];
    } catch (e: any) {
        throw new Error(`Failed to parse Menu response: ${e.message}`);
    }
}

// --- Dynamic AI Rest Coach ---

export async function getRestCoachMessage(exercise: string, weight: number, reps: number, rpe: string): Promise<string> {
    const prompt = `あなたはパーソナルトレーナーです。ユーザーは今、「${exercise}」を${weight}kgで${reps}回行いました。手応えは「${rpe} (easy=余裕, just=適切, limit=限界)」でした。
現在インターバル休憩中です。
次のセットに向けて、簡潔でモチベーションの上がる一言アドバイスを日本語で50文字以内で提供してください。JSONではなく平文で返してください。`;

    return await callGemini(prompt);
}

// --- Magic Log Parser ---

export async function parseMagicLog(userInput: string): Promise<MagicLogResult> {
    const prompt = `あなたはフィットネスアプリの音声/テキスト入力パーサーです。
ユーザーの発話: 「${userInput}」

発話から重量(weight)、回数(reps)、RPE(余裕=easy, ちょうどよい=just, 限界=limit) を抽出してください。
抽出できない場合は success: false を返してください。

以下のJSON形式のみで返してください：
{
  "weight": 20,
  "reps": 10,
  "rpe": "easy",
  "success": true,
  "error_msg": "エラーがあれば記載"
}`;

    const text = await callGemini(prompt);
    
    try {
        const parsedJson = JSON.parse(text);
        return MagicLogResultSchema.parse(parsedJson) as MagicLogResult;
    } catch (e: any) {
        return { success: false, error_msg: "パースに失敗しました" };
    }
}

// --- AI Gym Buddy Chat ---

export async function chatWithBuddy(userHistorySummary: string, chatHistory: ChatMessage[], newMessage: string): Promise<ChatBuddyResponse> {
    const systemPrompt = `あなたは専属のAIトレーニングバディ（コーチ）です。
親しみやすく、かつ専門的なアドバイスを簡潔に回答してください。

## ユーザーの最近のトレーニング状況：
${userHistorySummary}

出力形式：
以下のJSON形式のみで返してください。
{
  "reply": "ユーザーへの回答テキスト"
}`;

    let historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`).join('\n');
    let prompt = `${systemPrompt}\n\n## 会話履歴\n${historyText}\n\nUser: ${newMessage}\nJSONで返答：`;

    const text = await callGemini(prompt);
    
    try {
        const parsedJson = JSON.parse(text);
        return ChatBuddyResponseSchema.parse(parsedJson) as ChatBuddyResponse;
    } catch (e: any) {
        return { reply: "ごめんなさい、ちょっと聞き取れませんでした。もう一度お願いします！" };
    }
}
