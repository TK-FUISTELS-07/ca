// Detalles Contenido - TK-OCEAN
// Carga contenido del mirror y configura reproducción (peliculas, series, animes)

async function cargarContenido() {
    const main = document.querySelector('main');

    // Verificar que CONFIG esté cargado
    if (typeof CONFIG === 'undefined' || !CONFIG.PORT_BRIDGE) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: Configuración no cargada</h1><p class="text-gray-400 mt-2">Recarga la página</p></div>`;
        console.error('[DETALLES] CONFIG no está definido');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || urlParams.get('id');
    const tipo = urlParams.get('tipo') || 'pelicula';

    if (!slug) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: No se especificó contenido.</h1></div>`;
        return;
    }

    try {
        // Construir URL completa del mirror
        const apiUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${slug}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const contenidoMirror = doc.querySelector('main');

        if (contenidoMirror) {
            main.className = "movie-detail-container lg:ml-64";
            main.innerHTML = contenidoMirror.innerHTML;

            // Aplicar mejoras
            aplicarMejorasVisuales();
            inyectarControlesOcean(tipo, slug);
            corregirEnlacesMirror(tipo, slug);
            mejorarCalidadImagenes();

        } else {
            main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Contenido no encontrado en el mirror</h1></div>`;
        }

    } catch (error) {
        console.error("[OCEAN] Error:", error);
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error de conexión: ${error.message}</h1><p class="text-gray-400 mt-2">Verifica que el servidor esté en ${CONFIG.PORT_BRIDGE}</p></div>`;
    }
}

function aplicarMejorasVisuales() {
    // Usar el nuevo sistema de efectos de efectos-styles.js
    if (window.TKOceanDetailEffects) {
        // Reset primero para evitar duplicados
        window.TKOceanDetailEffects.reset();
        // Luego aplicar
        setTimeout(() => window.TKOceanDetailEffects.init(), 100);
    } else {
        // Fallback si el script de efectos no está cargado
        const cards = document.querySelectorAll('.movie-card, .similar-movie-card');
        cards.forEach(card => {
            card.classList.add('nova-card');
        });
    }
}

function inyectarControlesOcean(tipo, slug) {
    const headerInfo = document.querySelector('.flex-1.p-8') || document.querySelector('h1')?.parentElement;

    if (headerInfo) {
        const h1 = headerInfo.querySelector('h1');

        // 1. Insertar botón VER AHORA justo después del H1
        if (h1 && !headerInfo.querySelector('button[data-action="ver"]')) {
            const btnVer = document.createElement('button');
            btnVer.setAttribute('data-action', 'ver');
            btnVer.onclick = () => activarReproduccion(slug);
            btnVer.className = "btn-ver-ahora";
            btnVer.innerHTML = '<i class="fas fa-play mr-2"></i> VER AHORA';
            h1.parentNode.insertBefore(btnVer, h1.nextSibling);
        }

        // 2. Insertar botón REPORTAR FALLO al final del contenedor
        if (!headerInfo.querySelector('button[data-action="reportar"]')) {
            const btnReportar = document.createElement('button');
            btnReportar.setAttribute('data-action', 'reportar');
            btnReportar.onclick = () => reportarFallo(slug, tipo);
            btnReportar.className = "btn-reportar";
            btnReportar.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> REPORTAR FALLO';
            headerInfo.appendChild(btnReportar);
        }
    }
}

