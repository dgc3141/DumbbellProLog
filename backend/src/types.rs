
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")] // easy, just, limit
pub enum RpeLevel {
    Easy,
    Just,
    Limit,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutSet {
    pub user_id: String,
    pub timestamp: String,
    pub exercise_id: String,
    pub weight: f32,
    pub reps: u32,
    pub rpe: RpeLevel,
}
