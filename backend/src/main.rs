mod ai;
mod types;

use ai::{
    AIAnalysisResponse, AIRecommendRequest, AIRecommendResponse, GenerateMenusRequest,
    GenerateMenusResponse, generate_endless_menus, get_growth_analysis,
    get_training_recommendation,
};
use aws_sdk_dynamodb::{Client as DynamoClient, types::AttributeValue};
use axum::{
    Router,
    extract::{Json, State},
    routing::{get, post},
};
use chrono::{Duration, Utc};
use lambda_http::{Error, run};
use reqwest::Client as HttpClient;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use types::{AIInfoResponse, EndlessMenu, MenuByBodyPartRequest, WorkoutSet};

#[derive(Clone)]
struct AppState {
    db_client: DynamoClient,
    http_client: HttpClient,
    table_name: String,
    gemini_model_id: String,
    gemini_api_key: String,
}

use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> Result<(), Error> {
    fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .init();

    let config = aws_config::load_from_env().await;
    let db_client = DynamoClient::new(&config);
    let http_client = HttpClient::new();

    let table_name = std::env::var("TABLE_NAME").unwrap_or_else(|_| "DumbbellProLog".to_string());
    let gemini_model_id =
        std::env::var("GEMINI_MODEL_ID").unwrap_or_else(|_| "gemini-3-flash-preview".to_string());
    let gemini_api_key = std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| String::new());

    let state = Arc::new(AppState {
        db_client,
        http_client,
        table_name,
        gemini_model_id,
        gemini_api_key,
    });

    let app = Router::new()
        .route("/", get(root))
        .route("/log", post(log_workout))
        .route("/ai/recommend", post(get_ai_recommendation))
        .route("/ai/analyze-growth", post(analyze_growth))
        .route("/ai/generate-menus", post(trigger_menu_generation))
        .route("/ai/info", get(get_ai_info))
        .route("/menus/by-body-part", post(get_menus_by_body_part))
        .route("/stats/history", post(get_full_history))
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
    let mut item: std::collections::HashMap<String, AttributeValue> =
        serde_dynamo::to_item(&payload).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Serialization failed: {}", e),
            )
        })?;

    // Add keys for GSIs or general structure if needed
    item.insert("PK".to_string(), AttributeValue::S(payload.pk()));
    item.insert("SK".to_string(), AttributeValue::S(payload.sk()));

    state
        .db_client
        .put_item()
        .table_name(&state.table_name)
        .set_item(Some(item))
        .send()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB error: {}", e),
            )
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

    let query_result = state
        .db_client
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
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB query failed: {}", e),
            )
        })?;

    // DynamoDBの結果をWorkoutSetに変換
    let workout_history: Vec<WorkoutSet> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    println!(
        "Found {} workout records for user {}",
        workout_history.len(),
        request.user_id
    );

    // Gemini AIを呼び出して推奨を取得
    let recommendation = get_training_recommendation(
        &state.http_client,
        &state.gemini_api_key,
        &state.gemini_model_id,
        &workout_history,
    )
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("AI recommendation failed: {}", e),
        )
    })?;

    Ok(Json(recommendation))
}

/// AI長期成長分析エンドポイント
async fn analyze_growth(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AIRecommendRequest>,
) -> Result<Json<AIAnalysisResponse>, (axum::http::StatusCode, String)> {
    // 全履歴を取得
    let pk = format!("USER#{}", request.user_id);
    let sk_prefix = "WORKOUT#";

    let query_result = state
        .db_client
        .query()
        .table_name(&state.table_name)
        .key_condition_expression("PK = :pk AND begins_with(SK, :sk_prefix)")
        .expression_attribute_values(":pk", AttributeValue::S(pk))
        .expression_attribute_values(":sk_prefix", AttributeValue::S(sk_prefix.to_string()))
        .send()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB query failed: {}", e),
            )
        })?;

    let workout_history: Vec<WorkoutSet> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    // Gemini AIを呼び出して長期分析を取得
    let analysis = get_growth_analysis(
        &state.http_client,
        &state.gemini_api_key,
        &state.gemini_model_id,
        &workout_history,
    )
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("AI growth analysis failed: {}", e),
        )
    })?;

    Ok(Json(analysis))
}

