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
    serverTimestamp
} from "firebase/firestore";

// TODO: Replace with your actual Firebase config
// You can get this from Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Check if a user exists and manage session count
 * @param {string} email 
 * @param {object} userData { name, phone }
 */
export async function manageUser(email, userData) {
    const userRef = doc(db, "users", email.toLowerCase());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        // User exists, increment sessions
        await updateDoc(userRef, {
            sessionCount: increment(1),
            lastActive: serverTimestamp()
        });
        return { isFirstTime: false, ...userSnap.data() };
    } else {
        // New user
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
 * @param {object} appointmentData { email, date, time }
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
 * @param {number} year 
 * @param {number} month (0-11)
 */
export async function getMonthlyAvailability(year, month) {
    // Format month and year for simpler querying or fetch all and filter in JS
    // For simplicity, we create a query for the month
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef,
        where("date", ">=", `${year}-${(month + 1).toString().padStart(2, '0')}-01`),
        where("date", "<=", `${year}-${(month + 1).toString().padStart(2, '0')}-31`)
    );

    const querySnapshot = await getDocs(q);
    const dayStats = {}; // { "YYYY-MM-DD": count }

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        dayStats[data.date] = (dayStats[data.date] || 0) + 1;
    });

    return dayStats;
}

/**
 * Get occupied slots for a specific date
 * @param {string} dateStr (YYYY-MM-DD)
 */
export async function getOccupiedSlots(dateStr) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("date", "==", dateStr));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data().time);
}
