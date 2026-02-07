// AIモジュール - AWS Bedrock DeepSeek V3.1統合
// トレーニング履歴を分析し、次回の推奨重量・回数を提案する

use aws_sdk_bedrockruntime::Client as BedrockClient;
use aws_sdk_bedrockruntime::types::ContentBlock;
use serde::{Deserialize, Serialize};

use crate::types::WorkoutSet;

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

/// Bedrock DeepSeek V3.1を呼び出してトレーニング推奨を取得
pub async fn get_training_recommendation(
    bedrock_client: &BedrockClient,
    model_id: &str,
    workout_history: &[WorkoutSet],
) -> Result<AIRecommendResponse, String> {
    // 履歴がない場合はデフォルトレスポンスを返す
    if workout_history.is_empty() {
        return Ok(AIRecommendResponse {
            recommendations: vec![],
            general_advice: "トレーニング履歴がありません。まずトレーニングを記録してください。".to_string(),
        });
    }

    // プロンプトを構築
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

    // Bedrock Converse APIを呼び出し
    let response = bedrock_client
        .converse()
        .model_id(model_id)
        .messages(
            aws_sdk_bedrockruntime::types::Message::builder()
                .role(aws_sdk_bedrockruntime::types::ConversationRole::User)
                .content(ContentBlock::Text(prompt))
                .build()
                .map_err(|e| format!("メッセージ構築に失敗: {}", e))?,
        )
        .send()
        .await
        .map_err(|e| format!("Bedrock呼び出しに失敗: {}", e))?;

    // レスポンスからテキストを抽出
    let output = response.output().ok_or("レスポンスが空です")?;
    let message = match output {
        aws_sdk_bedrockruntime::types::ConverseOutput::Message(msg) => msg,
        _ => return Err("予期しないレスポンス形式です".to_string()),
    };

    let text = message
        .content()
        .iter()
        .filter_map(|block| {
            if let ContentBlock::Text(text) = block {
                Some(text.as_str())
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join("");

    // JSONをパース
    let recommendation: AIRecommendResponse = serde_json::from_str(&text)
        .map_err(|e| format!("AIレスポンスのパースに失敗: {}. 元のテキスト: {}", e, text))?;

    Ok(recommendation)
}

/// 全期間の履歴を分析し、長期的な成長インサイトを取得
pub async fn get_growth_analysis(
    bedrock_client: &BedrockClient,
    model_id: &str,
    workout_history: &[WorkoutSet],
) -> Result<AIAnalysisResponse, String> {
    if workout_history.is_empty() {
        return Ok(AIAnalysisResponse {
            insights: vec!["まだ十分なデータがありません。トレーニングを継続しましょう！".to_string()],
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

    let response = bedrock_client
        .converse()
        .model_id(model_id)
        .messages(
            aws_sdk_bedrockruntime::types::Message::builder()
                .role(aws_sdk_bedrockruntime::types::ConversationRole::User)
                .content(ContentBlock::Text(prompt))
                .build()
                .map_err(|e| format!("メッセージ構築に失敗: {}", e))?,
        )
        .send()
        .await
        .map_err(|e| format!("Bedrock呼び出しに失敗: {}", e))?;

    let output = response.output().ok_or("レスポンスが空です")?;
    let message = match output {
        aws_sdk_bedrockruntime::types::ConverseOutput::Message(msg) => msg,
        _ => return Err("予期しないレスポンス形式です".to_string()),
    };

    let text = message
        .content()
        .iter()
        .filter_map(|block| {
            if let ContentBlock::Text(text) = block {
                Some(text.as_str())
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join("");

    let analysis: AIAnalysisResponse = serde_json::from_str(&text)
        .map_err(|e| format!("AIレスポンスのパースに失敗: {}. 元のテキスト: {}", e, text))?;

    Ok(analysis)
}
