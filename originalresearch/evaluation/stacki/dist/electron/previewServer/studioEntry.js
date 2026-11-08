"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioEntryPlugin = studioEntryPlugin;
exports.studioEntryHTML = studioEntryHTML;
const studioLocal_1 = require("./studioLocal");
function studioEntryPlugin(project) {
    return {
        name: 'stacki-local-studio',
        configureServer(server) {
            const studio = (0, studioLocal_1.createLocalStudio)(project, (text) => server.config.logger.info(text));
            server.httpServer?.once('close', studio.close);
            if ((0, studioLocal_1.hasLocalStudio)(project)) {
                void studio
                    .open()
                    .then((result) => {
                    if (!result.ok) {
                        server.config.logger.info(result.error);
                    }
                })
                    .catch((error) => server.config.logger.info(String(error)));
            }
            server.middlewares.use((request, response, next) => {
                const route = request.url?.split('?')[0];
                if (route !== '/studio' && route !== '/studio/') {
                    next();
                    return;
                }
                if (!(0, studioLocal_1.hasLocalStudio)(project)) {
                    next();
                    return;
                }
                response.setHeader('Cache-Control', 'no-store');
                response.setHeader('Content-Type', 'text/html; charset=utf-8');
                void studio
                    .open()
                    .then((result) => {
                    if (result.ok) {
                        response.end(studioEntryHTML(result.value));
                    }
                    else {
                        server.config.logger.info(result.error);
                        response.writeHead(503);
                        response.end('Studio is unavailable. Check the website preview log and restart it.');
                    }
                })
                    .catch((error) => {
                    server.config.logger.info(String(error));
                    response.writeHead(503);
                    response.end('Studio could not start. Check the website preview log.');
                });
            });
        },
    };
}
function studioEntryHTML(origin) {
    // The private origin separates the two editors' preview scripts, not their files.
    // Keep the browser's entry address on the website's own /studio route.
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) {
        throw new Error('Studio entry requires a local HTTP origin');
    }
    return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Stacki Studio</title>
<style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}
html{background:#1b1b1b}body{position:fixed;inset:0}</style></head>
<body><iframe title="Stacki Studio" src="${url.origin}/studio"></iframe></body></html>`;
}
