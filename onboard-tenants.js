/**
 * PORTALCOACH.COM - SAAS ONBOARDING SCRIPT (Coaching Personal)
 */

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

async function createTenant(id, data) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${id}?key=${API_KEY}`;

    const body = {
        fields: {
            id: { stringValue: id },
            name: { stringValue: data.name },
            primaryColor: { stringValue: data.primaryColor || "#fbbf24" }, // Golden for Jesus Coach
            status: { stringValue: "active" },
            stripeEnabled: { booleanValue: data.stripeEnabled || false },
            price: { stringValue: data.price || "600" },
            createdAt: { timestampValue: new Date().toISOString() }
        }
    };

    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) console.log(`✅ Tenant '${id}' created.`);
    } catch (e) { }
}

// 1. Jesus Coach (Master)
await createTenant('master', {
    name: "Jesus Coach - Portal Oficial",
    primaryColor: "#fbbf24",
    price: "600",
    stripeEnabled: true // Enable for sandbox testing
});

// 2. Beta Test Coach
await createTenant('test', {
    name: "Couch de Prueba Beta",
    primaryColor: "#ec4899",
    price: "450", // Different price for testing
    stripeEnabled: true
});

console.log("Seeding complete.");
