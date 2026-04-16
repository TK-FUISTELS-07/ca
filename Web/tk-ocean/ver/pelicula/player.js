// Player Controller - TK-OCEAN - Green Edition (Clean)
(function () {
    'use strict';

    // === Variables ===
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sid');

    let allSources = [];
    let currentIndex = 0;
    let inactivityTimer;
    let isHeaderVisible = true;
    const INACTIVITY_DELAY = 3000;
    const HEADER_HIDE_DELAY = 800;
    const HEADER_SHOW_DELAY = 200;

    // === DOM Elements ===
    const frame = document.getElementById('video-frame');
    const loader = document.getElementById('loader');
    const error = document.getElementById('error');
    const header = document.getElementById('header');
    const btnErrorNext = document.getElementById('btn-error-next');
    const titleElement = document.getElementById('movie-title');
    const mouseOverlay = document.getElementById('mouseOverlay');

    const currentMovie = JSON.parse(
        localStorage.getItem('ocean_current_pelicula') ||
        localStorage.getItem('ocean_current_movie') ||
        '{}'
    );

    // === Leer datos del storage ===
    function loadSourcesFromStorage() {
        if (!sessionId) return [];

        // Intentar múltiples claves de storage (pelicula primero, luego movie)
        const storageKeys = [
            'ocean_pelicula_' + sessionId,
            'ocean_movie_' + sessionId
        ];

        for (const key of storageKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const wrapper = JSON.parse(stored);
                    if (wrapper.data && wrapper.data.sources) return wrapper.data.sources;
                    if (wrapper.sources) return wrapper.sources;
                } catch (e) {
                }
            }
        }
        return [];
    }

    // === Filtrar solo enlaces embed válidos ===
    function filterValidSources(urls) {
        // Usar filtro centralizado de CONFIG si está disponible
        if (typeof CONFIG !== 'undefined' && CONFIG.utils && CONFIG.utils.filterEmbedLinks) {
            return CONFIG.utils.filterEmbedLinks(urls);
        }
        // Fallback a filtro local
        const validDomains = ['minochinos.com/embed/', 'dintezuvio.com/embed/'];
        return urls.filter(url => {
            if (!url || typeof url !== 'string') return false;
            return validDomains.some(domain => url.includes(domain));
        });
    }

    // === Convertir a URLs proxy ===
    function convertToProxyUrls(urls) {
        if (typeof CONFIG !== 'undefined' && CONFIG.utils && CONFIG.utils.getStreamUrl) {
            return urls.map(url => CONFIG.utils.getStreamUrl(url));
        }
        const watcherUrl = (typeof API_WATCHER_URL !== 'undefined') ? API_WATCHER_URL : `${window.location.protocol}//${window.location.hostname}:5002`;
        return urls.map(url => `${watcherUrl}/stream_proxy?url=${encodeURIComponent(url)}`);
    }

    // === Header Auto-Hide/Show Mejorado ===
    function initHeaderBehavior() {
        header.style.transition = `transform ${HEADER_HIDE_DELAY}ms ease, opacity ${HEADER_HIDE_DELAY}ms ease`;

        function showHeader() {
            if (!isHeaderVisible) {
                header.style.transition = `transform ${HEADER_SHOW_DELAY}ms ease, opacity ${HEADER_SHOW_DELAY}ms ease`;
                header.style.transform = 'translateY(0)';
                header.style.opacity = '1';
                isHeaderVisible = true;
            }
            resetInactivityTimer();
        }

        function hideHeader() {
            if (isHeaderVisible && !header.matches(':hover')) {
                header.style.transition = `transform ${HEADER_HIDE_DELAY}ms ease, opacity ${HEADER_HIDE_DELAY}ms ease`;
                header.style.transform = 'translateY(-100%)';
                header.style.opacity = '0';
                isHeaderVisible = false;
            }
        }

        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(hideHeader, INACTIVITY_DELAY);
        }

        // Eventos en el documento
        ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, showHeader);
        });

        // Eventos específicos en el overlay (captura sobre iframe)
        if (mouseOverlay) {
            mouseOverlay.addEventListener('mousemove', (e) => {
                // Solo mostrar si está en la zona superior
                if (e.clientY < 150) {
                    showHeader();
                }
            });
            mouseOverlay.addEventListener('click', showHeader);
        }

        // Evento en el header mismo
        header.addEventListener('mouseenter', showHeader);
        header.addEventListener('mouseleave', resetInactivityTimer);

        showHeader();
    }

    // === Cargar video ===
    function loadSource(index) {
        if (index < 0 || index >= allSources.length) return;

        currentIndex = index;
        loader.classList.remove('hidden');
        error.classList.remove('active');

        frame.src = allSources[index];
        frame.onload = () => loader.classList.add('hidden');
        frame.onerror = showError;

        setTimeout(() => {
            if (!loader.classList.contains('hidden')) showError();
        }, 15000);
    }

    function showError() {
        loader.classList.add('hidden');
        error.classList.add('active');
        if (btnErrorNext && allSources.length > 1) btnErrorNext.style.display = 'inline-flex';
    }

    // === Global Functions ===
    window.nextSource = function () {
        currentIndex = (currentIndex + 1) % allSources.length;
        loadSource(currentIndex);
    };

    window.retryCurrent = function () {
        loadSource(currentIndex);
    };

    window.goBack = function () {
        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.BASE_URL) ? CONFIG.BASE_URL : '';
        if (currentMovie.slug) {
            const detailUrl = `/${baseUrl}/detalle/detalles-peliculas/?tipo=pelicula&slug=${encodeURIComponent(currentMovie.slug)}`.replace(/\/+/g, '/');
            window.location.href = detailUrl;
        } else {
            window.history.back();
        }
    };

    // === Init ===
    function init() {
        if (currentMovie.title && titleElement) {
            titleElement.textContent = currentMovie.title;
            document.title = currentMovie.title + ' - Nucleo-G';
        }

        initHeaderBehavior();

        const rawSources = loadSourcesFromStorage();
        const validSources = filterValidSources(rawSources);
        allSources = convertToProxyUrls(validSources);

        if (allSources.length > 0) {
            loadSource(0);
        } else {
            loader.classList.add('hidden');
            error.classList.add('active');
        }
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

    // === Debug Panel Functions ===
    window.toggleDebugPanel = function () {
        const panel = document.getElementById('debugPanel');
        if (panel) {
            panel.classList.toggle('active');
            if (panel.classList.contains('active')) {
                mostrarJSONDebug();
            }
        }
    };

    function mostrarJSONDebug() {
        const debugContent = document.getElementById('debugContent');
        if (!debugContent) return;

        // Obtener datos de storage
        let storedData = null;
        if (sessionId) {
            const key1 = 'ocean_movie_' + sessionId;
            const key2 = 'ocean_pelicula_' + sessionId;
            const raw = localStorage.getItem(key1) || localStorage.getItem(key2);
            if (raw) {
                try { storedData = JSON.parse(raw); } catch (e) { }
            }
        }

        const dataToShow = {
            sessionId: sessionId,
            currentMovie: currentMovie,
            allSources: allSources,
            currentSourceIndex: currentIndex,
            storedData: storedData,
            localStorage: {
                ocean_current_movie: localStorage.getItem('ocean_current_movie'),
                ocean_current_pelicula: localStorage.getItem('ocean_current_pelicula')
            }
        };

        debugContent.textContent = JSON.stringify(dataToShow, null, 2);
    }
})();
