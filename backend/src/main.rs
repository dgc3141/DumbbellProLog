
mod ai;
mod types;

use axum::{
    extract::{Json, State},
    routing::{get, post},
    Router,
};
use aws_sdk_dynamodb::{Client as DynamoClient, types::AttributeValue};
use aws_sdk_bedrockruntime::Client as BedrockClient;
use lambda_http::{run, tracing, Error};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use types::WorkoutSet;
use ai::{AIRecommendRequest, AIRecommendResponse, get_training_recommendation};
use chrono::{Utc, Duration};

#[derive(Clone)]
struct AppState {
    db_client: DynamoClient,
    bedrock_client: BedrockClient,
    table_name: String,
    bedrock_model_id: String,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    let config = aws_config::load_from_env().await;
    let db_client = DynamoClient::new(&config);
    let bedrock_client = BedrockClient::new(&config);
    let table_name = std::env::var("TABLE_NAME").unwrap_or_else(|_| "DumbbellProLog".to_string());
    let bedrock_model_id = std::env::var("BEDROCK_MODEL_ID")
        .unwrap_or_else(|_| "deepseek.deepseek-v3-1".to_string());

    let state = Arc::new(AppState {
        db_client,
        bedrock_client,
        table_name,
        bedrock_model_id,
    });

    let app = Router::new()
        .route("/", get(root))
        .route("/log", post(log_workout))
        .route("/ai/recommend", post(get_ai_recommendation))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Check if running on AWS Lambda
    if std::env::var("AWS_LAMBDA_RUNTIME_API").is_ok() {
        run(app).await
    } else {
        // Local development
        let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
        println!("Listening on http://{}", addr);
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.map_err(|e| Error::from(e))
    }
}

async fn root() -> &'static str {
    "Dumbbell Pro Log Backend is Running!"
}

async fn log_workout(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<WorkoutSet>,
) -> Result<Json<WorkoutSet>, (axum::http::StatusCode, String)> {
    let mut item: std::collections::HashMap<String, AttributeValue> = serde_dynamo::to_item(&payload).map_err(|e| {
        (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("Serialization failed: {}", e))
    })?;

    // Add keys for GSIs or general structure if needed
    item.insert("PK".to_string(), AttributeValue::S(payload.pk()));
    item.insert("SK".to_string(), AttributeValue::S(payload.sk()));

    state.db_client
        .put_item()
        .table_name(&state.table_name)
        .set_item(Some(item))
        .send()
        .await
        .map_err(|e| {
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("DynamoDB error: {}", e))
        })?;

    println!("Saved log to DynamoDB: {:?}", payload);
    Ok(Json(payload))
}

/// AI推奨エンドポイント - 直近7日間のトレーニング履歴を分析して推奨値を返す
async fn get_ai_recommendation(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AIRecommendRequest>,
) -> Result<Json<AIRecommendResponse>, (axum::http::StatusCode, String)> {
    // 直近7日間の日時を計算
    let seven_days_ago = Utc::now() - Duration::days(7);
    let seven_days_ago_str = seven_days_ago.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    // DynamoDBから直近7日間のトレーニング履歴を取得
    let pk = format!("USER#{}", request.user_id);
    let sk_prefix = "WORKOUT#";

    let query_result = state.db_client
        .query()
        .table_name(&state.table_name)
        .key_condition_expression("PK = :pk AND begins_with(SK, :sk_prefix)")
        .filter_expression("timestamp >= :seven_days_ago")
        .expression_attribute_values(":pk", AttributeValue::S(pk))
        .expression_attribute_values(":sk_prefix", AttributeValue::S(sk_prefix.to_string()))
        .expression_attribute_values(":seven_days_ago", AttributeValue::S(seven_days_ago_str))
        .send()
        .await
        .map_err(|e| {
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("DynamoDB query failed: {}", e))
        })?;

    // DynamoDBの結果をWorkoutSetに変換
    let workout_history: Vec<WorkoutSet> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    println!("Found {} workout records for user {}", workout_history.len(), request.user_id);

    // Bedrock AIを呼び出して推奨を取得
    let recommendation = get_training_recommendation(
        &state.bedrock_client,
        &state.bedrock_model_id,
        &workout_history,
    )
    .await
    .map_err(|e| {
        (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("AI recommendation failed: {}", e))
    })?;

    Ok(Json(recommendation))
}
