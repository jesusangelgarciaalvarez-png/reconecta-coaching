import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                booking: resolve(__dirname, 'booking.html'),
                success: resolve(__dirname, 'success.html'),
                cancel: resolve(__dirname, 'cancel.html'),
                services: resolve(__dirname, 'services.html'),
                metodo: resolve(__dirname, 'metodo.html'),
                faq: resolve(__dirname, 'faq.html'),
            },
        },
    },
});
