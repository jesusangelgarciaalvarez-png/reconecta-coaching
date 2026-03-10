import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
    plugins: [
        {
            name: 'vercel-api-simulator',
            configureServer(server) {
                server.middlewares.use(async (req, res, next) => {
                    // 1. Handle Clean URLs (e.g., /onboard -> /onboard.html)
                    if (!req.url.startsWith('/api/') && !req.url.includes('.') && req.url !== '/') {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const potentialHtml = resolve(process.cwd(), url.pathname.slice(1) + '.html');
                        if (fs.existsSync(potentialHtml)) {
                            req.url = url.pathname + '.html' + url.search;
                        }
                    }

                    // 2. Handle API simulator
                    if (req.url.startsWith('/api/')) {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const apiFile = url.pathname.split('?')[0] + '.js';
                        const apiPath = resolve(process.cwd(), apiFile.slice(1));

                        if (fs.existsSync(apiPath)) {
                            try {
                                // 1. Read stream body if present
                                let body = '';
                                if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
                                    body = await new Promise((resolve) => {
                                        let data = '';
                                        req.on('data', chunk => { data += chunk; });
                                        req.on('end', () => resolve(data));
                                    });
                                }

                                // 2. Create Mock Req/Res for Vercel Signature
                                const mockReq = {
                                    method: req.method,
                                    headers: req.headers,
                                    body: body ? JSON.parse(body) : {},
                                    query: Object.fromEntries(url.searchParams),
                                    url: req.url
                                };

                                const mockRes = {
                                    status(code) { res.statusCode = code; return this; },
                                    json(data) {
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify(data));
                                        return this;
                                    },
                                    send(data) {
                                        res.end(typeof data === 'string' ? data : JSON.stringify(data));
                                        return this;
                                    }
                                };

                                // 3. Dynamically load and execute the API handler
                                const { default: handler } = await server.ssrLoadModule(apiPath);
                                await handler(mockReq, mockRes);
                                return;
                            } catch (e) {
                                console.error('[API SIMULATOR ERROR]:', e);
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: e.message }));
                                return;
                            }
                        }
                    }
                    next();
                });
            }
        }
    ],
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
                adminSchedule: resolve(__dirname, 'admin-schedule.html'),
                adminSettings: resolve(__dirname, 'admin-settings.html'),
                coachDashboard: resolve(__dirname, 'coach-dashboard.html'),
                masterDashboard: resolve(__dirname, 'master-dashboard.html'),
                onboard: resolve(__dirname, 'onboard.html'),
                adminBuilder: resolve(__dirname, 'admin-builder.html'),
                publicSite: resolve(__dirname, 'public-site.html'),
            },
        },
    },
});
