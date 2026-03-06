import { initializeApp } from "firebase/app";
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
    serverTimestamp,
    deleteDoc,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";

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
const db = getFirestore(app);

/**
 * Manage User - Ultra basic version to avoid blocks
 */
export async function manageUser(phone, userData) {
    const cleanPhone = phone.replace(/\D/g, '');
    const userRef = doc(db, "users", cleanPhone);
    try {
        setDoc(userRef, {
            ...userData,
            phone: cleanPhone,
            lastActive: serverTimestamp(),
        }, { merge: true }).catch(() => { });
        return { isFirstTime: false };
    } catch (e) {
        return { isFirstTime: false };
    }
}

/**
 * Register a new appointment - BRIDGE MODE v8.1 (Enhanced Debug)
 */
export async function createAppointment(appointmentData) {
    console.log("🚀 BRIDGE MODE v8.1: Iniciando envío al puente...");

    // Controlador de tiempo para no dejar al usuario "pasmado"
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seg de límite

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error del puente (Servidor):", errorText);
            throw new Error(`Error Servidor (500): ${errorText}`);
        }

        const result = await response.json();
        console.log("✅ Puente respondió con éxito:", result);
        return result;

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error("El servidor tardó demasiado en responder (Timeout).");
        }
        console.error("Error de Red/Puente:", err);
        throw err;
    }
}

/**
 * Get monthly availability by fetching all documents in 'days' for that range
 */
export async function getMonthlyAvailability(year, month) {
    const daysRef = collection(db, "days");
    const mStr = (month + 1).toString().padStart(2, '0');
    const start = `${year}-${mStr}-01`;
    const end = `${year}-${mStr}-31`;

    const q = query(daysRef,
        where("__name__", ">=", start),
        where("__name__", "<=", end)
    );

    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = docSnap.id;
        if (data.times) {
            data.times.forEach(time => results.push({ date, time }));
        }
    });

    return results;
}

/**
 * Get occupied slots
 */
export async function getOccupiedSlots(dateStr) {
    const dayRef = doc(db, "days", dateStr);
    const docSnap = await getDoc(dayRef);
    if (docSnap.exists()) {
        return docSnap.data().times || [];
    }
    return [];
}

/**
 * Get an appointment by its 6-digit ID
 */
export async function getAppointment(appointmentId) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("id", "==", appointmentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;
    const docSnap = querySnapshot.docs[0];
    return { docId: docSnap.id, ...docSnap.data() };
}

/**
 * Delete/Cancel an appointment
 */
export async function deleteAppointment(docId, date, time) {
    const appRef = doc(db, "appointments", docId);
    await deleteDoc(appRef);
    if (date && time) {
        const dayRef = doc(db, "days", date);
        try {
            await updateDoc(dayRef, {
                times: arrayRemove(time),
                [`bookings.${time.replace(':', '_')}`]: ""
            });
        } catch (e) { }
    }
}
