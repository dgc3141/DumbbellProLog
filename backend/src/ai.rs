// AIモジュール - Google AI Studio (Gemini 3 Flash Preview) 統合
// トレーニング履歴を分析し、次回の推奨重量・回数を提案する
// 部位×時間別のトレーニングメニューを自動生成する

use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};

use crate::types::{TimedMenu, WorkoutSet};

// === Gemini API リクエスト/レスポンス型 ===

#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    generation_config: Option<GeminiGenerationConfig>,
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(Debug, Serialize)]
struct GeminiGenerationConfig {
    response_mime_type: String,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiCandidateContent,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidateContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Deserialize)]
struct GeminiResponsePart {
    text: String,
}

// === 公開API型 ===

/// AI推奨リクエスト
#[derive(Debug, Serialize, Deserialize)]
pub struct AIRecommendRequest {
    pub user_id: String,
}

/// 個別エクササイズの推奨
#[derive(Debug, Serialize, Deserialize)]
pub struct ExerciseRecommendation {
    pub exercise_id: String,
    pub recommended_weight: f64,
    pub recommended_reps: u32,
    pub comment: String,
}

/// AI推奨レスポンス
#[derive(Debug, Serialize, Deserialize)]
pub struct AIRecommendResponse {
    pub recommendations: Vec<ExerciseRecommendation>,
    pub general_advice: String,
}

/// AI成長分析レスポンス
#[derive(Debug, Serialize, Deserialize)]
pub struct AIAnalysisResponse {
    pub insights: Vec<String>,
    pub plateau_warnings: Vec<String>,
    pub encouragement: String,
}

/// メニュー生成リクエスト
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateMenusRequest {
    pub user_id: String,
}

/// メニュー生成レスポンス
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateMenusResponse {
    pub menus: Vec<TimedMenu>,
    pub generated_count: usize,
}

// === Gemini 呼び出し共通ヘルパー ===

/// Gemini API にプロンプトを送信し、テキストレスポンスを取得する
async fn call_gemini(
    http_client: &HttpClient,
    api_key: &str,
    model_id: &str,
    prompt: &str,
) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model_id, api_key
    );

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: Some(GeminiGenerationConfig {
            response_mime_type: "application/json".to_string(),
        }),
    };

    let response = http_client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Gemini API呼び出しに失敗: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini APIエラー ({}): {}", status, error_body));
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| format!("Geminiレスポンスのパースに失敗: {}", e))?;

    let text = gemini_response
        .candidates
        .as_ref()
        .and_then(|c| c.first())
        .and_then(|c| c.content.parts.first())
        .map(|p| p.text.clone())
        .ok_or_else(|| "Geminiからのレスポンスが空です".to_string())?;

    Ok(text)
}

// === 公開API関数 ===

/// Gemini を呼び出してトレーニング推奨を取得
pub async fn get_training_recommendation(
    http_client: &HttpClient,
    api_key: &str,
    model_id: &str,
    workout_history: &[WorkoutSet],
) -> Result<AIRecommendResponse, String> {
    if workout_history.is_empty() {
        return Ok(AIRecommendResponse {
            recommendations: vec![],
            general_advice: "トレーニング履歴がありません。まずトレーニングを記録してください。"
                .to_string(),
        });
    }

    let history_json = serde_json::to_string_pretty(workout_history)
        .map_err(|e| format!("履歴のシリアライズに失敗: {}", e))?;

    let prompt = format!(
        r#"あなたはパーソナルトレーニングコーチです。
以下のトレーニング履歴を分析し、次回のトレーニングにおける推奨重量と回数を提案してください。

## RPEの意味
- easy: 余裕があった（重量を上げることを推奨）
- just: ちょうど良い（現状維持または微増を推奨）
- limit: 限界だった（重量維持または回数調整を推奨）

## トレーニング履歴（直近7日間）
{}

## 出力形式
以下のJSON形式「のみ」で回答してください。説明文は不要です：
{{
  "recommendations": [
    {{
      "exercise_id": "エクササイズID",
      "recommended_weight": 推奨重量（数値）,
      "recommended_reps": 推奨回数（整数）,
      "comment": "短い理由（日本語）"
    }}
  ],
  "general_advice": "全体的なアドバイス（日本語）"
}}"#,
        history_json
    );

    let text = call_gemini(http_client, api_key, model_id, &prompt).await?;

    let recommendation: AIRecommendResponse = serde_json::from_str(&text)
        .map_err(|e| format!("AIレスポンスのパースに失敗: {}. 元のテキスト: {}", e, text))?;

    Ok(recommendation)
}

