// Detalles Series - TK-OCEAN
// Carga contenido del mirror y configura navegación de temporadas/episodios

async function cargarContenido() {
    const main = document.querySelector('main');

    // Verificar que CONFIG esté cargado
    if (typeof CONFIG === 'undefined' || !CONFIG.PORT_BRIDGE) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: Configuración no cargada</h1><p class="text-gray-400 mt-2">Recarga la página</p></div>`;
        console.error('[DETALLES-SERIES] CONFIG no está definido');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug') || urlParams.get('id');
    let tipo = urlParams.get('tipo') || 'serie';

    if (!slug) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: No se especificó contenido.</h1></div>`;
        return;
    }

    // Redirigir si es URL de episodio específico a la página de capítulos
    if (slug.includes('/temporada/') && slug.includes('/capitulo/')) {
        let fullSlug;
        if (slug.startsWith(tipo + '/')) {
            fullSlug = slug;
        } else {
            fullSlug = tipo + '/' + slug;
        }

        const redirectUrl = `./capitulos/?tipo=${encodeURIComponent(tipo)}&slug=${encodeURIComponent(fullSlug)}`;
        window.location.href = redirectUrl;
        return;
    }

    try {
        // Limpiar slug
        let cleanSlug = slug.replace(/https?:\/\/[^\/]+\//, '').replace(/^\//, '');
        if (cleanSlug.startsWith(tipo + '/')) {
            cleanSlug = cleanSlug.replace(tipo + '/', '');
        }

        // Construir URL completa del mirror
        const apiUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${cleanSlug}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Buscar el contenido principal en múltiples selectores posibles
        let contenidoMirror = doc.querySelector('main');
        if (!contenidoMirror) {
            contenidoMirror = doc.querySelector('body');
        }
        if (!contenidoMirror) {
            contenidoMirror = doc.querySelector('.container');
        }

        if (contenidoMirror) {
            main.className = "lg:ml-64 container mx-auto px-6 py-8 flex-1";
            main.innerHTML = contenidoMirror.innerHTML;

            // Aplicar mejoras
            aplicarMejorasVisuales();
            inyectarControlesOcean(tipo, cleanSlug);
            corregirEnlacesMirror(tipo, cleanSlug);
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

        // 1. Insertar botón VER AHORA justo después del H1 (como en películas)
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

        // Episodios específicos (temporada/X/capitulo/Y) → ir a página de capítulos
        if (cleanPath.includes('/temporada/') && cleanPath.includes('/capitulo/')) {
            const linkTipo = cleanPath.split('/')[0]; // serie, anime, dorama
            // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
            const tipoNormalizado = linkTipo === 'dorama' ? 'serie' : linkTipo;
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-series/capitulos/?tipo=${encodeURIComponent(tipoNormalizado)}&slug=${encodeURIComponent(cleanPath)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Series/Animes/Doramas página principal
        else if (cleanPath.startsWith('serie/') || cleanPath.startsWith('anime/') || cleanPath.startsWith('dorama/')) {
            const linkTipo = cleanPath.split('/')[0];
            // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
            const tipoNormalizado = linkTipo === 'dorama' ? 'serie' : linkTipo;
            const linkSlug = cleanPath.replace(`${linkTipo}/`, '');
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-series/?tipo=${tipoNormalizado}&slug=${encodeURIComponent(linkSlug)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Películas → ir a detalles-peliculas
        else if (cleanPath.startsWith('pelicula/')) {
            const linkSlug = cleanPath.replace('pelicula/', '');
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/?tipo=pelicula&slug=${encodeURIComponent(linkSlug)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Géneros
        else if (cleanPath.startsWith('generos/')) {
            const genero = cleanPath.replace('generos/', '');
            link.href = `/${CONFIG.BASE_URL}genero/?v=${encodeURIComponent(genero)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Años
        else if (cleanPath.startsWith('year/')) {
            const year = cleanPath.replace('year/', '');
            link.href = `/${CONFIG.BASE_URL}anos/?year=${encodeURIComponent(year)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Páginas de catálogo
        else if (cleanPath.startsWith('series') || cleanPath.startsWith('animes') || cleanPath.startsWith('peliculas') || cleanPath.startsWith('generos')) {
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
window.reportarFallo = async (slug, tipo = 'serie') => {
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

                CONFIG.utils.saveToStorage('ocean_regenerated_series_' + slug, {
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
window.abrirBridge = (slug, tipo = 'serie') => {
    const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${tipo}/${slug}`;
    window.open(bridgeUrl, '_blank');
};

// Función para obtener estructura de temporadas desde el HTML
async function obtenerEstructuraTemporadas(tipo, slug) {
    try {
        const response = await fetch(`${CONFIG.PORT_BRIDGE}/${tipo}/${slug}`);
        if (!response.ok) return [];

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const temporadas = [];
        let botonesTemporada = doc.querySelectorAll('.tk-btn-temporada');

        if (botonesTemporada.length === 0) {
            botonesTemporada = doc.querySelectorAll('button[data-temporada], button[onclick*="temporada"], .temporada-btn, .season-btn');
        }
        if (botonesTemporada.length === 0) {
            const allButtons = doc.querySelectorAll('button');
            botonesTemporada = Array.from(allButtons).filter(btn =>
                btn.textContent.match(/temporada\s*\d+/i)
            );
        }

        botonesTemporada.forEach((btn, index) => {
            const tempMatch = btn.textContent.match(/temporada\s*(\d+)/i) ||
                btn.getAttribute('data-temporada') ||
                (index + 1);
            const tempNum = typeof tempMatch === 'string' ? parseInt(tempMatch) : (tempMatch[1] || index + 1);

            let capitulosCount = 0;
            const tempId = btn.getAttribute('data-temporada') || tempNum;

            // PRIORIDAD 1: Buscar número en el texto del botón (ej: "823 episodios")
            const textMatch = btn.textContent.match(/(\d{2,})\s*(?:episodios?|ep|caps?|capítulos?)/i) ||
                btn.textContent.match(/[\[(](\d{2,})[\])]/);
            if (textMatch) {
                capitulosCount = parseInt(textMatch[1]);
            }

            // PRIORIDAD 2: Buscar en contenedor específico de capítulos
            if (capitulosCount === 0) {
                const capsContainer = doc.querySelector(`#temporada-${tempId}-capitulos, [data-temporada-capitulos="${tempId}"], .capitulos-temporada-${tempId}`);
                if (capsContainer) {
                    const capitulosLinks = capsContainer.querySelectorAll('a[href*="/capitulo/"], button[onclick*="capitulo"]');
                    capitulosCount = capitulosLinks.length;
                }
            }

            // PRIORIDAD 3: Contar todos los links de capítulos de esta temporada en todo el documento
            if (capitulosCount === 0) {
                const allCapLinks = doc.querySelectorAll(`a[href*="temporada/${tempNum}/capitulo/"]`);
                capitulosCount = allCapLinks.length;
            }

            // Fallback: si aún es 0, usar default de 100 (no 24)
            if (capitulosCount === 0) capitulosCount = 100;

            temporadas.push({
                numero: parseInt(tempNum),
                titulo: btn.textContent.trim() || `Temporada ${tempNum}`,
                totalCapitulos: capitulosCount,
                id: parseInt(tempNum) - 1
            });
        });

        if (temporadas.length === 0) {
            temporadas.push({ numero: 1, titulo: 'Temporada 1', totalCapitulos: 24, id: 0 });
        }

        return temporadas.sort((a, b) => a.numero - b.numero);
    } catch (e) {
        return [{ numero: 1, titulo: 'Temporada 1', totalCapitulos: 24, id: 0 }];
    }
}

// Función para precargar capítulos
async function precargarCapitulosDesdeDetalle(capitulosACargar) {
    const capitulosPrecargados = [];
    for (const capInfo of capitulosACargar) {
        try {
            const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${capInfo.fullSlug}?bridge_action=extract`;
            const response = await fetch(bridgeUrl);
            if (!response.ok) continue;

            const data = await response.json();
            if (data.status === 'success' && data.links && data.links.length > 0) {
                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                const processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));
                capitulosPrecargados.push({
                    season: capInfo.temporada,
                    numero: capInfo.capitulo,
                    fullSlug: capInfo.fullSlug,
                    links: processedLinks
                });
            }
        } catch (e) { }
    }
    return capitulosPrecargados;
}

// ACTIVAR REPRODUCCIÓN - Con precarga completa de temporadas y capítulos
// Cuando se llama sin temp/cap (botón VER), encuentra el primer capítulo disponible
// Cuando se llama con temp/cap (botones de capítulos), reproduce ese específico
window.activarReproduccion = async (slug, temporadaNum = null, capituloNum = null) => {
    const btnPlay = document.querySelector('button[data-action="ver"]');

    // Determinar slug
    let targetSlug = slug;
    if (!targetSlug || typeof targetSlug !== 'string') {
        const urlParams = new URLSearchParams(window.location.search);
        targetSlug = urlParams.get('slug') || urlParams.get('id');
    }

    if (!targetSlug) {
        alert('Error: No se pudo determinar la serie');
        return;
    }

    // Mostrar loader
    if (btnPlay) {
        btnPlay.style.opacity = '0.7';
        btnPlay.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cargando...';
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tipo = urlParams.get('tipo') || 'serie';


        // Limpiar slug si viene con el tipo incluido
        if (targetSlug.startsWith(tipo + '/')) {
            targetSlug = targetSlug.replace(tipo + '/', '');
        }

        // 1. OBTENER ESTRUCTURA DE TEMPORADAS
        const temporadas = await obtenerEstructuraTemporadas(tipo, targetSlug);

        if (!temporadas || temporadas.length === 0) {
            throw new Error('No se encontraron temporadas disponibles');
        }

        // Determinar temporada y capítulo objetivo
        let targetTemp, targetCap;

        if (temporadaNum !== null && capituloNum !== null) {
            // Modo específico: reproducir el capítulo solicitado
            targetTemp = parseInt(temporadaNum);
            targetCap = parseInt(capituloNum);
        } else {
            // Modo automático: encontrar el primer capítulo disponible
            // Ordenar temporadas por número
            temporadas.sort((a, b) => a.numero - b.numero);

            // Tomar la primera temporada
            const firstTemp = temporadas[0];
            targetTemp = firstTemp.numero;
            targetCap = 1; // Primer capítulo de la primera temporada

        }

        // Verificar que la temporada existe
        const tempData = temporadas.find(t => t.numero === targetTemp);
        if (!tempData) {
            throw new Error(`Temporada ${targetTemp} no encontrada`);
        }

        // Verificar que el capítulo está dentro del rango
        if (targetCap > tempData.totalCapitulos) {
            targetCap = tempData.totalCapitulos; // Usar último capítulo si excede
        }

        // 2. CONSTRUIR fullSlug DEL CAPÍTULO SELECCIONADO
        const fullSlug = `${tipo}/${targetSlug}/temporada/${targetTemp}/capitulo/${targetCap}`;

        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;
        const response = await fetch(bridgeApiUrl);

        if (!response.ok) throw new Error(`Bridge error: ${response.status}`);

        const bridgeData = await response.json();
        if (bridgeData.status !== 'success' || !bridgeData.links || bridgeData.links.length === 0) {
            throw new Error(bridgeData.msg || 'No se encontraron enlaces');
        }

        const title = document.querySelector('h1')?.textContent || targetSlug;
        const poster = document.querySelector('img[src*="tmdb.org"]')?.src || '';
        const filteredLinks = CONFIG.utils.filterEmbedLinks(bridgeData.links);
        const processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));

        // Precargar 4 siguientes DESDE el capítulo actual
        const capitulosACargar = [];
        const tempActual = temporadas.find(t => t.numero === targetTemp);
        const totalCapsActual = tempActual?.totalCapitulos || 24;

        for (let i = 1; i <= 4; i++) {
            const capNum = targetCap + i;
            if (capNum <= totalCapsActual) {
                capitulosACargar.push({
                    temporada: targetTemp,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${targetSlug}/temporada/${targetTemp}/capitulo/${capNum}`
                });
            } else {
                // Pasar a siguiente temporada
                const nextTemp = temporadas.find(t => t.numero === targetTemp + 1);
                if (nextTemp) {
                    const capNextTemp = capNum - totalCapsActual;
                    if (capNextTemp <= nextTemp.totalCapitulos) {
                        capitulosACargar.push({
                            temporada: targetTemp + 1,
                            capitulo: capNextTemp,
                            fullSlug: `${tipo}/${targetSlug}/temporada/${targetTemp + 1}/capitulo/${capNextTemp}`
                        });
                    }
                }
            }
        }

        const capitulosPrecargados = await precargarCapitulosDesdeDetalle(capitulosACargar);
        // Construir seasonsData
        const seasonsData = {
            currentSeason: targetTemp - 1,
            allSeasons: temporadas.map(t => ({
                id: t.id,
                titulo: t.titulo,
                cantidad: `${t.totalCapitulos} episodios`,
                totalCapitulos: t.totalCapitulos,
                capitulos: Array.from({ length: t.totalCapitulos }, (_, i) => {
                    const capNum = i + 1;
                    const esActual = t.numero === targetTemp && capNum === targetCap;
                    const precargado = capitulosPrecargados.find(c => c.season === t.numero && c.numero === capNum);
                    return {
                        numero: capNum,
                        displayNum: `E${capNum}`,
                        titulo: `Capítulo ${capNum}`,
                        fullSlug: `${tipo}/${targetSlug}/temporada/${t.numero}/capitulo/${capNum}`,
                        loaded: esActual || !!precargado,
                        links: esActual ? processedLinks : (precargado?.links || [])
                    };
                })
            }))
        };

        const nextEpData = capitulosPrecargados.find(c => c.season === targetTemp && c.numero === (targetCap + 1)) ||
            capitulosPrecargados[0] || null;

        // Construir estructura JSON uniforme
        const estructura = {
            seasons: temporadas.map(t => t.numero),
            episodes: {}
        };
        temporadas.forEach(t => {
            estructura.episodes[`season_${t.numero}`] = Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);
        });

        const sessionId = CONFIG.utils.generateSessionId();


        const playerData = {
            sources: processedLinks,
            serie: { title, slug: targetSlug, type: tipo, season: targetTemp, episode: targetCap, poster },
            nextEpisode: nextEpData ? {
                slug: targetSlug,
                season: nextEpData.season,
                episode: nextEpData.numero,
                type: tipo,
                fullSlug: nextEpData.fullSlug,
                links: nextEpData.links
            } : null,
            prevEpisode: null,
            capitulosPrecargados: capitulosPrecargados || [],
            capitulosAnteriores: [],
            seasonsData: seasonsData || null,
            estructura: estructura || null
        };

        CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);
        localStorage.setItem('ocean_current_serie', JSON.stringify({ title, slug: targetSlug, type: tipo, poster }));
        localStorage.setItem('ocean_current_episode', JSON.stringify({ tipo, slug: targetSlug, temporada: targetTemp, capitulo: targetCap, fullSlug, title: title || `Capítulo ${targetCap}` }));

        const playerUrl = `/${CONFIG.BASE_URL}/ver/serie/?sid=${sessionId}`.replace(/\/+/g, '/');
        window.location.href = playerUrl;

    } catch (error) {
        console.error('[DETALLES] Error:', error);
        alert(`❌ ${error.message}`);
        if (btnPlay) {
            btnPlay.style.opacity = '1';
            btnPlay.innerHTML = '<i class="fas fa-play mr-2"></i> VER AHORA';
        }
    }
};

// Función para botones de capítulos - CON LÓGICA COMPLETA INTEGRADA
window.reproducirCapituloDirectoDesdeCard = async function (event, url, tempIndex, episodeCode, title) {

    event.preventDefault();
    event.stopPropagation();

    // Extraer parámetros de la URL
    const urlObj = new URL(url, window.location.origin);
    const params = new URLSearchParams(urlObj.search);
    const tipo = params.get('tipo') || 'serie';
    const slugEncoded = params.get('slug') || '';
    const fullSlug = decodeURIComponent(slugEncoded);


    // Extraer slug, temporada y capítulo
    let serieSlug;
    let temporada, capitulo;

    if (fullSlug.includes('/temporada/') && fullSlug.includes('/capitulo/')) {
        const parts = fullSlug.split('/');
        const tipoIndex = parts.indexOf(tipo);
        const tempIndexInParts = parts.indexOf('temporada');
        const capIndexInParts = parts.indexOf('capitulo');

        if (tipoIndex > -1) {
            serieSlug = parts.slice(tipoIndex + 1, tempIndexInParts).join('/');
        } else {
            serieSlug = parts[0];
        }

        temporada = parseInt(parts[tempIndexInParts + 1]);
        capitulo = parseInt(parts[capIndexInParts + 1]);
    } else {
        serieSlug = fullSlug.replace(/^anime\//, '').replace(/^serie\//, '');
        temporada = parseInt(tempIndex) + 1;
        capitulo = parseInt(episodeCode.replace('E', ''));
    }


    // Mostrar loader
    const card = event.currentTarget;
    const originalContent = card.innerHTML;
    card.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#00d4ff;"></i></div>';

    try {
        // 1. OBTENER TEMPORADAS
        const temporadas = await obtenerEstructuraTemporadas(tipo, serieSlug);

        if (!temporadas || temporadas.length === 0) {
            throw new Error('No se encontraron temporadas');
        }

        // 2. OBTENER ENLACES DEL CAPÍTULO
        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;

        const response = await fetch(bridgeApiUrl);
        if (!response.ok) throw new Error(`Bridge error: ${response.status}`);

        const data = await response.json();
        if (data.status !== 'success' || !data.links || data.links.length === 0) {
            throw new Error('No se encontraron enlaces');
        }

        // 3. PROCESAR ENLACES
        const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
        const processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));

        // 4. PRECARGAR 4 SIGUIENTES
        const capitulosACargar = [];
        const tempActual = temporadas.find(t => t.numero === temporada);
        const totalCaps = tempActual?.totalCapitulos || 24;

        for (let i = 1; i <= 4; i++) {
            const capNum = capitulo + i;
            if (capNum <= totalCaps) {
                capitulosACargar.push({
                    temporada,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${capNum}`
                });
            }
        }

        const capitulosPrecargados = await precargarCapitulosDesdeDetalle(capitulosACargar);

        // 5. CONSTRUIR SEASONSDATA
        const seasonsData = {
            currentSeason: temporada - 1,
            allSeasons: temporadas.map(t => {
                const eps = Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);
                return {
                    id: t.numero - 1,
                    titulo: t.titulo || `Temporada ${t.numero}`,
                    cantidad: `${eps.length} episodios`,
                    totalCapitulos: t.totalCapitulos || eps.length,
                    capitulos: eps.map(capNum => {
                        const esActual = t.numero === temporada && capNum === capitulo;
                        const precargado = capitulosPrecargados.find(c => c.season === t.numero && c.numero === capNum);
                        return {
                            numero: capNum,
                            displayNum: `E${capNum}`,
                            titulo: esActual && title ? title : `Capítulo ${capNum}`,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${t.numero}/capitulo/${capNum}`,
                            loaded: esActual || !!precargado,
                            links: esActual ? processedLinks : (precargado?.links || [])
                        };
                    })
                };
            })
        };

        // 6. CONSTRUIR ESTRUCTURA
        const estructura = {
            seasons: temporadas.map(t => t.numero),
            episodes: {}
        };
        temporadas.forEach(t => {
            estructura.episodes[`season_${t.numero}`] = Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);
        });

        // 7. CONSTRUIR PLAYERDATA COMPLETO
        const serieTitle = document.querySelector('h1')?.textContent || serieSlug;
        const poster = document.querySelector('img[src*="tmdb.org"]')?.src || '';
        const nextEp = capitulosPrecargados[0];

        const sessionId = CONFIG.utils.generateSessionId();
        const playerData = {
            sources: processedLinks,
            serie: {
                title: serieTitle,
                slug: serieSlug,
                type: tipo,
                season: temporada,
                episode: capitulo,
                poster: poster
            },
            nextEpisode: nextEp ? {
                slug: serieSlug,
                season: nextEp.season,
                episode: nextEp.numero,
                type: tipo,
                fullSlug: nextEp.fullSlug,
                links: nextEp.links
            } : null,
            prevEpisode: null,
            capitulosPrecargados: capitulosPrecargados || [],
            capitulosAnteriores: [],
            seasonsData: seasonsData,
            estructura: estructura
        };


        // 8. GUARDAR Y REDIRIGIR
        CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);
        localStorage.setItem('ocean_current_serie', JSON.stringify({
            title: serieTitle, slug: serieSlug, type: tipo, poster
        }));

        const playerUrl = `/${CONFIG.BASE_URL}/ver/serie/?sid=${sessionId}`.replace(/\/+/g, '/');
        window.location.href = playerUrl;

    } catch (error) {
        console.error('[DETALLES-CARD] Error:', error);
        alert(`❌ ${error.message}`);
        card.innerHTML = originalContent;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', cargarContenido);
