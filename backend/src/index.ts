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

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Dumbbell Pro Log Backend (Node.js) is Running!');
});

// Middleware to extract user ID from Cognito Authorizer claims (or fallback for local auth)
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        let userId: string | undefined;

        // serverless-http attaches API Gateway event object to req.apiGateway
        const apiGateway = (req as any).apiGateway;
        
        if (apiGateway && apiGateway.event && apiGateway.event.requestContext && apiGateway.event.requestContext.authorizer) {
            const claims = apiGateway.event.requestContext.authorizer.jwt?.claims;
            userId = claims?.['cognito:username'] || claims?.username || claims?.sub;
        }

        // Fallback for local development or manual header injection if needed
        if (!userId && process.env.NODE_ENV !== 'production') {
            const authHeader = req.headers.authorization;
            // Extremely simplified fallback for testing purpose only
            if (authHeader && authHeader.startsWith('Bearer test-')) {
                userId = authHeader.replace('Bearer test-', '');
            } else {
                // To keep backward compatibility locally where userId was coming from body
                userId = req.body.userId || req.body.user_id;
            }
        }

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized: Unable to verify user identity.' });
            return;
        }

        // Attach verified user ID to the request
        (req as any).verifiedUserId = userId;
        next();
    } catch (e: any) {
        res.status(401).json({ error: `Unauthorized: ${e.message}` });
    }
};

app.use(requireAuth); // Apply authentication to all routes below

// --- Workout Logging ---

const handleWorkoutLog = async (req: express.Request, res: express.Response) => {
    try {
        const verifiedUserId: string = (req as any).verifiedUserId;
        const payload: WorkoutSet = req.body;

        // IDOR Mitigation: Explicitly reject requests where the payload user_id
        // does not match the authenticated user to prevent unauthorized access.
        if (payload.user_id && payload.user_id !== verifiedUserId) {
            res.status(403).json({ error: 'Forbidden: user_id in payload does not match the authenticated user.' });
            return;
        }

        // Always overwrite with the verified user ID (never trust the client-supplied value)
        payload.user_id = verifiedUserId;

        const result = await saveWorkoutRecord(payload);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

app.post('/log', handleWorkoutLog);
app.patch('/log', handleWorkoutLog);

app.delete('/log', async (req, res) => {
    try {
        const verifiedUserId: string = (req as any).verifiedUserId;

        // IDOR Mitigation: Explicitly reject requests where the payload user_id
        // does not match the authenticated user to prevent unauthorized deletion.
        if (req.body.user_id && req.body.user_id !== verifiedUserId) {
            res.status(403).json({ error: 'Forbidden: user_id in payload does not match the authenticated user.' });
            return;
        }

        const timestamp = req.body.timestamp || req.body.SK?.replace('WORKOUT#', '');

        if (!timestamp) {
            res.status(400).json({ error: "Missing timestamp for deletion." });
            return;
        }

        await deleteWorkoutRecord(verifiedUserId, timestamp);
        res.status(204).send();
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- AI Features ---

app.post('/ai/recommend', async (req, res) => {
    try {
        const verifiedUserId = (req as any).verifiedUserId;
        
        // 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const history = await getWorkoutsSince(verifiedUserId, sevenDaysAgo);
        
        // Note: Do not log verifiedUserId here to avoid PII exposure in logs
        console.log(`Found ${history.length} workout records for AI recommendation`);
        const recommendation = await getTrainingRecommendation(history);

        res.json(recommendation);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/ai/analyze-growth', async (req, res) => {
    try {
        const verifiedUserId = (req as any).verifiedUserId;
        
        const history = await getAllWorkouts(verifiedUserId);
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
        const verifiedUserId = (req as any).verifiedUserId;

        const history = await getRecentWorkouts(verifiedUserId, 50);
        const menus = await generateEndlessMenus(history);

        await saveMenus(verifiedUserId, menus);

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
        const verifiedUserId = (req as any).verifiedUserId;
        const body_part = req.body.bodyPart || req.body.body_part;

        const menus = await getMenuByBodyPart(verifiedUserId, body_part);
        
        // Ensure an array is returned even if undefined is returned by db to maintain backwards compatibility
        res.json(menus ? [menus] : []);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- Stats ---

app.post('/stats/history', async (req, res) => {
    try {
        const verifiedUserId = (req as any).verifiedUserId;

        // Last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const history = await getWorkoutsSince(verifiedUserId, ninetyDaysAgo);

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