function corregirEnlacesMirror(tipoActual, slugActual) {
    // Seleccionar todos los enlaces que apuntan al servidor mirror
    const allLinks = document.querySelectorAll(`a[href*="${window.location.hostname}:5000"], a[href*="localhost:5000"]`);

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || link.hasAttribute('data-ocean-fixed')) return;

        // Extraer el path limpio de la URL del mirror
        let cleanPath = href.replace(/^https?:\/\/[^\/]+\//, '');

        // Determinar tipo y construir URL interna
        if (cleanPath.startsWith('pelicula/')) {
            const slug = cleanPath.replace('pelicula/', '');
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/?tipo=pelicula&slug=${encodeURIComponent(slug)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        } else if (cleanPath.startsWith('serie/') || cleanPath.startsWith('anime/') || cleanPath.startsWith('dorama/')) {
            const itemType = cleanPath.split('/')[0];
            // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
            const tipoNormalizado = itemType === 'dorama' ? 'serie' : itemType;
            const slug = cleanPath.replace(`${itemType}/`, '');
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-series/?tipo=${tipoNormalizado}&slug=${encodeURIComponent(slug)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        } else if (cleanPath.startsWith('generos/')) {
            const genero = cleanPath.replace('generos/', '');
            link.href = `/${CONFIG.BASE_URL}genero/?v=${encodeURIComponent(genero)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        } else if (cleanPath.startsWith('year/')) {
            const year = cleanPath.replace('year/', '');
            link.href = `/${CONFIG.BASE_URL}anos/?year=${encodeURIComponent(year)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        } else if (cleanPath.startsWith('series') || cleanPath.startsWith('animes') || cleanPath.startsWith('peliculas') || cleanPath.startsWith('generos')) {
            // Enlaces a páginas de catálogo
            link.href = `/${CONFIG.BASE_URL}${cleanPath}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Raíz del mirror (localhost:5000/) → ir al inicio
        else if (cleanPath === '' || cleanPath === '/') {
            link.href = `/${CONFIG.BASE_URL}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }

    });
}

function mejorarCalidadImagenes() {
    document.querySelectorAll('img[src*="tmdb.org"]').forEach(img => {
        if (img.src.includes('/w200/')) img.src = img.src.replace('/w200/', '/w500/');
        if (img.src.includes('/w154/')) img.src = img.src.replace('/w154/', '/w500/');
    });
}

// REPORTAR FALLO
window.reportarFallo = async (slug, tipo = 'pelicula') => {
    const reason = prompt("¿Cuál es el problema? (Ej: Link caído, Audio desfasado)");
    if (!reason) return;

    const btnReporte = document.querySelector('button[onclick*="reportarFallo"]');
    if (btnReporte) {
        btnReporte.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Regenerando...';
        btnReporte.disabled = true;
    }

    try {

        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${slug}?bridge_action=extract&force_extract=1`;
        const response = await fetch(bridgeApiUrl);

        if (response.ok) {
            const data = await response.json();

            if (data.status === 'success' && data.links && data.links.length > 0) {

                CONFIG.utils.saveToStorage('ocean_regenerated_' + tipo + '_' + slug, {
                    slug: slug,
                    tipo: tipo,
                    links: data.links,
                    timestamp: Date.now()
                }, 30);

                alert(`✅ ¡Enlaces regenerados!\\n\\nSe encontraron ${data.links.length} nuevos enlaces.`);
                return;
            }
        }

        alert(`⚠️ No se pudieron regenerar.\\n\\nSerás redirigido a Telegram.`);
        window.open(CONFIG.TELEGRAM_REPORTES, '_blank');

    } catch (e) {
        console.error("[OCEAN] Error:", e);
        alert(`❌ Error. Serás redirigido a Telegram.`);
        window.open(CONFIG.TELEGRAM_REPORTES, '_blank');

    } finally {
        if (btnReporte) {
            btnReporte.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> REPORTAR FALLO';
            btnReporte.disabled = false;
        }
    }
};

// ABRIR BRIDGE
window.abrirBridge = (slug, tipo = 'pelicula') => {
    const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${slug}`;
    window.open(bridgeUrl, '_blank');
};

// ACTIVAR REPRODUCCIÓN - Usa el bridge de mirror.go
window.activarReproduccion = async (slug) => {
    const btnPlay = document.querySelector('button[data-action="ver"]') || document.querySelector('button[onclick*="activarReproduccion"]');

    if (btnPlay) {
        btnPlay.style.opacity = '0.7';
        btnPlay.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cargando...';
    }

    try {
        // Obtener tipo actual
        const urlParams = new URLSearchParams(window.location.search);
        const tipo = urlParams.get('tipo') || 'pelicula';

        // Llamar al bridge API de mirror.go - retorna JSON: {links: [...], status: "success", msg: ""}
        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${slug}?bridge_action=extract`;


        const response = await fetch(bridgeApiUrl);
        if (!response.ok) throw new Error(`Bridge error: ${response.status}`);

        const bridgeData = await response.json();

        // Validar respuesta según mirror.go (líneas 439-443)
        if (bridgeData.status !== 'success' || !bridgeData.links || bridgeData.links.length === 0) {
            throw new Error(bridgeData.msg || 'No se encontraron enlaces');
        }

        // Extraer info de película de la página
        const title = document.querySelector('h1')?.textContent || slug;
        const poster = document.querySelector('img[src*="tmdb.org"]')?.src || '';

        // Guardar datos de contenido
        const contentData = {
            title: title,
            slug: slug,
            type: tipo,
            poster: poster
        };
        // Limpiar clave vieja 'movie' para evitar conflictos
        localStorage.removeItem('ocean_current_movie');
        localStorage.setItem('ocean_current_' + tipo, JSON.stringify(contentData));

        // Guardar datos de reproducción en storage (enlaces en formato JSON)
        // Filtrar solo enlaces embed
        const filteredLinks = CONFIG.utils.filterEmbedLinks(bridgeData.links);
        const sessionId = CONFIG.utils.generateSessionId();
        const playerData = {
            sources: filteredLinks,  // Array de URLs filtradas
            movie: contentData
        };
        CONFIG.utils.saveToStorage('ocean_' + tipo + '_' + sessionId, playerData, 120);

        // Redirigir al reproductor con sessionId
        const playerUrl = `/${CONFIG.BASE_URL}/ver/${tipo}/?sid=${sessionId}`.replace(/\/+/g, '/');
        window.location.href = playerUrl;

    } catch (error) {
        console.error("[OCEAN] Error:", error);
        alert(`${error.message}\\n\\nIntenta usar el botón REPORTAR FALLO.`);

        if (btnPlay) {
            btnPlay.style.opacity = '1';
            btnPlay.innerHTML = '<i class="fas fa-play mr-2"></i> VER AHORA';
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', cargarContenido);
