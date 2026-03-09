import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import {
    saveWorkoutRecord,
    deleteWorkoutRecord,
    getWorkoutsSince,
    getRecentWorkouts,
    getAllWorkouts,
    saveMenus,
    getMenuByBodyPart
} from './db';
import {
    getTrainingRecommendation,
    getGrowthAnalysis,
    generateEndlessMenus
} from './ai';
import { WorkoutSet } from './types';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Dumbbell Pro Log Backend (Node.js) is Running!');
});

// --- Workout Logging ---

app.post('/log', async (req, res) => {
    try {
        const payload: WorkoutSet = req.body;
        const result = await saveWorkoutRecord(payload);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/log', async (req, res) => {
    try {
        const payload: WorkoutSet = req.body;
        const result = await saveWorkoutRecord(payload);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/log', async (req, res) => {
    try {
        // payload can just be an object with PK, SK or user_id, timestamp
        // Rust version used WorkoutSet which had pk() and sk()
        // Here we just extract user_id and timestamp
        const { user_id, timestamp } = req.body;
        if (!user_id || !timestamp) {
            // Check if PK/SK were sent directly instead
            const pk = req.body.PK;
            const sk = req.body.SK;
            if (pk && sk) {
                const uid = pk.replace('USER#', '');
                const ts = sk.replace('WORKOUT#', '');
                await deleteWorkoutRecord(uid, ts);
            } else {
                throw new Error("Missing user_id or timestamp.");
            }
        } else {
            await deleteWorkoutRecord(user_id, timestamp);
        }
        res.status(204).send();
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- AI Features ---

app.post('/ai/recommend', async (req, res) => {
    try {
        const { userId } = req.body;
        const user_id = userId || req.body.user_id;

        // 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const history = await getWorkoutsSince(user_id, sevenDaysAgo);

        console.log(`Found ${history.length} workout records for user ${user_id}`);
        const recommendation = await getTrainingRecommendation(history);

        res.json(recommendation);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/ai/analyze-growth', async (req, res) => {
    try {
        const { userId } = req.body;
        const user_id = userId || req.body.user_id;

        const history = await getAllWorkouts(user_id);
        const analysis = await getGrowthAnalysis(history);

        res.json(analysis);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/ai/info', (req, res) => {
    res.json({
        modelName: "Gemini 3 Flash Preview",
        provider: "Google AI Studio",
        modelId: process.env.GEMINI_MODEL_ID || "gemini-3.0-flash"
    });
});

app.post('/ai/generate-menus', async (req, res) => {
    try {
        const { userId } = req.body;
        const user_id = userId || req.body.user_id;

        const history = await getRecentWorkouts(user_id, 50);
        const menus = await generateEndlessMenus(history);

        await saveMenus(user_id, menus);

        res.json({
            menus,
            generatedCount: menus.length
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- Menu Queries ---

app.post('/menus/by-body-part', async (req, res) => {
    try {
        const { userId, bodyPart } = req.body;
        const user_id = userId || req.body.user_id;
        const body_part = bodyPart || req.body.body_part;

        const menus = await getMenuByBodyPart(user_id, body_part);
        res.json(menus);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- Stats ---

app.post('/stats/history', async (req, res) => {
    try {
        const { userId } = req.body;
        const user_id = userId || req.body.user_id;

        // Last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const history = await getWorkoutsSince(user_id, ninetyDaysAgo);

        res.json(history);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export const handler = serverless(app);

// For local development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}`);
    });
}
