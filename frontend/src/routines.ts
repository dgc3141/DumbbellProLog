
import type { Exercise, Routine } from './types';

export const EXERCISES: Record<string, Exercise> = {
    // Push
    'push_1': { id: 'push_1', name: 'インクライン・プレス', notes: '30° / 肩甲骨を寄せて固定' },
    'push_2': { id: 'push_2', name: 'ショルダー・プレス', notes: '背もたれ垂直 / 耳の横まで下ろす' },
    'push_3': { id: 'push_3', name: 'トライセプス・エクステンション', notes: '肘を固定 / ストレッチ意識' },
    'push_4': { id: 'push_4', name: 'サイド・レイズ', notes: '小指側を上げる / 反動を使わない' },

    // Pull
    'pull_1': { id: 'pull_1', name: 'ワンアーム・ロウ', notes: '広背筋を意識 / 収縮を出し切る' },
    'pull_2': { id: 'pull_2', name: 'デッドリフト', notes: '背筋を伸ばす / ハムのストレッチ' },
    'pull_3': { id: 'pull_3', name: 'ハンマー・カール', notes: '前腕を固定 / ゆっくり下ろす' },
    'pull_4': { id: 'pull_4', name: 'フェイス・プル', notes: '顔の高さに引く / 肩甲骨の寄せ' },

    // Legs/Shoulders
    'legs_1': { id: 'legs_1', name: 'ゴブレット・スクワット', notes: '深くしゃがむ / 腹圧をかける' },
    'legs_2': { id: 'legs_2', name: 'ランジ', notes: '垂直に下ろす / 前足重心' },
    'legs_3': { id: 'legs_3', name: 'カーフレイズ', notes: 'つま立ちで静止 / 最大ストレッチ' },
    'legs_4': { id: 'legs_4', name: 'アップライト・ロウ', notes: '肘を高く上げる / 顎まで引く' },
};

export const ROUTINES: Routine[] = [
    {
        id: 'push',
        name: 'Push Day',
        exercises: [
            { exercise: EXERCISES['push_1'], targetSets: 3, defaultWeight: 24 },
            { exercise: EXERCISES['push_2'], targetSets: 3, defaultWeight: 16 },
            { exercise: EXERCISES['push_3'], targetSets: 3, defaultWeight: 12 },
            { exercise: EXERCISES['push_4'], targetSets: 3, defaultWeight: 8 },
        ]
    },
    {
        id: 'pull',
        name: 'Pull Day',
        exercises: [
            { exercise: EXERCISES['pull_1'], targetSets: 3, defaultWeight: 20 },
            { exercise: EXERCISES['pull_2'], targetSets: 3, defaultWeight: 32 },
            { exercise: EXERCISES['pull_3'], targetSets: 3, defaultWeight: 12 },
            { exercise: EXERCISES['pull_4'], targetSets: 3, defaultWeight: 10 },
        ]
    },
    {
        id: 'legs',
        name: 'Legs Day',
        exercises: [
            { exercise: EXERCISES['legs_1'], targetSets: 4, defaultWeight: 24 },
            { exercise: EXERCISES['legs_2'], targetSets: 3, defaultWeight: 18 },
            { exercise: EXERCISES['legs_3'], targetSets: 3, defaultWeight: 20 },
            { exercise: EXERCISES['legs_4'], targetSets: 3, defaultWeight: 14 },
        ]
    }
];
