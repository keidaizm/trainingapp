import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'pullup_pwa';
const DB_VERSION = 2;

export type Template = {
    id: string; // "tpl_xxx"
    name: string;
    sets: number;
    targetTotal: number;
    restSec: number;
    createdAt: string; // ISO
    updatedAt: string; // ISO
};

export type Session = {
    id: string; // "ses_yyyymmdd_hhmmss_rand"
    templateId: string;
    templateSnapshot: {
        name: string;
        sets: number;
        targetTotal: number;
        restSec: number;
    };
    startedAt: string; // ISO
    endedAt: string | null; // ISO or null if in-progress
    repsBySet: number[]; // length <= sets
    totalReps: number;
    isAchieved: boolean;
};

interface PullUpDB extends DBSchema {
    templates: {
        key: string;
        value: Template;
    };
    sessions: {
        key: string;
        value: Session;
        indexes: {
            'startedAt': string;
            'templateId': string; // Index for history lookup
        };
    };
    meta: {
        key: string;
        value: { key: string; value: string };
    };
}

let dbPromise: Promise<IDBPDatabase<PullUpDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<PullUpDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains('templates')) {
                    const store = db.createObjectStore('templates', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('sessions')) {
                    const store = db.createObjectStore('sessions', { keyPath: 'id' });
                    store.createIndex('startedAt', 'startedAt');
                }
                // Upgrade logic for Index
                const sessionStore = transaction.objectStore('sessions');
                if (!sessionStore.indexNames.contains('templateId')) {
                    sessionStore.createIndex('templateId', 'templateId');
                }

                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
            },
        });
    }
    return dbPromise;
};

// Utils for ID generation
const generateId = (prefix: string) => {
    const now = new Date();
    const rand = Math.random().toString(36).substring(2, 6);
    // Simple format: prefix_timestamp_rand
    return `${prefix}_${now.getTime()}_${rand}`;
};

// Templates
export const listTemplates = async (): Promise<Template[]> => {
    const db = await initDB();
    return db.getAll('templates');
};

export const getTemplate = async (id: string): Promise<Template | undefined> => {
    const db = await initDB();
    return db.get('templates', id);
};

export const createTemplate = async (payload: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> => {
    const db = await initDB();
    const now = new Date().toISOString();
    const template: Template = {
        ...payload,
        id: generateId('tpl'),
        createdAt: now,
        updatedAt: now,
    };
    await db.put('templates', template);
    return template;
};

export const updateTemplate = async (id: string, payload: Partial<Template>): Promise<Template> => {
    const db = await initDB();
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const existing = await store.get(id);
    if (!existing) throw new Error('Template not found');

    const updated = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
    };
    await store.put(updated);
    await tx.done;
    return updated;
};

export const deleteTemplate = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete('templates', id);
};

// Sessions
export const createSessionFromTemplate = async (templateId: string, options?: { sets?: number, restSec?: number }): Promise<Session> => {
    const db = await initDB();
    const template = await db.get('templates', templateId);
    if (!template) throw new Error('Template not found');

    const now = new Date();
    // Format ID as ses_yyyymmdd_hhmmss_rand for sorting/readable purposes? 
    // Using timestamp in ID helps, but we have startedAt index.
    // Spec: ses_yyyymmdd_hhmmss_rand
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const rand = Math.random().toString(36).substring(2, 6);
    const id = `ses_${yyyy}${mm}${dd}_${hh}${min}${ss}_${rand}`;

    // Use overrides or template defaults
    const sets = options?.sets ?? template.sets;
    const restSec = options?.restSec ?? template.restSec;
    // Adjust target total proportionally if sets changed? 
    // User input sets, target total might be irrelevant or need calc. 
    // Let's keep targetTotal as is or derive? 
    // Requirement says "record reps", target is secondary. Let's keep template target for now.
    const targetTotal = template.targetTotal; // Maybe unused

    const session: Session = {
        id,
        templateId,
        templateSnapshot: {
            name: template.name,
            sets,
            targetTotal,
            restSec,
        },
        startedAt: now.toISOString(),
        endedAt: null,
        repsBySet: [],
        totalReps: 0,
        isAchieved: false,
    };

    await db.put('sessions', session);
    return session;
};

