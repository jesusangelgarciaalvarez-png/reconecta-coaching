import { initializeApp } from "firebase/app";
import { tenantId } from "./tenant-resolver.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    increment,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    deleteDoc,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";

// Helper for Demo collections
const getColl = (name) => {
    const isDemo = window.isDemoMode === true;
    if (isDemo) {
        if (name === 'appointments') return 'demo_appointments';
        if (name === 'days') return 'demo_days';
        if (name === 'users') return 'demo_users';
    }
    return name;
};

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM",
    authDomain: "reconecta-ed650.firebaseapp.com",
    projectId: "reconecta-ed650",
    storageBucket: "reconecta-ed650.firebasestorage.app",
    messagingSenderId: "148326324396",
    appId: "1:148326324396:web:e4baa888d1b445055e2709",
    measurementId: "G-FLT31CQN60"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Manage User - Multi-tenant
 */
export async function manageUser(phone, userData) {
    const cleanPhone = phone.replace(/\D/g, '');
    const userRef = doc(db, getColl("users"), `${tenantId}_${cleanPhone}`);
    try {
        setDoc(userRef, {
            ...userData,
            phone: cleanPhone,
            tenant_id: tenantId,
            lastActive: serverTimestamp(),
        }, { merge: true }).catch(() => { });
        return { isFirstTime: false };
    } catch (e) {
        return { isFirstTime: false };
    }
}

/**
 * Register a new appointment - BRIDGE v50.0 Multi-Tenant
 */
export async function createAppointment(appointmentData) {
    console.log(`🚀 COACH-BRIDGE v50.0 (${tenantId}): Iniciando envío...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Id': tenantId
            },
            body: JSON.stringify({
                ...appointmentData,
                tenant_id: tenantId
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error Servidor (500): ${errorText}`);
        }

        const result = await response.json();
        return result;

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error("Timeout.");
        throw err;
    }
}

/**
 * Get monthly availability - FILTERED BY TENANT
 */
export async function getMonthlyAvailability(year, month) {
    const daysRef = collection(db, getColl("days"));
    const mStr = (month + 1).toString().padStart(2, '0');

    const q = query(daysRef,
        where("tenant_id", "==", tenantId),
        orderBy("__name__"),
        where("__name__", ">=", `${tenantId}_${year}-${mStr}-01`),
        where("__name__", "<=", `${tenantId}_${year}-${mStr}-31`)
    );

    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = docSnap.id.split('_')[1];
        if (data.times) {
            data.times.forEach(time => results.push({ date, time }));
        }
    });

    return results;
}

/**
 * Get occupied slots - FILTERED BY TENANT
 */
export async function getOccupiedSlots(dateStr) {
    const dayRef = doc(db, getColl("days"), `${tenantId}_${dateStr}`);
    const docSnap = await getDoc(dayRef);
    if (docSnap.exists()) {
        return docSnap.data().times || [];
    }
    return [];
}

/**
 * Toggle slot availability - FILTERED BY TENANT
 */
export async function toggleOccupiedSlot(dateStr, time, shouldOccupy) {
    const dayRef = doc(db, getColl("days"), `${tenantId}_${dateStr}`);
    try {
        await setDoc(dayRef, {
            tenant_id: tenantId,
            times: shouldOccupy ? arrayUnion(time) : arrayRemove(time)
        }, { merge: true });
        return true;
    } catch (e) {
        console.error("Error toggling slot:", e);
        throw e;
    }
}

/**
 * Get an appointment by its 6-digit ID - FILTERED BY TENANT
 */
export async function getAppointment(appointmentId) {
    const appointmentsRef = collection(db, getColl("appointments"));
    const q = query(appointmentsRef,
        where("tenant_id", "==", tenantId),
        where("id", "==", appointmentId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;
    const docSnap = querySnapshot.docs[0];
    return { docId: docSnap.id, ...docSnap.data() };
}

/**
 * Delete/Cancel an appointment - FILTERED BY TENANT
 */
export async function deleteAppointment(docId, date, time) {
    const appRef = doc(db, getColl("appointments"), docId);
    const appSnap = await getDoc(appRef);

    if (appSnap.exists() && appSnap.data().tenant_id !== tenantId) {
        throw new Error("UNAUTHORIZED_ACCESS");
    }

    await deleteDoc(appRef);
    if (date && time) {
        const dayRef = doc(db, getColl("days"), `${tenantId}_${date}`);
        try {
            await updateDoc(dayRef, {
                times: arrayRemove(time),
                [`bookings.${time.replace(':', '_')}`]: ""
            });
        } catch (e) {
            console.error("Error clearing availability:", e);
        }
    }
}

/**
 * Decrement visit count for a user - FILTERED BY TENANT
 */
export async function decrementUserVisit(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const userRef = doc(db, getColl("users"), `${tenantId}_${cleanPhone}`);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().tenant_id === tenantId) {
            const currentCount = docSnap.data().visitCount || 0;
            const newCount = Math.max(0, currentCount - 1);
            await updateDoc(userRef, {
                visitCount: newCount,
                lastActive: serverTimestamp()
            });
        }
    } catch (e) {
        console.error("Error decrementing visit count:", e);
    }
}

/**
 * Get all appointments for a user by phone - FILTERED BY TENANT
 */
export async function getUserAppointments(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const appointmentsRef = collection(db, getColl("appointments"));
    const q = query(appointmentsRef,
        where("phone", "==", cleanPhone),
        where("tenant_id", "==", tenantId)
    );
    const querySnapshot = await getDocs(q);

    const results = [];
    querySnapshot.forEach(docSnap => {
        results.push({ docId: docSnap.id, ...docSnap.data() });
    });
    return results;
}

/**
 * Get monthly promotion text - Multi-tenant
 */
export async function getMonthlyPromotion(monthId) {
    try {
        // 1. Try tenant-specific promo in tenants/{id}/promotions/{monthId}
        const tenantPromoRef = doc(db, "tenants", tenantId, "promotions", monthId);
        const snap = await getDoc(tenantPromoRef);
        if (snap.exists() && snap.data().text) return snap.data().text;

        // 2. Legacy fallback or global promo (optional)
        const globalPromoRef = doc(db, "promotions", monthId);
        const globalSnap = await getDoc(globalPromoRef);
        if (globalSnap.exists()) return globalSnap.data().text;
    } catch (e) {
        console.error("Error fetching monthly promotion:", e);
    }
    return null;
}

/**
 * Check if a tenant ID is available (not already taken)
 */
export async function checkTenantAvailability(candidateId) {
    const docRef = doc(db, "tenants", candidateId);
    const snap = await getDoc(docRef);
    return !snap.exists();
}

/**
 * Get Tenant Metadata (Branding, Name, etc.)
 */
export async function getTenantMetadata() {
    try {
        const tenantRef = doc(db, "tenants", tenantId);
        const snap = await getDoc(tenantRef);
        if (snap.exists()) return snap.data();
    } catch (e) {
        console.error("Error fetching tenant metadata:", e);
    }
    return { name: tenantId === 'master' ? 'Jesus Coach' : tenantId.toUpperCase() };
}
