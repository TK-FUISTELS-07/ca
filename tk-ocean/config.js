
const IS_LOCALHOST = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

// IP del servidor (cambiar según tu red)
const SERVER_IP = 'ocean-mirror.serveirc.com';
const SERVER_PROTOCOL = IS_LOCALHOST ? 'http' : 'https';

const PORTS = {
    API: '5000',      // Puerto del Mirror (Go)
    WATCHER: '5002'   // Puerto del Stream Proxy (Go)
};

// URL base del API (mirror Go) - SIEMPRE usar la IP definida
const API_BASE_URL = IS_LOCALHOST ?
    `http://localhost:${PORTS.API}` :
    'https://ocean-mirror.serveirc.com/mirror';
const API_WATCHER_URL = IS_LOCALHOST ?
    `http://localhost:${PORTS.WATCHER}` :
    'https://ocean-mirror.serveirc.com/watch';
const LOCALHOST_BRIDGE = 'https://ocean-mirror.serveirc.com/mirror/';

const CONFIG = {
    // Variables para confi-detalle.js y confi-capitulo.js
    PORT_BRIDGE: API_BASE_URL,
    PORT_STREAM: API_WATCHER_URL,
    LOCALHOST_BRIDGE: LOCALHOST_BRIDGE,

    // Rutas base
    // URL pública del sitio - debe terminar en /tk-ocean/ para producción
    BASE_URL: '/tk-ocean/',
    PUBLIC_URL: '/tk-ocean',
    API_BASE: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    WATCHER_BASE: API_WATCHER_URL.endsWith('/') ? API_WATCHER_URL : `${API_WATCHER_URL}/`,

    // Portal de tokens (ruta relativa desde /tk-ocean/)
    TOKEN_PORTAL: '../token/index.html',

    // Modo producción (true) o desarrollo (false)
    IS_PRODUCTION: true,

    // Telegram y otros
    TELEGRAM_REPORTES: `https://t.me/tkocean_reportes`,
    PORTS: PORTS,

    // Funciones helper
    utils: {
        // Generar URL completa del Bridge (Mirror)
        getBridgeUrl: (path) => {
            if (!path) return '';
            if (path.startsWith('http')) return path;

            // Limpiar el path primero
            const cleanPath = CONFIG.utils.extractPathFromMirror(path);
            const base = IS_LOCALHOST ?
                `http://localhost:5000` :
                `https://ocean-mirror.serveirc.com/mirror`;

            return `${base}/${cleanPath}`;
        },

        // Generar URL del stream proxy (Watcher)
        getStreamUrl: (url) => {
            if (!url) return '';
            if (url.includes('/stream_proxy?url=')) return url;

            const base = IS_LOCALHOST ?
                `http://localhost:5002` :
                `https://ocean-mirror.serveirc.com/watch`;

            const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
            return `${cleanBase}/stream_proxy?url=${encodeURIComponent(url)}`;
        },

        // Filtrar solo enlaces embed válidos (todos los dominios soportados por el bridge)
        filterEmbedLinks: (links) => {
            if (!Array.isArray(links)) return [];
            const validEmbedDomains = [
                'minochinos.com/embed/',
                'dintezuvio.com/embed/',
                'hglink.to/e/',
                'voe.sx/e/',
                'bysedikamoum.com/e/',
                'embed69.org/d/',
                'embed69.org/f/'
            ];
            const filtered = links.filter(url => {
                if (!url || typeof url !== 'string') return false;
                // Si ya está procesado por nuestro proxy, es válido
                if (url.includes('/watch/stream_proxy') || url.includes(':5002/stream_proxy')) return true;
                // Si no, verificar dominios válidos
                return validEmbedDomains.some(domain => url.includes(domain));
            });
            return filtered;
        },

        // Limpiar dominio de una URL
        cleanDomain: (url) => {
            return url.replace(/^https?:\/\//, '');
        },

        // Extraer path limpio desde una URL del mirror
        extractPathFromMirror: (url) => {
            if (!url) return '';
            let clean = decodeURIComponent(url);

            // Si la URL es una ruta de navegación con ?slug=
            if (clean.includes('slug=')) {
                clean = clean.split('slug=')[1].split('&')[0];
            }

            // Limpieza profunda de rutas del frontend
            clean = clean.replace(/^https?:\/\/[^\/]+/, '')
                .replace('/tk-ocean/detalle/detalles-series/capitulos/', '')
                .replace('/tk-ocean/detalle/detalles-peliculas/', '') // <--- YA ESTÁ
                .replace('/tk-ocean/detalle/detalles-series/', '')    // <--- AGREGAR ESTA
            return clean.replace(/^\/+/, '').split('?')[0];
        },

        // Guardar datos en localStorage con expiración
        saveToStorage: (key, data, ttlMinutes = 60) => {
            const item = {
                data: data,
                timestamp: Date.now(),
                expiry: ttlMinutes * 60 * 1000
            };
            localStorage.setItem(key, JSON.stringify(item));
        },

        // Leer datos de localStorage con verificación de expiración
        getFromStorage: (key) => {
            const item = localStorage.getItem(key);
            if (!item) return null;
            try {
                const parsed = JSON.parse(item);
                if (Date.now() - parsed.timestamp > parsed.expiry) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.data;
            } catch (e) {
                return null;
            }
        },

        // Generar ID de sesión único
        generateSessionId: () => {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }
};

// Exposición global para scripts que no son módulos
window.CONFIG = CONFIG;
window.API_BASE_URL = API_BASE_URL;
window.API_WATCHER_URL = API_WATCHER_URL;
window.LOCALHOST_BRIDGE = LOCALHOST_BRIDGE;
window.TELEGRAM_URL = CONFIG.TELEGRAM_REPORTES;

// ===== SISTEMA DE SEGURIDAD Y TOKENS =====
const TOKEN_SECURITY = {
    // Hora de reinicio (4 AM Bolivia)
    RESET_HOUR_BO: 4,

    // Obtener hora Bolivia (UTC-4)
    getBoliviaTime: function () {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc - (4 * 3600000));
    },

    // Validar token
    validateToken: function (token) {
        if (!token) return { valid: false, reason: 'No token' };

        // Formato: TK-YYYYMMDD-XXXX-XXXX-XXXXXX
        const regex = /^TK-\d{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{6}$/;
        if (!regex.test(token)) {
            return { valid: false, reason: 'Formato inválido' };
        }

        // Extraer fecha
        const tokenDate = token.split('-')[1];
        const boTime = this.getBoliviaTime();
        const today = boTime.toISOString().split('T')[0].replace(/-/g, '');

        if (tokenDate !== today) {
            return { valid: false, reason: 'Token expirado' };
        }

        return { valid: true, token: token };
    },

    // Verificar si debe reiniciar
    shouldReset: function () {
        const boTime = this.getBoliviaTime();
        const lastAccess = localStorage.getItem('tk-last-valid-access');

        if (!lastAccess) return true;

        const lastDate = new Date(lastAccess);
        const lastDay = lastDate.toISOString().split('T')[0];
        const today = boTime.toISOString().split('T')[0];

        if (today !== lastDay) return true;

        if (boTime.getHours() >= this.RESET_HOUR_BO &&
            lastDate.getHours() < this.RESET_HOUR_BO) {
            return true;
        }

        return false;
    },

    // Guardar token válido
    saveToken: function (token) {
        const boTime = this.getBoliviaTime();
        localStorage.setItem('tk-access-token', token);
        localStorage.setItem('tk-last-valid-access', boTime.toISOString());

        // Calcular expiración
        const expiry = new Date(boTime);
        expiry.setHours(this.RESET_HOUR_BO, 0, 0, 0);
        if (boTime >= expiry) {
            expiry.setDate(expiry.getDate() + 1);
        }
        localStorage.setItem('tk-token-expiry', expiry.toISOString());
    },

    // Obtener token guardado
    getToken: function () {
        return localStorage.getItem('tk-access-token');
    },

    // Limpiar tokens
    clearToken: function () {
        localStorage.removeItem('tk-access-token');
        localStorage.removeItem('tk-last-valid-access');
        localStorage.removeItem('tk-token-expiry');
    },

    // Redirigir al portal
    redirectToPortal: function (reason) {
        const cleanUrl = window.location.protocol + '//' + window.location.host + '/';
        if (reason) {
            sessionStorage.setItem('tk-error', reason);
        }
        window.location.href = cleanUrl;
    }
};

// ===== FUNCIONES DE SEGURIDAD ADICIONALES =====

// Verificar acceso completo (usado por security.js)
function verifyAccess() {
    if (TOKEN_SECURITY.shouldReset()) {
        TOKEN_SECURITY.clearToken();
        TOKEN_SECURITY.redirectToPortal('Sesión expirada - Reinicio diario 4 AM BO');
        return false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
        const validation = TOKEN_SECURITY.validateToken(urlToken);
        if (validation.valid) {
            TOKEN_SECURITY.saveToken(urlToken);
            return true;
        }
    }

    const savedToken = TOKEN_SECURITY.getToken();
    if (savedToken) {
        const validation = TOKEN_SECURITY.validateToken(savedToken);
        if (validation.valid) {
            // Actualizar URL
            const url = new URL(window.location.href);
            url.searchParams.set('token', savedToken);
            url.searchParams.set('access', 'granted');
            window.history.replaceState({}, '', url.toString());
            return true;
        }
    }

    TOKEN_SECURITY.redirectToPortal('Acceso no autorizado');
    return false;
}

// ===== CONFIGURACIÓN DEL SERVIDOR DE PRUEBA =====
const TEST_SERVER = {
    // URLs del servidor de prueba local
    WEB_URL: 'http://localhost:8080',
    API_URL: 'http://localhost:8081',

    // Endpoints de la API
    ENDPOINTS: {
        GENERATE_TOKEN: '/api/token/generate',
        VALIDATE_TOKEN: '/api/token/validate',
        USE_TOKEN: '/api/token/use',
        STATUS: '/api/status'
    },

    // Funciones de API
    async validateToken(token) {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.VALIDATE_TOKEN}?token=${token}`);
            if (!response.ok) {
                const error = await response.json();
                return { valid: false, error: error.error };
            }
            return await response.json();
        } catch (e) {
            console.log('[TEST-SERVER] API no disponible, usando validación local');
            // Fallback a validación local si el servidor no está corriendo
            return TOKEN_SECURITY.validateToken(token);
        }
    },

    async generateToken() {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.GENERATE_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            return await response.json();
        } catch (e) {
            console.error('[TEST-SERVER] Error generando token:', e);
            throw e;
        }
    },

    async useToken(token) {
        try {
            await fetch(`${this.API_URL}${this.ENDPOINTS.USE_TOKEN}?token=${token}`, {
                method: 'POST'
            });
        } catch (e) {
            console.log('[TEST-SERVER] No se pudo marcar token como usado');
        }
    },

    async getStatus() {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.STATUS}`);
            return await response.json();
        } catch (e) {
            return null;
        }
    }
};