export const getSession = async (id: string): Promise<Session | undefined> => {
    const db = await initDB();
    return db.get('sessions', id);
};

export const updateSession = async (id: string, patch: Partial<Session>): Promise<Session> => {
    const db = await initDB();
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const existing = await store.get(id);
    if (!existing) throw new Error('Session not found');

    const updated = { ...existing, ...patch };
    await store.put(updated);
    await tx.done;
    return updated;
};

export const deleteSession = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete('sessions', id);
};

export const listSessions = async (limit?: number): Promise<Session[]> => {
    const db = await initDB();
    // idb doesn't strictly support limit in getAllFromIndex easily without cursor.
    // But for MVP, fetching all might be fine or use cursor.
    // Let's use reverse cursor on index 'startedAt'
    const tx = db.transaction('sessions', 'readonly');
    const index = tx.objectStore('sessions').index('startedAt');

    if (limit) {
        const results: Session[] = [];
        let cursor = await index.openCursor(null, 'prev');
        while (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor = await cursor.continue();
        }
        return results;
    }

    return index.getAll();
};

export const getLastSession = async (templateId: string): Promise<Session | undefined> => {
    const db = await initDB();
    const tx = db.transaction('sessions', 'readonly');
    const index = tx.objectStore('sessions').index('templateId');

    // We want the last ONE with this templateId.
    // Iterating backwards on index? 'templateId' index isn't sorted by time.
    // We need compound index [templateId+startedAt] OR filter in memory.
    // Since idb standard index is one key.
    // Efficient way: getAllFromIndex('templateId', templateId) and sort?
    // If user has thousands of sessions this is slow.
    // Better: use cursor on 'startedAt' index and check templateId?
    // Finding last session of specific type might be common.
    // Let's grab all for templateId and sort (assuming < 1000 sessions generally).

    const sessions = await index.getAll(templateId);
    if (!sessions || sessions.length === 0) return undefined;

    // Sort desc
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Return first that is *finished*? Or just started?
    // Usually we compare against completed ones.
    // Checking endedAt != null
    const lastCompleted = sessions.find(s => s.endedAt !== null);
    return lastCompleted || sessions[0];
};

// Meta
export const getMeta = async (key: string): Promise<string | null> => {
    const db = await initDB();
    const res = await db.get('meta', key);
    return res ? res.value : null;
};

export const setMeta = async (key: string, value: string): Promise<void> => {
    const db = await initDB();
    await db.put('meta', { key, value });
};

// Seed
export const ensureDefaultTemplate = async (): Promise<string> => {
    const templates = await listTemplates();
    // If we already have the specific presets, good.
    // Check if we have at least one.

    const presets = [
        { id: 'tpl_wide', name: '懸垂（ワイド）', sets: 5, targetTotal: 15, restSec: 90 },
        { id: 'tpl_curl', name: 'アームカール', sets: 4, targetTotal: 40, restSec: 60 },
        { id: 'tpl_narrow', name: '懸垂（ナロー）', sets: 4, targetTotal: 12, restSec: 90 },
        { id: 'tpl_dips', name: 'ディップス', sets: 4, targetTotal: 20, restSec: 90 },
        { id: 'tpl_v_raise', name: 'Vレイズ', sets: 3, targetTotal: 10, restSec: 60 },
    ];

    const db = await initDB();
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');

    let firstId = '';

    for (const preset of presets) {
        const existing = await store.get(preset.id);
        if (!existing) {
            const now = new Date().toISOString();
            await store.put({
                ...preset,
                createdAt: now,
                updatedAt: now
            });
        }
        if (!firstId) firstId = preset.id;
    }

    // Cleanup legacy default if exists
    const legacies = templates.filter(t => t.name === '懸垂 7セット');
    for (const legacy of legacies) {
        await deleteTemplate(legacy.id);
    }

    await tx.done;
    return firstId; // Return wide pullup ID generally
};
