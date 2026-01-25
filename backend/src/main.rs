
mod types;

use axum::{
    extract::Json,
    routing::{get, post},
    Router,
};
use lambda_http::{run, tracing, Error};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use types::WorkoutSet;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    let app = Router::new()
        .route("/", get(root))
        .route("/log", post(log_workout))
        .layer(CorsLayer::permissive());

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

async fn log_workout(Json(payload): Json<WorkoutSet>) -> Json<WorkoutSet> {
    // In a real app, save to DynamoDB here
    println!("Received log: {:?}", payload);
    Json(payload)
}
