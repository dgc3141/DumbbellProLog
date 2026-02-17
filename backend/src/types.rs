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

impl WorkoutSet {
    /// DynamoDB Partition Key: USER#[user_id]
    pub fn pk(&self) -> String {
        format!("USER#{}", self.user_id)
    }

    /// DynamoDB Sort Key: WORKOUT#[timestamp]
    pub fn sk(&self) -> String {
        format!("WORKOUT#{}", self.timestamp)
    }
}

// === 時間ベースメニュー関連の型 ===

/// メニュー内の個別エクササイズ
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MenuExercise {
    pub exercise_name: String,
    pub sets: u32,
    pub reps: u32,
    pub recommended_weight: f64,
    pub rest_seconds: u32,
    pub notes: String,
}

/// 時間×部位ごとのトレーニングメニュー
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimedMenu {
    pub body_part: String,     // "push" | "pull" | "legs"
    pub duration_minutes: u32, // 15 | 30 | 60
    pub exercises: Vec<MenuExercise>,
    pub total_rest_seconds: u32,
    pub generated_at: String,
}

/// メニュー取得リクエスト
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuByDurationRequest {
    pub user_id: String,
    pub duration_minutes: u32,
}

/// AI情報レスポンス（管理画面用）
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIInfoResponse {
    pub model_name: String,
    pub provider: String,
    pub model_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workout_set_keys() {
        let set = WorkoutSet {
            user_id: "test_user".to_string(),
            timestamp: "2023-01-01T12:00:00Z".to_string(),
            exercise_id: "push_1".to_string(),
            weight: 20.0,
            reps: 10,
            rpe: RpeLevel::Just,
        };

        assert_eq!(set.pk(), "USER#test_user");
        assert_eq!(set.sk(), "WORKOUT#2023-01-01T12:00:00Z");
    }

    #[test]
    fn test_timed_menu_serialization() {
        let menu = TimedMenu {
            body_part: "push".to_string(),
            duration_minutes: 15,
            exercises: vec![MenuExercise {
                exercise_name: "Push Up".to_string(),
                sets: 3,
                reps: 10,
                recommended_weight: 0.0,
                rest_seconds: 60,
                notes: "Keep straight".to_string(),
            }],
            total_rest_seconds: 180,
            generated_at: "2023-01-01T12:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&menu).unwrap();
        let actual: serde_json::Value = serde_json::from_str(&json).unwrap();

        let expected = serde_json::json!({
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
        });

        assert_eq!(actual, expected);
    }
}