/// 全期間の履歴を分析し、長期的な成長インサイトを取得
pub async fn get_growth_analysis(
    http_client: &HttpClient,
    api_key: &str,
    model_id: &str,
    workout_history: &[WorkoutSet],
) -> Result<AIAnalysisResponse, String> {
    if workout_history.is_empty() {
        return Ok(AIAnalysisResponse {
            insights: vec![
                "まだ十分なデータがありません。トレーニングを継続しましょう！".to_string(),
            ],
            plateau_warnings: vec![],
            encouragement: "最初の一歩を踏み出しましょう。".to_string(),
        });
    }

    let history_json = serde_json::to_string(workout_history)
        .map_err(|e| format!("履歴のシリアライズに失敗: {}", e))?;

    let prompt = format!(
        r#"あなたは専門的なフィットネスアナライザーです。
以下の全期間のトレーニング履歴を分析し、ユーザーの成長傾向に関する長期的なインサイトを提供してください。

## 分析のポイント
1. 重量やボリュームの伸び（プログレッシブ・オーバーロードが達成されているか）
2. 成長が止まっている種目（プラトー）の特定
3. 種目間のバランスや得意・不得意の分析

## トレーニング全履歴
{}

## 出力形式
以下のJSON形式「のみ」で回答してください。説明文は不要です：
{{
  "insights": ["具体的な分析結果1", "具体的な分析結果2"],
  "plateau_warnings": ["停滞が懸念される種目と理由"],
  "encouragement": "ユーザーを鼓舞するメッセージ"
}}"#,
        history_json
    );

    let text = call_gemini(http_client, api_key, model_id, &prompt).await?;

    let analysis: AIAnalysisResponse = serde_json::from_str(&text)
        .map_err(|e| format!("AIレスポンスのパースに失敗: {}. 元のテキスト: {}", e, text))?;

    Ok(analysis)
}

/// 部位×時間別のトレーニングメニューを一括生成
pub async fn generate_timed_menus(
    http_client: &HttpClient,
    api_key: &str,
    model_id: &str,
    workout_history: &[WorkoutSet],
) -> Result<Vec<TimedMenu>, String> {
    let history_summary = if workout_history.is_empty() {
        "トレーニング履歴なし（初心者向けメニューを作成してください）".to_string()
    } else {
        let recent: Vec<_> = workout_history.iter().rev().take(20).collect();
        serde_json::to_string(&recent).map_err(|e| format!("履歴のシリアライズに失敗: {}", e))?
    };

    let prompt = format!(
        r#"あなたはダンベルトレーニング専門のパーソナルトレーナーです。
以下のトレーニング履歴を元に、3つの部位（push/pull/legs）× 3つの時間（15分/30分/60分）= 合計9パターンのトレーニングメニューを生成してください。

## 重要なルール
- ダンベルのみで実施可能なエクササイズに限定
- レスト時間は種目の強度と時間枠に応じて最適化
  - 15分メニュー: レスト30-45秒（テンポ重視）
  - 30分メニュー: レスト45-90秒（バランス重視）
  - 60分メニュー: レスト90-180秒（筋力重視）
- 各メニューの合計時間（エクササイズ時間＋レスト）が指定時間に収まるように調整

## ユーザーの直近履歴
{}

## 出力形式
以下のJSON形式「のみ」で回答してください：
[
  {{
    "bodyPart": "push",
    "durationMinutes": 15,
    "exercises": [
      {{
        "exerciseName": "種目名（日本語）",
        "sets": 3,
        "reps": 12,
        "recommendedWeight": 10.0,
        "restSeconds": 30,
        "notes": "フォームのポイント"
      }}
    ],
    "totalRestSeconds": 180,
    "generatedAt": "2026-02-17T21:00:00Z"
  }}
]

合計9パターン（push×3時間, pull×3時間, legs×3時間）を配列で返してください。"#,
        history_summary
    );

    let text = call_gemini(http_client, api_key, model_id, &prompt).await?;

    let menus: Vec<TimedMenu> = serde_json::from_str(&text)
        .map_err(|e| format!("メニューのパースに失敗: {}. 元のテキスト: {}", e, text))?;

    Ok(menus)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::TimedMenu;

    #[test]
    fn test_parse_gemini_response() {
        let sample_json = r#"[
            {
                "bodyPart": "push",
                "durationMinutes": 15,
                "exercises": [
                    {
                        "exerciseName": "Push Up",
                        "sets": 3,
                        "reps": 10,
                        "recommendedWeight": 0.0,
                        "restSeconds": 60,
                        "notes": "Keep straight"
                    }
                ],
                "totalRestSeconds": 180,
                "generatedAt": "2023-01-01T12:00:00Z"
            }
        ]"#;

        let menus: Vec<TimedMenu> =
            serde_json::from_str(sample_json).expect("Failed to parse JSON");
        assert_eq!(menus.len(), 1);
        assert_eq!(menus[0].body_part, "push");
        assert_eq!(menus[0].exercises[0].exercise_name, "Push Up");
    }
}
