import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { WorkoutSet, EndlessMenu } from "./types";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

// テーブル名は環境変数から取得
export const TABLE_NAME = process.env.TABLE_NAME || "DumbbellProLog";

// --- Workout records ---

export async function saveWorkoutRecord(payload: WorkoutSet): Promise<WorkoutSet> {
    // 90日後の有効期限(TTL)を設定
    const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

    const pk = `USER#${payload.user_id}`;
    const sk = `WORKOUT#${payload.timestamp}`;

    const item = {
        ...payload,
        PK: pk,
        SK: sk,
        expires_at: expiresAt
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
    }));

    return payload;
}

export async function deleteWorkoutRecord(userId: string, timestamp: string): Promise<void> {
    const pk = `USER#${userId}`;
    const sk = `WORKOUT#${timestamp}`;

    await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
            PK: pk,
            SK: sk
        }
    }));
}

export async function getWorkoutsSince(userId: string, isoTimestamp: string): Promise<WorkoutSet[]> {
    const pk = `USER#${userId}`;
    const skPrefix = `WORKOUT#${isoTimestamp}`;

    // SK: WORKOUT#YYYY-MM-DDTHH:mm...
    // since is used as a SK >= boundary
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND SK >= :skStart",
        ExpressionAttributeValues: {
            ":pk": pk,
            ":skStart": skPrefix
        }
    }));

    return (result.Items || []) as WorkoutSet[];
}

export async function getRecentWorkouts(userId: string, limit: number = 50): Promise<WorkoutSet[]> {
    const pk = `USER#${userId}`;
    const skPrefix = "WORKOUT#";

    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
            ":pk": pk,
            ":skPrefix": skPrefix
        },
        ScanIndexForward: false, // 降順
        Limit: limit
    }));

    return (result.Items || []) as WorkoutSet[];
}

export async function getAllWorkouts(userId: string): Promise<WorkoutSet[]> {
    const pk = `USER#${userId}`;
    const skPrefix = "WORKOUT#";

    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
            ":pk": pk,
            ":skPrefix": skPrefix
        }
    }));

    return (result.Items || []) as WorkoutSet[];
}

// --- Menu records ---

export async function saveMenus(userId: string, menus: EndlessMenu[]): Promise<void> {
    const pk = `USER#${userId}`;

    for (const menu of menus) {
        const sk = `MENU#${menu.bodyPart}`;
        const item = {
            ...menu,
            PK: pk,
            SK: sk
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));
    }
}

export async function getMenuByBodyPart(userId: string, bodyPart: string): Promise<EndlessMenu[]> {
    const pk = `USER#${userId}`;
    const sk = `MENU#${bodyPart}`;

    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: {
            ":pk": pk,
            ":sk": sk
        }
    }));

    return (result.Items || []) as EndlessMenu[];
}