// Export ES6 para módulos (opcional, solo si se usa como módulo)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, API_BASE_URL, API_WATCHER_URL, LOCALHOST_BRIDGE, TOKEN_SECURITY, verifyAccess, TEST_SERVER };
}

// Exponer globalmente
window.TOKEN_SECURITY = TOKEN_SECURITY;
window.verifyAccess = verifyAccess;
window.TEST_SERVER = TEST_SERVER;

// ===== CONFIGURACIÓN SERVIDOR DE TOKENS (NUEVO SISTEMA) =====
const TOKEN_SERVER = {
    // URLs base
    WEB_PORT: '8080',
    API_PORT: '8081',


    get WEB_URL() {
        return `${window.location.protocol}//${window.location.hostname}:${this.WEB_PORT}`;
    },

    get API_URL() {
        return `${window.location.protocol}//${window.location.hostname}:${this.API_PORT}`;
    },

    // Endpoints
    ENDPOINTS: {
        GENERATE_TOKEN: '/api/token/generate',
        VALIDATE_TOKEN: '/api/token/validate',
        VERIFY_ACCESS: '/api/token/verify-access',
        USE_TOKEN: '/api/token/use',
        COMPLETE_MISSION: '/api/mission/complete',
        STATUS: '/api/status'
    },

    // Rutas de misiones
    MISSIONS: {
        RULETA: '/token/ruleta/index.html',
        RADAR: '/token/radar/index.html',
        BOSS: '/token/boss/index.html',
        ENERGIA: '/token/energia/index.html',
        COFRES: '/token/cofres/index.html',
        SEGURIDAD: '/token/seguridad/index.html'
    },

    // Portal principal
    PORTAL_URL: '/token/index.html',

    // Funciones API
    async verifyAccessToken(token) {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.VERIFY_ACCESS}?token=${token}`);
            return await response.json();
        } catch (e) {
            console.error('[TOKEN-SERVER] Error verificando acceso:', e);
            // Fallback a localStorage
            return this.verifyLocalToken(token);
        }
    },

    verifyLocalToken(token) {
        const tokenData = localStorage.getItem('tk-access-token');
        if (!tokenData) return { access: false };

        try {
            const data = JSON.parse(tokenData);
            const hoy = new Date().toISOString().split('T')[0];

            return {
                access: data.token === token && data.date === hoy,
                expires_at: data.expiresAt
            };
        } catch (e) {
            return { access: false };
        }
    },

    async completeMission(missionId, ip = '') {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.COMPLETE_MISSION}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission_id: missionId, ip: ip })
            });
            return await response.json();
        } catch (e) {
            console.error('[TOKEN-SERVER] Error completando misión:', e);
            // Fallback a localStorage
            localStorage.setItem('tk-mission-complete', 'true');
            return { success: true };
        }
    },

    async generateTokenFromServer(missionId) {
        try {
            const response = await fetch(`${this.API_URL}${this.ENDPOINTS.GENERATE_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission_id: missionId })
            });
            if (!response.ok) {
                throw new Error('Error del servidor');
            }
            const data = await response.json();

            // Guardar en localStorage
            localStorage.setItem('tk-access-token', JSON.stringify({
                token: data.token,
                date: new Date().toISOString().split('T')[0],
                expiresAt: data.expires_at,
                granted: true
            }));
            localStorage.setItem('tk-access-granted', 'true');

            return data;
        } catch (e) {
            console.error('[TOKEN-SERVER] Error generando token:', e);
            // Fallback: generar localmente
            return this.generateLocalToken(missionId);
        }
    },

    generateLocalToken(missionId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
        let token = 'TK-' + hoy + '-';
        for (let i = 0; i < 12; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const tokenData = {
            token: token,
            date: new Date().toISOString().split('T')[0],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            granted: true,
            missionId: missionId
        };

        localStorage.setItem('tk-access-token', JSON.stringify(tokenData));
        localStorage.setItem('tk-access-granted', 'true');

        return { token: token, expires_at: tokenData.expiresAt };
    },

    // Redirigir al portal si no hay acceso
    redirectToPortal() {
        window.location.href = this.PORTAL_URL + '?error=acceso_denegado';
    },

    // Verificar acceso actual
    checkAccess() {
        const tokenData = localStorage.getItem('tk-access-token');
        const accessGranted = localStorage.getItem('tk-access-granted');

        if (!tokenData || accessGranted !== 'true') {
            this.redirectToPortal();
            return false;
        }

        try {
            const data = JSON.parse(tokenData);
            const hoy = new Date().toISOString().split('T')[0];

            if (data.date !== hoy) {
                // Token expirado (día diferente)
                localStorage.removeItem('tk-access-token');
                localStorage.removeItem('tk-access-granted');
                this.redirectToPortal();
                return false;
            }

            return true;
        } catch (e) {
            this.redirectToPortal();
            return false;
        }
    }
};

