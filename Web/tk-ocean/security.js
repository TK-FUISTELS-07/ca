/**
 * TK-OCEAN SECURITY MODULE
 * Sistema de validación de tokens y protección anti-acceso directo
 */

(function() {
    'use strict';

    // ===== CONFIGURACIÓN DE SEGURIDAD =====
    const SECURITY_CONFIG = {
        // Token debe venir de la URL o estar validado
        TOKEN_PARAM: 'token',
        ACCESS_PARAM: 'access',
        
        // Horario de reinicio (4 AM Bolivia = UTC-4)
        RESET_HOUR_BO: 4,
        RESET_MINUTE_BO: 0,
        
        // Patrón de token válido: TK-YYYYMMDD-XXXX-XXXX-XXXXXX
        TOKEN_REGEX: /^TK-\d{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{6}$/,
        
        // Clave de acceso (adicional al token, ofuscada)
        ACCESS_KEY: atob('b2NlYW4xMTIyMDkyMXRr') // "ocean11220921tk" en base64
    };

    // ===== UTILIDADES DE FECHA/HORA =====
    function getBoliviaTime() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc - (4 * 3600000)); // UTC-4
    }

    function getTodayString() {
        const boTime = getBoliviaTime();
        return boTime.toISOString().split('T')[0].replace(/-/g, '');
    }

    function shouldReset() {
        const boTime = getBoliviaTime();
        const lastAccess = localStorage.getItem('tk-last-valid-access');
        
        if (!lastAccess) return true;
        
        const lastDate = new Date(lastAccess);
        const lastDay = lastDate.toISOString().split('T')[0];
        const today = boTime.toISOString().split('T')[0];
        
        // Si es día diferente
        if (today !== lastDay) return true;
        
        // Si pasó la hora de reinicio y no se ha reseteado
        if (boTime.getHours() >= SECURITY_CONFIG.RESET_HOUR_BO && 
            lastDate.getHours() < SECURITY_CONFIG.RESET_HOUR_BO) {
            return true;
        }
        
        return false;
    }

    // ===== VALIDACIÓN DE TOKEN =====
    function validateToken(token) {
        if (!token || typeof token !== 'string') {
            return { valid: false, reason: 'Token no proporcionado' };
        }

        // Verificar formato
        if (!SECURITY_CONFIG.TOKEN_REGEX.test(token)) {
            return { valid: false, reason: 'Formato de token inválido' };
        }

        // Extraer fecha del token (TK-YYYYMMDD-...)
        const tokenDate = token.split('-')[1];
        const today = getTodayString();

        if (tokenDate !== today) {
            return { valid: false, reason: 'Token expirado (día diferente)' };
        }

        // Verificar que no haya sido revocado
        const revokedTokens = JSON.parse(localStorage.getItem('tk-revoked-tokens') || '[]');
        if (revokedTokens.includes(token)) {
            return { valid: false, reason: 'Token revocado' };
        }

        return { valid: true, token: token };
    }

    // ===== VERIFICACIÓN DE ACCESO =====
    function verifyAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get(SECURITY_CONFIG.TOKEN_PARAM);
        const access = urlParams.get(SECURITY_CONFIG.ACCESS_PARAM);

        // Verificar si debe resetear
        if (shouldReset()) {
            clearAccessData();
            redirectToPortal('Sesión expirada (reinicio diario 4 AM BO)');
            return false;
        }

        // Si hay token en URL, validarlo
        if (urlToken) {
            const validation = validateToken(urlToken);
            
            if (validation.valid) {
                // Token válido, guardar y permitir acceso
                saveValidAccess(urlToken);
                return true;
            } else {
                // Token inválido
                redirectToPortal(validation.reason);
                return false;
            }
        }

        // Verificar si hay token guardado
        const savedToken = getSavedToken();
        if (savedToken) {
            const validation = validateToken(savedToken);
            
            if (validation.valid) {
                // Actualizar URL con el token (para compartir/refresh)
                updateUrlWithToken(savedToken);
                return true;
            } else {
                // Token guardado inválido o expirado
                clearAccessData();
                redirectToPortal(validation.reason);
                return false;
            }
        }

        // No hay token válido
        redirectToPortal('Acceso no autorizado - Se requiere token válido');
        return false;
    }

    // ===== GUARDAR/RECUPERAR TOKEN =====
    function saveValidAccess(token) {
        const boTime = getBoliviaTime();
        localStorage.setItem('tk-access-token', token);
        localStorage.setItem('tk-last-valid-access', boTime.toISOString());
        localStorage.setItem('tk-access-granted', 'true');
        
        // Guardar también el tiempo de expiración
        const expiry = new Date(boTime);
        expiry.setHours(SECURITY_CONFIG.RESET_HOUR_BO, 0, 0, 0);
        if (boTime >= expiry) {
            expiry.setDate(expiry.getDate() + 1);
        }
        localStorage.setItem('tk-token-expiry', expiry.toISOString());
    }

    function getSavedToken() {
        return localStorage.getItem('tk-access-token');
    }

    function clearAccessData() {
        localStorage.removeItem('tk-access-token');
        localStorage.removeItem('tk-access-granted');
        localStorage.removeItem('tk-token-expiry');
    }

    // ===== REDIRECCIÓN =====
    function redirectToPortal(reason) {
        // Limpiar URL actual
        const cleanUrl = window.location.protocol + '//' + window.location.host + '/';
        
        // Guardar mensaje para mostrar en portal
        sessionStorage.setItem('tk-redirect-reason', reason);
        
        // Pequeño delay para evitar loops
        setTimeout(() => {
            window.location.href = cleanUrl + '?error=' + encodeURIComponent(reason);
        }, 100);
    }

    function updateUrlWithToken(token) {
        if (!window.history.replaceState) return;
        
        const url = new URL(window.location.href);
        url.searchParams.set(SECURITY_CONFIG.TOKEN_PARAM, token);
        url.searchParams.set(SECURITY_CONFIG.ACCESS_PARAM, 'granted');
        window.history.replaceState({}, '', url.toString());
    }

    // ===== PROTECCIÓN ANTI-DEBUG =====
    function antiDebug() {
        // Deshabilitar clic derecho (opcional, puedes quitar)
        // document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Detectar si se abre DevTools
        const threshold = 160;
        let lastWidth = window.outerWidth;
        let lastHeight = window.outerHeight;
        
        window.addEventListener('resize', () => {
            const widthDiff = Math.abs(window.outerWidth - lastWidth);
            const heightDiff = Math.abs(window.outerHeight - lastHeight);
            
            if (widthDiff > threshold || heightDiff > threshold) {
                // Posiblemente se abrió DevTools
                console.clear();
            }
            
            lastWidth = window.outerWidth;
            lastHeight = window.outerHeight;
        });

        // Ofuscar localStorage (mover token a variable temporal)
        const realToken = localStorage.getItem('tk-access-token');
        if (realToken) {
            window.__tk_secure_token = realToken;
            // No eliminar de localStorage, solo duplicar en memoria
        }
    }

    // ===== EXPIRACIÓN AUTOMÁTICA =====
    function setupAutoExpiry() {
        function checkExpiry() {
            const expiryStr = localStorage.getItem('tk-token-expiry');
            if (!expiryStr) return;
            
            const expiry = new Date(expiryStr);
            const boTime = getBoliviaTime();
            
            if (boTime >= expiry) {
                // Token expirado
                clearAccessData();
                redirectToPortal('Token expirado - Debes ver los anuncios nuevamente');
            }
        }
        
        // Verificar cada minuto
        setInterval(checkExpiry, 60000);
        
        // Verificar al cambiar de pestaña
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkExpiry();
            }
        });
    }

    // ===== INICIALIZACIÓN =====
    function init() {
        const path = window.location.pathname;
        const host = window.location.host;
        
        // Si estamos en el portal raíz (no en tk-ocean), no aplicar seguridad
        if (path === '/' || path === '/index.html' || !path.includes('/tk-ocean/')) {
            return;
        }
        
        // Estamos en /tk-ocean/ o CUALQUIER subruta (/peliculas, /series, /detalle, etc.)
        // Verificar token obligatoriamente
        if (!verifyAccess()) {
            return; // Redirigido al portal
        }
        
        // Inicializar protecciones adicionales
        antiDebug();
        setupAutoExpiry();
        
        console.log('[TK-SECURITY] Acceso verificado en:', path);
    }
    
    // ===== PROTECCIÓN DE RUTAS ESPECÍFICAS =====
    // DESACTIVADO - Verificación cada segundo causaba bucles infinitos
    // let lastPath = window.location.pathname;
    // setInterval(() => {
    //     const currentPath = window.location.pathname;
    //     if (currentPath !== lastPath && currentPath.includes('/tk-ocean/')) {
    //         lastPath = currentPath;
    //         const savedToken = getSavedToken();
    //         if (!savedToken || !validateToken(savedToken).valid) {
    //             redirectToPortal('Sesión expirada - Navegación detectada');
    //         }
    //     }
    // }, 1000);

    // DESACTIVADO - El sistema simplificado en config.js maneja la seguridad
    // init();
    
    // Limpiar tokens antiguos para evitar conflictos
    localStorage.removeItem('tk-access-token');
    localStorage.removeItem('tk-access-granted');
    localStorage.removeItem('tk-token-expiry');

    // Exponer funciones necesarias globalmente (opcional)
    window.TK_SECURITY = {
        verifyAccess: verifyAccess,
        validateToken: validateToken,
        getToken: getSavedToken,
        logout: function() {
            clearAccessData();
            window.location.href = '/';
        }
    };
})();
