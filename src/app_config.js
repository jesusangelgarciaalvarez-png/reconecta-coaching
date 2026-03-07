/**
 * GLOBAL INDUSTRY CONFIGURATION (v1.0)
 * Switch between 'COACHING' and 'MEDICAL' to change UI labels and business logic.
 */
const INDUSTRY = 'COACHING'; // Change to 'MEDICAL' for MedPro AI mode

export const APP_CONFIG = {
    industry: INDUSTRY,
    brand: INDUSTRY === 'COACHING' ? 'CoachPro AI' : 'MedPro AI',
    entities: {
        provider: INDUSTRY === 'COACHING' ? 'Coach' : 'Doctor',
        client: INDUSTRY === 'COACHING' ? 'Client' : 'Patient',
        service: INDUSTRY === 'COACHING' ? 'Session' : 'Consultation'
    },
    features: {
        insurance: INDUSTRY === 'MEDICAL',
        loyaltyRewards: true,
        prepayment: INDUSTRY === 'COACHING',
        multiProvider: INDUSTRY === 'MEDICAL'
    },
    api: {
        baseRate: 600,
        currency: 'MXN'
    }
};
