import { db } from './firebase';
import {
    collection, doc, getDocs, getDoc, setDoc, writeBatch,
    query, orderBy, limit as firestoreLimit, startAfter,
    where, Timestamp
} from 'firebase/firestore';

const COLLECTION = 'leetcodeProblems';
const META_DOC = '_metadata';

/**
 * Cache an array of problems from the list API.
 * DEDUP: Only writes problems that don't already exist in Firestore.
 */
export async function cacheProblems(problems) {
    if (!problems?.length) return;

    // 1. Check which ones already exist
    const existingSlugs = new Set();
    const batchSize = 10; // check in small batches via getDoc
    for (const p of problems) {
        try {
            const snap = await getDoc(doc(db, COLLECTION, p.titleSlug));
            if (snap.exists()) existingSlugs.add(p.titleSlug);
        } catch { /* ignore */ }
    }

    // 2. Filter to only new problems
    const newProblems = problems.filter(p => !existingSlugs.has(p.titleSlug));
    if (newProblems.length === 0) {
        console.log(`[Cache] All ${problems.length} problems already cached, skipping.`);
        return;
    }

    console.log(`[Cache] Saving ${newProblems.length} new problems (${existingSlugs.size} already cached).`);

    // 3. Batch write new problems
    const chunkSize = 450;
    for (let i = 0; i < newProblems.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = newProblems.slice(i, i + chunkSize);

        chunk.forEach(p => {
            const docRef = doc(db, COLLECTION, p.titleSlug);
            batch.set(docRef, {
                titleSlug: p.titleSlug,
                title: p.title || '',
                difficulty: p.difficulty || 'Medium',
                acRate: p.acRate || null,
                isPaidOnly: p.isPaidOnly || false,
                topicTags: (p.topicTags || []).map(t => ({
                    name: t.name || '',
                    slug: t.slug || '',
                })),
                topicNames: (p.topicTags || []).map(t => t.name || ''),
                frontendQuestionId: p.frontendQuestionId || null,
                hasDetails: false, // mark that we don't have description yet
                cachedAt: Timestamp.now(),
            });
        });

        await batch.commit();
    }

    // Update metadata
    await setDoc(doc(db, COLLECTION, META_DOC), {
        lastSyncedAt: Timestamp.now(),
    }, { merge: true });
}

/**
 * Cache full problem details (description, examples, code snippets).
 * Only writes if the doc doesn't already have details.
 */
export async function cacheProblemDetails(titleSlug, details) {
    if (!titleSlug || !details) return;

    try {
        const docRef = doc(db, COLLECTION, titleSlug);
        const snap = await getDoc(docRef);

        // DEDUP: skip if details already cached
        if (snap.exists() && snap.data().hasDetails) {
            console.log(`[Cache] Details for "${titleSlug}" already cached, skipping.`);
            return;
        }

        await setDoc(docRef, {
            titleSlug,
            title: details.questionTitle || details.title || '',
            difficulty: details.difficulty || 'Medium',
            description: details.question || details.content || '',
            examples: details.exampleTestcaseList || details.examples || [],
            hints: details.hints || [],
            codeSnippets: details.codeSnippets || [],
            topicTags: (details.topicTags || []).map(t => ({
                name: t.name || '',
                slug: t.slug || '',
            })),
            topicNames: (details.topicTags || []).map(t => t.name || ''),
            hasDetails: true,
            detailsCachedAt: Timestamp.now(),
        }, { merge: true });

        console.log(`[Cache] Saved details for "${titleSlug}".`);
    } catch (error) {
        console.warn('[Cache] Failed to save problem details:', error.message);
    }
}

/**
 * Get cached problem details from Firestore.
 * Returns the full document data or null if not found / no details.
 */
export async function getCachedProblemDetails(titleSlug) {
    try {
        const snap = await getDoc(doc(db, COLLECTION, titleSlug));
        if (snap.exists()) {
            const data = snap.data();
            if (data.hasDetails) return data;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Get cached problems with cursor-based pagination.
 */
export async function getCachedProblems(pageSize = 30, startAfterDoc = null, filters = {}) {
    try {
        const colRef = collection(db, COLLECTION);
        const constraints = [orderBy('titleSlug')];

        if (filters.difficulty && filters.difficulty !== 'All') {
            constraints.unshift(where('difficulty', '==', filters.difficulty));
        }
        if (filters.topicName && filters.topicName !== 'All Topics') {
            constraints.unshift(where('topicNames', 'array-contains', filters.topicName));
        }

        constraints.push(firestoreLimit(pageSize + 1));
        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc));
        }

        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);

        const docs = snapshot.docs.filter(d => d.id !== META_DOC);
        const hasMore = docs.length > pageSize;
        const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

        const problems = pageDocs.map(d => ({ ...d.data(), _docSnap: d }));
        const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

        return { problems, lastDoc, hasMore };
    } catch (error) {
        console.error('Error reading cached problems:', error);
        return { problems: [], lastDoc: null, hasMore: false };
    }
}

/**
 * Get the timestamp of the last API sync.
 */
export async function getLastSyncTime() {
    try {
        const snap = await getDoc(doc(db, COLLECTION, META_DOC));
        if (snap.exists()) {
            return snap.data().lastSyncedAt?.toDate() || null;
        }
        return null;
    } catch {
        return null;
    }
}
