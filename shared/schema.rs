use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RpeLevel {
    Easy,
    Just,
    Limit,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutSet {
    pub user_id: String,
    pub timestamp: String,
    pub exercise_id: String,
    pub weight: f32,
    pub reps: u32,
    pub rpe: RpeLevel,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Exercise {
    pub id: String,
    pub name: String,
    pub notes: Option<String>,
}
