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
    initializeFirestore,
    terminate,
    clearIndexedDbPersistence
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
// Force long polling to avoid WebSocket hangs which can cause 1-minute delays
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Explicitly clear any old stuck persistence
clearIndexedDbPersistence(db).catch(() => { });

/**
 * Check if a user exists and manage session count
 */
export async function manageUser(email, userData) {
    const userRef = doc(db, "users", email.toLowerCase());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        await updateDoc(userRef, {
            sessionCount: increment(1),
            lastActive: serverTimestamp()
        });
        return { isFirstTime: false, ...userSnap.data() };
    } else {
        const newUser = {
            ...userData,
            email: email.toLowerCase(),
            firstVisit: serverTimestamp(),
            sessionCount: 1,
            lastActive: serverTimestamp()
        };
        await setDoc(userRef, newUser);
        return { isFirstTime: true, ...newUser };
    }
}

/**
 * Register a new appointment
 */
export async function createAppointment(appointmentData) {
    const appointmentsRef = collection(db, "appointments");
    return await addDoc(appointmentsRef, {
        ...appointmentData,
        email: appointmentData.email.toLowerCase(),
        createdAt: serverTimestamp()
    });
}

/**
 * Get all appointments for a specific month
 */
export async function getMonthlyAvailability(year, month) {
    const appointmentsRef = collection(db, "appointments");
    const mStr = (month + 1).toString().padStart(2, '0');
    const q = query(appointmentsRef,
        where("date", ">=", `${year}-${mStr}-01`),
        where("date", "<=", `${year}-${mStr}-31`)
    );

    const querySnapshot = await getDocs(q);
    const dayStats = {};

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        dayStats[data.date] = (dayStats[data.date] || 0) + 1;
    });

    return dayStats;
}

/**
 * Get occupied slots for a specific date
 */
export async function getOccupiedSlots(dateStr) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("date", "==", dateStr));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data().time);
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
export async function deleteAppointment(docId) {
    const appRef = doc(db, "appointments", docId);
    return await deleteDoc(appRef);
}