// Exponer globalmente
window.TOKEN_SERVER = TOKEN_SERVER;

// ===== SISTEMA GATE - Sin redirecciones automáticas =====
(function () {
    const TOKEN_KEY = 'tk_token_v1';

    function getFechaHoy() {
        return new Date().toDateString();
    }

    function hayTokenValido() {
        const datos = localStorage.getItem(TOKEN_KEY);
        if (!datos) return false;
        try {
            const t = JSON.parse(datos);
            return t.fecha === getFechaHoy() && t.ok === true;
        } catch (e) {
            return false;
        }
    }

    // Solo actuar en tk-ocean
    if (!location.pathname.includes('/tk-ocean/')) return;

    // Si NO hay token válido, mostrar gate (bloqueo) en lugar de redirigir
    if (!hayTokenValido()) {
        console.log('[GATE] Sin acceso. Mostrando portal de verificación.');

        // Crear overlay de gate
        const gateOverlay = document.createElement('div');
        gateOverlay.id = 'tk-gate-overlay';
        gateOverlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-family: 'Segoe UI', sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="
                    background: rgba(255,255,255,0.05);
                    border: 2px solid #00d4ff;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 500px;
                    box-shadow: 0 0 50px rgba(0, 212, 255, 0.3);
                ">
                    <i class="fas fa-lock" style="font-size: 4rem; color: #00d4ff; margin-bottom: 20px;"></i>
                    <h1 style="font-size: 2rem; margin-bottom: 15px; background: linear-gradient(135deg, #00d4ff, #7b2cbf); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ACCESO RESTRINGIDO</h1>
                    <p style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 30px;">Para acceder a TK-OCEAN debes completar una misión en el portal de acceso.</p>
                    
                    <div style="background: rgba(255,215,0,0.1); border: 1px solid #ffd700; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
                        <p style="margin: 0; color: #ffd700;"><i class="fas fa-info-circle"></i> <strong>¿Por qué esto?</strong></p>
                        <p style="margin: 10px 0 0 0; font-size: 0.9rem; opacity: 0.7;">Las misiones nos ayudan a mantener el servidor gratuito para todos.</p>
                    </div>
                    
                    <button onclick="window.location.href='/token/index.html'" style="
                        background: linear-gradient(135deg, #00ff88, #00d4ff);
                        color: #000;
                        border: none;
                        padding: 15px 40px;
                        border-radius: 30px;
                        font-size: 1.1rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: transform 0.3s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-ticket-alt"></i> IR AL PORTAL DE ACCESO
                    </button>
                    
                    <p style="margin-top: 20px; font-size: 0.8rem; opacity: 0.5;">Una vez completes una misión, podrás acceder a todo el contenido.</p>
                </div>
            </div>
        `;

        // Agregar al body cuando esté listo
        if (document.body) {
            document.body.appendChild(gateOverlay);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(gateOverlay);
            });
        }
    } else {
        console.log('[GATE] Token válido. Acceso permitido.');
    }
})();