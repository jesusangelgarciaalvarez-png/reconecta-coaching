import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                booking: resolve(__dirname, 'booking.html'),
                reservar: resolve(__dirname, 'reservar.html'),
                success: resolve(__dirname, 'success.html'),
                cancel: resolve(__dirname, 'cancel.html'),
                services: resolve(__dirname, 'services.html'),
                metodo: resolve(__dirname, 'metodo.html'),
                faq: resolve(__dirname, 'faq.html'),
                quienes: resolve(__dirname, 'quienes-somos.html'),
                admin: resolve(__dirname, 'admin.html'),
                adminQr: resolve(__dirname, 'admin-qr.html'),
                adminStats: resolve(__dirname, 'admin-stats.html'),
                adminBooking: resolve(__dirname, 'admin-booking.html'),
                adminPromos: resolve(__dirname, 'admin-promos.html'),
            },
        },
    },
});
