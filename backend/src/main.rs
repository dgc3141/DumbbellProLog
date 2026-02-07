
mod types;

use axum::{
    extract::{Json, State},
    routing::{get, post},
    Router,
};
use aws_sdk_dynamodb::{Client, types::AttributeValue};
use lambda_http::{run, tracing, Error};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use types::WorkoutSet;

#[derive(Clone)]
struct AppState {
    db_client: Client,
    table_name: String,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    let config = aws_config::load_from_env().await;
    let db_client = Client::new(&config);
    let table_name = std::env::var("TABLE_NAME").unwrap_or_else(|_| "DumbbellProLog".to_string());

    let state = Arc::new(AppState {
        db_client,
        table_name,
    });

    let app = Router::new()
        .route("/", get(root))
        .route("/log", post(log_workout))
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