/// AI情報エンドポイント - 管理画面から使用AIモデルを確認する
async fn get_ai_info(State(state): State<Arc<AppState>>) -> Json<AIInfoResponse> {
    Json(AIInfoResponse {
        model_name: "Gemini 3 Flash Preview".to_string(),
        provider: "Google AI Studio".to_string(),
        model_id: state.gemini_model_id.clone(),
    })
}

/// メニュー生成トリガー - セッション完了時にバックグラウンドで呼び出し
async fn trigger_menu_generation(
    State(state): State<Arc<AppState>>,
    Json(request): Json<GenerateMenusRequest>,
) -> Result<Json<GenerateMenusResponse>, (axum::http::StatusCode, String)> {
    // ユーザーの最新履歴を取得
    let pk = format!("USER#{}", request.user_id);
    let sk_prefix = "WORKOUT#";

    let query_result = state
        .db_client
        .query()
        .table_name(&state.table_name)
        .key_condition_expression("PK = :pk AND begins_with(SK, :sk_prefix)")
        .expression_attribute_values(":pk", AttributeValue::S(pk.clone()))
        .expression_attribute_values(":sk_prefix", AttributeValue::S(sk_prefix.to_string()))
        .scan_index_forward(false) // 新しい順
        .limit(50)
        .send()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB query failed: {}", e),
            )
        })?;

    let workout_history: Vec<WorkoutSet> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    // Geminiでメニューを生成
    let menus = generate_endless_menus(
        &state.http_client,
        &state.gemini_api_key,
        &state.gemini_model_id,
        &workout_history,
    )
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Menu generation failed: {}", e),
        )
    })?;

    // 生成したメニューをDynamoDBに保存
    for menu in &menus {
        let menu_item = serde_dynamo::to_item(menu).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Menu serialization failed: {}", e),
            )
        })?;

        let mut item: std::collections::HashMap<String, AttributeValue> = menu_item;
        item.insert("PK".to_string(), AttributeValue::S(pk.clone()));
        item.insert(
            "SK".to_string(),
            AttributeValue::S(format!("MENU#{}", menu.body_part)),
        );

        state
            .db_client
            .put_item()
            .table_name(&state.table_name)
            .set_item(Some(item))
            .send()
            .await
            .map_err(|e| {
                (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    format!("DynamoDB put failed: {}", e),
                )
            })?;
    }

    let count = menus.len();
    Ok(Json(GenerateMenusResponse {
        menus,
        generated_count: count,
    }))
}

/// 部位指定でメニューを取得
async fn get_menus_by_body_part(
    State(state): State<Arc<AppState>>,
    Json(request): Json<MenuByBodyPartRequest>,
) -> Result<Json<Vec<EndlessMenu>>, (axum::http::StatusCode, String)> {
    let pk = format!("USER#{}", request.user_id);
    let sk = format!("MENU#{}", request.body_part);

    // 指定部位のメニューを取得
    let query_result = state
        .db_client
        .query()
        .table_name(&state.table_name)
        .key_condition_expression("PK = :pk AND SK = :sk")
        .expression_attribute_values(":pk", AttributeValue::S(pk))
        .expression_attribute_values(":sk", AttributeValue::S(sk))
        .send()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB query failed: {}", e),
            )
        })?;

    let menus: Vec<EndlessMenu> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    Ok(Json(menus))
}

/// 全履歴取得エンドポイント - グラフ表示用に全期間のデータを取得
async fn get_full_history(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AIRecommendRequest>, // user_idを含む同じ構造体を使用
) -> Result<Json<Vec<WorkoutSet>>, (axum::http::StatusCode, String)> {
    let pk = format!("USER#{}", request.user_id);
    let sk_prefix = "WORKOUT#";

    let query_result = state
        .db_client
        .query()
        .table_name(&state.table_name)
        .key_condition_expression("PK = :pk AND begins_with(SK, :sk_prefix)")
        .expression_attribute_values(":pk", AttributeValue::S(pk))
        .expression_attribute_values(":sk_prefix", AttributeValue::S(sk_prefix.to_string()))
        .send()
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("DynamoDB query failed: {}", e),
            )
        })?;

    let history: Vec<WorkoutSet> = query_result
        .items()
        .iter()
        .filter_map(|item| serde_dynamo::from_item(item.clone()).ok())
        .collect();

    Ok(Json(history))
}
