// Capítulos - TK-OCEAN
// Página de reproducción de episodios específicos

async function cargarCapitulo() {
    const main = document.querySelector('main');

    // Verificar que CONFIG esté cargado
    if (typeof CONFIG === 'undefined' || !CONFIG.PORT_BRIDGE) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: Configuración no cargada</h1><p class="text-gray-400 mt-2">Recarga la página</p></div>`;
        console.error('[CAPITULO] CONFIG no está definido');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');
    let tipo = urlParams.get('tipo') || 'serie';

    if (!slug) {
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error: No se especificó episodio.</h1></div>`;
        return;
    }

    try {
        // El slug ya viene con formato: tipo/slug/temporada/X/capitulo/Y
        // o slug/temporada/X/capitulo/Y (si viene sin tipo)
        let cleanSlug = slug;

        // Si no incluye el tipo al inicio, agregarlo
        if (!slug.startsWith(tipo + '/')) {
            cleanSlug = `${tipo}/${slug}`;
        }

        // Extraer info para localStorage
        const slugParts = cleanSlug.split('/');
        const serieSlug = slugParts[1]; // slug de la serie
        const tempIndex = slugParts.indexOf('temporada');
        const capIndex = slugParts.indexOf('capitulo');
        const temporada = tempIndex > -1 ? parseInt(slugParts[tempIndex + 1]) : 1;
        const capitulo = capIndex > -1 ? parseInt(slugParts[capIndex + 1]) : 1;

        // Construir URL completa del mirror
        const apiUrl = `${CONFIG.PORT_BRIDGE}/${cleanSlug}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const contenidoMirror = doc.querySelector('main');

        if (contenidoMirror) {
            main.className = "lg:ml-64 container mx-auto px-6 py-8 flex-1 episode-detail-container";
            main.innerHTML = contenidoMirror.innerHTML;

            // Guardar info del episodio actual
            const episodeInfo = {
                tipo: tipo,
                slug: serieSlug,
                temporada: temporada,
                capitulo: capitulo,
                fullSlug: cleanSlug,
                title: doc.querySelector('h1')?.textContent || `${tipo} - T${temporada}E${capitulo}`
            };
            localStorage.setItem('ocean_current_episode', JSON.stringify(episodeInfo));

            // Guardar info de serie para navegación
            const serieInfo = {
                title: doc.querySelector('h1')?.textContent?.split('-')[0]?.trim() || serieSlug,
                slug: serieSlug,
                type: tipo
            };
            localStorage.setItem('ocean_current_serie', JSON.stringify(serieInfo));

            // Aplicar mejoras
            aplicarMejorasVisuales();
            inyectarControlesReproduccion(tipo, cleanSlug, episodeInfo);
            configurarBotonVolver(tipo, serieSlug);
            configurarOverlayReproduccion(cleanSlug, tipo, serieSlug, temporada, capitulo);
            corregirEnlacesMirror();
            mejorarCalidadImagenes();

            // Detectar siguiente episodio
            detectarSiguienteEpisodio(cleanSlug, tipo, serieSlug, temporada, capitulo);

        } else {
            main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Episodio no encontrado en el mirror</h1></div>`;
        }

    } catch (error) {
        console.error("[OCEAN] Error:", error);
        main.innerHTML = `<div class="text-center py-20"><h1 class="text-2xl font-bold text-red-500">Error de conexión: ${error.message}</h1><p class="text-gray-400 mt-2">Verifica que el servidor esté en ${CONFIG.PORT_BRIDGE}</p></div>`;
    }
}

function aplicarMejorasVisuales() {
    const cards = document.querySelectorAll('.movie-card, .similar-movie-card');
    cards.forEach(card => {
        card.classList.add('nova-card');
    });
}

// Función wrapper para activar reproducción desde botón
window.activarReproduccion = async (fullSlug) => {
    // Extraer información del fullSlug (tipo/serie/temporada/X/capitulo/Y)
    const parts = fullSlug.split('/');
    const tipo = parts[0];
    const serieSlug = parts[1];
    const temporada = parts[3];
    const capitulo = parts[5];

    await reproducirDesdeOverlay(fullSlug, tipo, serieSlug, temporada, capitulo);
};

function inyectarControlesReproduccion(tipo, fullSlug, episodeInfo) {
    const playerContainer = document.querySelector('.player-container') ||
        document.querySelector('iframe')?.parentElement ||
        document.querySelector('.video-container');

    if (!playerContainer) return;

    // Verificar si ya tiene controles
    if (playerContainer.querySelector('.ocean-player-controls')) return;

    const controls = document.createElement('div');
    controls.className = "ocean-player-controls flex gap-3 mt-4 mb-6";
    controls.innerHTML = `
        <button onclick="activarReproduccion('${fullSlug}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
            <i class="fas fa-play"></i> REPRODUCIR AHORA
        </button>
        <button onclick="reportarFallo('${fullSlug}')" class="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-3 rounded-lg font-bold transition-all border border-red-500/30">
            <i class="fas fa-exclamation-triangle"></i>
        </button>
    `;

    playerContainer.parentNode.insertBefore(controls, playerContainer.nextSibling);
}

function configurarBotonVolver(tipo, serieSlug) {
    // Agregar botón de volver a la serie con mejores estilos
    const header = document.querySelector('h1')?.parentElement;
    if (header && !header.querySelector('.btn-volver-serie')) {
        const backBtn = document.createElement('a');
        backBtn.className = "btn-volver-serie";
        backBtn.href = `../?tipo=${encodeURIComponent(tipo)}&slug=${encodeURIComponent(serieSlug)}`;
        backBtn.innerHTML = `<i class="fas fa-arrow-left"></i><span>Volver a la serie</span>`;
        header.insertBefore(backBtn, header.firstChild);

        // Agregar estilos inline para el botón
        backBtn.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 0.75rem;
            color: #00d4ff;
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            margin-bottom: 1.5rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(5px);
        `;

        // Hover effect
        backBtn.addEventListener('mouseenter', () => {
            backBtn.style.background = 'rgba(0, 212, 255, 0.2)';
            backBtn.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            backBtn.style.transform = 'translateX(-5px)';
            backBtn.style.boxShadow = '0 5px 15px rgba(0, 212, 255, 0.2)';
        });

        backBtn.addEventListener('mouseleave', () => {
            backBtn.style.background = 'rgba(0, 212, 255, 0.1)';
            backBtn.style.borderColor = 'rgba(0, 212, 255, 0.3)';
            backBtn.style.transform = 'translateX(0)';
            backBtn.style.boxShadow = 'none';
        });
    }
}

function corregirEnlacesMirror() {
    // Seleccionar TODOS los enlaces que apuntan al servidor mirror (más amplio)
    const allLinks = document.querySelectorAll(`a[href*="${window.location.hostname}:5000"], a[href*="localhost:5000"]`);

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || link.hasAttribute('data-ocean-fixed')) return;

        // Extraer el path limpio de la URL del mirror
        let cleanPath = href.replace(/^https?:\/\/[^\/]+\//, '');

        // Episodios específicos (con temporada y capitulo) → mantener en capitulos/
        if (cleanPath.includes('/temporada/') && cleanPath.includes('/capitulo/')) {
            const linkTipo = cleanPath.split('/')[0]; // anime, serie, dorama
            // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
            const tipoNormalizado = linkTipo === 'dorama' ? 'serie' : linkTipo;
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-series/capitulos/?tipo=${encodeURIComponent(tipoNormalizado)}&slug=${encodeURIComponent(cleanPath)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Serie principal (sin temporada/capitulo) → ir a detalles-series/
        else if (cleanPath.startsWith('serie/') || cleanPath.startsWith('anime/') || cleanPath.startsWith('dorama/')) {
            const linkTipo = cleanPath.split('/')[0];
            // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
            const tipoNormalizado = linkTipo === 'dorama' ? 'serie' : linkTipo;
            const linkSlug = cleanPath.replace(`${linkTipo}/`, '');
            link.href = `/${CONFIG.BASE_URL}detalle/detalles-series/?tipo=${tipoNormalizado}&slug=${encodeURIComponent(linkSlug)}`.replace(/\/+/g, '/');
            link.setAttribute('data-ocean-fixed', 'true');
        }
        // Películas
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

async function detectarSiguienteEpisodio(fullSlug, tipo, serieSlug, temporada, capitulo) {
    try {
        const siguienteCapitulo = capitulo + 1;
        const siguienteUrl = `/${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${siguienteCapitulo}`;

        const response = await fetch(`${CONFIG.PORT_BRIDGE}${siguienteUrl}`, { method: 'GET' });

        if (response.ok || response.status === 302) {
            const nextEpisodeInfo = {
                slug: serieSlug,
                season: temporada,
                episode: siguienteCapitulo,
                type: tipo,
                fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${siguienteCapitulo}`,
                title: 'Siguiente episodio',
                links: []
            };

            localStorage.setItem('ocean_next_episode', JSON.stringify(nextEpisodeInfo));
            return nextEpisodeInfo;
        } else {
            // Intentar siguiente temporada
            const siguienteTemporadaUrl = `/${tipo}/${serieSlug}/temporada/${temporada + 1}/capitulo/1`;
            const responseTemp = await fetch(`${CONFIG.PORT_BRIDGE}${siguienteTemporadaUrl}`, { method: 'GET' });

            if (responseTemp.ok || responseTemp.status === 302) {
                const nextEpisodeInfo = {
                    slug: serieSlug,
                    season: temporada + 1,
                    episode: 1,
                    type: tipo,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada + 1}/capitulo/1`,
                    title: 'Primer episodio siguiente temporada',
                    links: []
                };

                localStorage.setItem('ocean_next_episode', JSON.stringify(nextEpisodeInfo));
                return nextEpisodeInfo;
            } else {
                localStorage.removeItem('ocean_next_episode');
                return null;
            }
        }
    } catch (e) {
        localStorage.removeItem('ocean_next_episode');
        return null;
    }
}

// Configurar el overlay de reproducción como clickeable y precargar capítulos siguientes
function configurarOverlayReproduccion(fullSlug, tipo, serieSlug, temporada, capitulo) {
    // Buscar el overlay que contiene "Reproduciendo ahora"
    const overlay = document.querySelector('.absolute.inset-0.bg-black\\/20, .absolute.inset-0.bg-black\\/20.flex');
    const playingNow = document.querySelector('.nova-card:has(.text-gradient), .nova-card p.text-nova-text-muted');

    if (overlay && !overlay.dataset.reproduccionConfigurado) {
        overlay.dataset.reproduccionConfigurado = 'true';
        overlay.style.cursor = 'pointer';
        overlay.style.transition = 'all 0.3s ease';

        // Mejorar estilos del overlay
        overlay.style.background = 'rgba(0, 0, 0, 0.4)';
        overlay.addEventListener('mouseenter', () => {
            overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        });
        overlay.addEventListener('mouseleave', () => {
            overlay.style.background = 'rgba(0, 0, 0, 0.4)';
        });

        // Agregar icono de play grande
        const playIcon = document.createElement('div');
        playIcon.className = 'overlay-play-icon';
        playIcon.innerHTML = '<i class="fas fa-play-circle" style="font-size: 4rem; color: rgba(255,255,255,0.9);"></i>';
        playIcon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
        `;
        overlay.appendChild(playIcon);

        overlay.addEventListener('mouseenter', () => {
            playIcon.style.opacity = '1';
        });
        overlay.addEventListener('mouseleave', () => {
            playIcon.style.opacity = '0';
        });

        // Hacer clickeable para reproducir
        overlay.addEventListener('click', async () => {
            await reproducirDesdeOverlay(fullSlug, tipo, serieSlug, temporada, capitulo);
        });

        // Cambiar texto del overlay
        const textMuted = overlay.querySelector('.text-nova-text-muted, p.text-xs');
        if (textMuted) {
            textMuted.textContent = 'Click para reproducir';
        }
    }
}

// Reproducir desde overlay con precarga inteligente de capítulos
async function reproducirDesdeOverlay(fullSlug, tipo, serieSlug, temporada, capitulo) {
    const overlay = document.querySelector('.absolute.inset-0.bg-black\\/20');
    const playIcon = overlay?.querySelector('.overlay-play-icon');

    // Mostrar loader
    if (playIcon) {
        playIcon.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 4rem; color: #00d4ff;"></i>';
        playIcon.style.opacity = '1';
    }

    try {
        // 1. Obtener estructura de temporadas primero
        const temporadas = await obtenerEstructuraTemporadas(tipo, serieSlug);

        // 2. Encontrar temporada actual y capítulos adyacentes
        const tempActual = temporadas.find(t => t.numero === temporada);
        if (!tempActual) throw new Error('Temporada no encontrada');

        const totalCapsTempActual = tempActual.totalCapitulos || 100;
        const esPenultimoCap = capitulo === (totalCapsTempActual - 1);
        const esUltimoCap = capitulo === totalCapsTempActual;

        // 3. Obtener enlaces del episodio actual
        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;
        const response = await fetch(bridgeApiUrl);

        if (!response.ok) throw new Error(`Bridge error: ${response.status}`);

        const data = await response.json();
        if (data.status !== 'success' || !data.links || data.links.length === 0) {
            throw new Error(data.msg || 'No se encontraron enlaces');
        }

        // Filtrar solo enlaces embed
        const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
        const processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));

        // 4. PRECARGA: 4 caps siguientes DESDE el actual + 2 anteriores
        // Si estoy en cap 3: precargar 4,5,6,7 (adelante) y 2,1 (atrás)
        const capitulosACargar = [];

        // 4 CAPÍTULOS SIGUIENTES (no incluye el actual)
        for (let i = 1; i <= 4; i++) {
            const capNum = capitulo + i;
            if (capNum <= totalCapsTempActual) {
                capitulosACargar.push({
                    temporada,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${capNum}`
                });
            } else {
                // Pasar a siguiente temporada
                const siguienteTemp = temporadas.find(t => t.numero === temporada + 1);
                if (siguienteTemp) {
                    const capNextTemp = capNum - totalCapsTempActual;
                    if (capNextTemp <= siguienteTemp.totalCapitulos) {
                        capitulosACargar.push({
                            temporada: temporada + 1,
                            capitulo: capNextTemp,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${temporada + 1}/capitulo/${capNextTemp}`
                        });
                    }
                }
            }
        }


        const capitulosPrecargados = await precargarCapitulos(capitulosACargar);

        // 5. PRECARGAR 2 CAPÍTULOS ANTERIORES
        const capitulosAnterioresACargar = [];
        for (let i = 1; i <= 2; i++) {
            const capNum = capitulo - i;
            if (capNum >= 1) {
                capitulosAnterioresACargar.push({
                    temporada,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${capNum}`
                });
            } else if (temporada > 1 && i === 1) { // Solo si es el primer paso y hay temporada anterior
                // Ir al último capítulo de temporada anterior
                const tempAnterior = temporadas.find(t => t.numero === temporada - 1);
                if (tempAnterior) {
                    capitulosAnterioresACargar.push({
                        temporada: temporada - 1,
                        capitulo: tempAnterior.totalCapitulos,
                        fullSlug: `${tipo}/${serieSlug}/temporada/${temporada - 1}/capitulo/${tempAnterior.totalCapitulos}`
                    });
                    // También el penúltimo de la temporada anterior
                    if (tempAnterior.totalCapitulos > 1) {
                        capitulosAnterioresACargar.push({
                            temporada: temporada - 1,
                            capitulo: tempAnterior.totalCapitulos - 1,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${temporada - 1}/capitulo/${tempAnterior.totalCapitulos - 1}`
                        });
                    }
                }
                break;
            }
        }

        const capitulosAnteriores = await precargarCapitulos(capitulosAnterioresACargar);

        // 7. Guardar datos de reproducción con estructura completa
        const serieInfo = JSON.parse(localStorage.getItem('ocean_current_serie') || '{}');
        const sessionId = CONFIG.utils.generateSessionId();

        // Construir seasonsData completo
        const seasonsData = {
            currentSeason: temporada - 1, // 0-indexed
            allSeasons: temporadas.map(t => ({
                id: t.numero - 1,
                titulo: t.titulo || `Temporada ${t.numero}`,
                cantidad: `${t.totalCapitulos} episodios`,
                capitulos: Array.from({ length: t.totalCapitulos }, (_, i) => {
                    const capNum = i + 1;
                    const precargado = capitulosPrecargados.find(c => c.numero === capNum && c.season === t.numero);
                    const anterior = capitulosAnteriores.find(c => c.numero === capNum && c.season === t.numero);
                    const esActual = t.numero === temporada && capNum === capitulo;

                    return {
                        numero: capNum,
                        displayNum: `E${capNum}`,
                        titulo: `Capítulo ${capNum}`,
                        fullSlug: `${tipo}/${serieSlug}/temporada/${t.numero}/capitulo/${capNum}`,
                        loaded: esActual || !!precargado || !!anterior,
                        links: esActual ? processedLinks : (precargado?.links || anterior?.links || [])
                    };
                })
            }))
        };

        const nextEp = capitulosPrecargados[0];
        const prevEp = capitulosAnteriores[0];

        // Estructura JSON para navegación
        const estructuraJSON = {
            seasons: temporadas.map(t => t.numero),
            episodes: {}
        };
        temporadas.forEach(t => {
            estructuraJSON.episodes[`season_${t.numero}`] =
                Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);
        });

        const playerData = {
            sources: processedLinks,
            serie: {
                title: serieInfo.title,
                slug: serieSlug,
                type: tipo,
                season: temporada,
                episode: capitulo
            },
            nextEpisode: nextEp ? {
                slug: serieSlug,
                season: nextEp.season,
                episode: nextEp.numero,
                type: tipo,
                fullSlug: nextEp.fullSlug,
                links: nextEp.links
            } : null,
            prevEpisode: prevEp ? {
                slug: serieSlug,
                season: prevEp.season,
                episode: prevEp.numero,
                type: tipo,
                fullSlug: prevEp.fullSlug,
                links: prevEp.links
            } : null,
            capitulosPrecargados: capitulosPrecargados,
            capitulosAnteriores: capitulosAnteriores,
            seasonsData: seasonsData,
            estructura: estructuraJSON
        };


        CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);

        // Redirigir al reproductor
        const playerUrl = `/${CONFIG.BASE_URL}/ver/serie/?sid=${sessionId}`.replace(/\/+/g, '/');
        window.location.href = playerUrl;

    } catch (error) {
        console.error('[OCEAN] Error en reproducirDesdeOverlay:', error);
        console.error('[OCEAN] Parámetros:', { fullSlug, tipo, serieSlug, temporada, capitulo });

        // Mensaje más amigable según el tipo de error
        let mensaje = error.message;
        if (mensaje.includes('ID de video')) {
            mensaje = 'No se pudo obtener el video. La fuente puede estar caída o el enlace ha cambiado.';
        } else if (mensaje.includes('Bridge error')) {
            mensaje = 'Error al conectar con el servidor. Intenta de nuevo en unos segundos.';
        } else if (mensaje.includes('No se encontraron enlaces')) {
            mensaje = 'No hay enlaces disponibles para este capítulo. Intenta con otro capítulo.';
        }

        alert(`❌ ${mensaje}`);

        if (playIcon) {
            playIcon.innerHTML = '<i class="fas fa-play-circle" style="font-size: 4rem; color: rgba(255,255,255,0.9);"></i>';
        }
    }
}

// Función auxiliar para obtener estructura de temporadas
async function obtenerEstructuraTemporadas(tipo, serieSlug) {
    try {
        const response = await fetch(`${CONFIG.PORT_BRIDGE}/${tipo}/${serieSlug}`);
        if (!response.ok) return [];

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const temporadas = [];

        // Intentar múltiples selectores para encontrar temporadas
        let botonesTemporada = doc.querySelectorAll('.tk-btn-temporada');

        // Si no encuentra, probar con otros selectores comunes
        if (botonesTemporada.length === 0) {
            botonesTemporada = doc.querySelectorAll('button[data-temporada], button[onclick*="temporada"], .temporada-btn, .season-btn');
        }
        if (botonesTemporada.length === 0) {
            // Buscar por texto que contenga "Temporada"
            const allButtons = doc.querySelectorAll('button');
            botonesTemporada = Array.from(allButtons).filter(btn =>
                btn.textContent.match(/temporada\s*\d+/i)
            );
        }


        botonesTemporada.forEach((btn, index) => {
            // Intentar obtener ID de múltiples fuentes
            let tempId = parseInt(btn.dataset.temporada);
            if (isNaN(tempId)) {
                const onclickMatch = btn.getAttribute('onclick')?.match(/temporada[^\d]*(\d+)/i);
                tempId = onclickMatch ? parseInt(onclickMatch[1]) : index;
            }

            // Extraer título
            let titulo = `Temporada ${tempId + 1}`;
            const nombreEl = btn.querySelector('.tk-temp-nombre, .season-name, .temp-title');
            if (nombreEl) {
                titulo = nombreEl.textContent;
            } else {
                const textMatch = btn.textContent.match(/temporada\s*\d+/i);
                if (textMatch) titulo = textMatch[0];
            }

            // Extraer cantidad de capítulos - buscar el número GRANDE primero
            let totalCaps = 20; // default
            const capsEl = btn.querySelector('.tk-temp-caps, .ep-count, .episode-count');
            if (capsEl) {
                const capsMatch = capsEl.textContent.match(/(\d+)/);
                if (capsMatch) totalCaps = parseInt(capsMatch[1]);
            }
            // Si no lo encontró, buscar en todo el texto del botón/buscardor
            if (totalCaps === 20) {
                // Buscar patrón: "823 episodios" o "(823)" o "[823]"
                const textMatch = btn.textContent.match(/(\d{2,})\s*(?:episodios?|ep|caps?|capítulos?)/i) ||
                    btn.textContent.match(/[\[(](\d{2,})[\])]/);
                if (textMatch) {
                    totalCaps = parseInt(textMatch[1]);
                }
            }
            // Si aún no lo encontró, contar cuántos links de capítulos hay
            if (totalCaps === 20) {
                const temporadaNum = tempId + 1;
                const capitulosLinks = doc.querySelectorAll(`a[href*="temporada/${temporadaNum}/capitulo/"]`);
                if (capitulosLinks.length > 0) {
                    totalCaps = capitulosLinks.length;
                }
            }

            temporadas.push({
                numero: tempId + 1,
                titulo: titulo,
                totalCapitulos: totalCaps
            });
        });


        if (temporadas.length === 0) {
            // Si no hay temporadas, crear al menos una por defecto
            return [{ numero: 1, titulo: 'Temporada 1', totalCapitulos: 20 }];
        }

        return temporadas.sort((a, b) => a.numero - b.numero);
    } catch (e) {
        console.error('[OCEAN] Error obteniendo temporadas:', e);
        return [{ numero: 1, titulo: 'Temporada 1', totalCapitulos: 20 }];
    }
}

// Función auxiliar para precargar múltiples capítulos
async function precargarCapitulos(capitulos) {
    const resultados = [];

    for (const cap of capitulos) {
        try {
            const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${cap.fullSlug}?bridge_action=extract`;
            const response = await fetch(bridgeUrl);

            if (!response.ok) continue;

            const data = await response.json();
            if (data.status === 'success' && data.links && data.links.length > 0) {
                // Filtrar solo enlaces embed
                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                resultados.push({
                    numero: cap.capitulo,
                    season: cap.temporada,
                    fullSlug: cap.fullSlug,
                    links: filteredLinks.map(url => CONFIG.utils.getStreamUrl(url))
                });
            }
        } catch (e) {
        }
    }

    return resultados;
}

// REPRODUCIR - Usa la misma lógica avanzada de precarga
window.activarReproduccion = async (fullSlug) => {
    const btn = document.querySelector('button[onclick*="activarReproduccion"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    }

    try {
        // Extraer info del slug
        const parts = fullSlug.split('/');
        const tipo = parts[0];
        const serieSlug = parts[1];
        const tempIndex = parts.indexOf('temporada');
        const capIndex = parts.indexOf('capitulo');
        const temporada = tempIndex > -1 ? parseInt(parts[tempIndex + 1]) : 1;
        const capitulo = capIndex > -1 ? parseInt(parts[capIndex + 1]) : 1;


        // Usar la misma función avanzada de precarga
        await reproducirDesdeOverlay(fullSlug, tipo, serieSlug, temporada, capitulo);

    } catch (error) {
        console.error("[OCEAN] Error:", error);
        alert(`❌ ${error.message}`);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> REPRODUCIR AHORA';
        }
    }
};

// REPORTAR FALLO
window.reportarFallo = async (fullSlug) => {
    const reason = prompt("¿Cuál es el problema?");
    if (!reason) return;

    try {
        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract&force_extract=1`;
        const response = await fetch(bridgeApiUrl);

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.links && data.links.length > 0) {
                alert(`✅ ¡Enlaces regenerados!\\nSe encontraron ${data.links.length} enlaces.`);
                return;
            }
        }

        alert(`⚠️ No se pudieron regenerar.\\nSerás redirigido a Telegram.`);
        window.open(CONFIG.TELEGRAM_REPORTES, '_blank');

    } catch (e) {
        alert(`❌ Error. Serás redirigido a Telegram.`);
        window.open(CONFIG.TELEGRAM_REPORTES, '_blank');
    }
};

// Función para extraer estructura completa de temporadas y episodios del HTML
function extraerEstructuraDesdeHTML() {
    const estructura = {
        seasons: [],
        episodes: {}
    };

    // Buscar botones de temporada
    const botonesTemp = document.querySelectorAll('.tk-btn-temporada');
    botonesTemp.forEach(btn => {
        const tempNum = parseInt(btn.getAttribute('data-temporada')) + 1; // Convertir de 0-indexed a 1-indexed
        if (!estructura.seasons.includes(tempNum)) {
            estructura.seasons.push(tempNum);
        }
    });

    // Buscar capítulos por temporada
    const panelesCaps = document.querySelectorAll('.tk-capitulos-temporada');
    panelesCaps.forEach(panel => {
        const tempIndex = panel.getAttribute('data-temporada');
        const tempNum = parseInt(tempIndex) + 1;
        const capitulos = [];

        // Extraer números de capítulo de las cards
        const cards = panel.querySelectorAll('.tk-capitulo-card');
        cards.forEach(card => {
            const capNumero = card.querySelector('.tk-cap-numero');
            if (capNumero) {
                const numMatch = capNumero.textContent.match(/\d+/);
                if (numMatch) {
                    capitulos.push(parseInt(numMatch[0]));
                }
            }
        });

        estructura.episodes[`season_${tempNum}`] = capitulos.sort((a, b) => a - b);
    });

    // Ordenar temporadas
    estructura.seasons.sort((a, b) => a - b);

    return estructura;
}

// REPRODUCIR desde card de capítulo (botones en detalles-series)
window.reproducirCapituloDirectoDesdeCard = async function (event, url, tempIndex, episodeCode, title) {
    event.preventDefault();
    event.stopPropagation();


    // Extraer parámetros de la URL
    const urlObj = new URL(url, window.location.origin);
    const params = new URLSearchParams(urlObj.search);
    const tipo = params.get('tipo') || 'serie';
    const slugEncoded = params.get('slug') || '';

    // Decodificar y extraer temporada/capítulo del slug
    const fullSlug = decodeURIComponent(slugEncoded);
    const slugParts = fullSlug.split('/');
    const serieSlug = slugParts[1];
    const tempPart = slugParts.indexOf('temporada');
    const capPart = slugParts.indexOf('capitulo');
    const temporada = tempPart > -1 ? parseInt(slugParts[tempPart + 1]) : parseInt(tempIndex) + 1;
    const capitulo = capPart > -1 ? parseInt(slugParts[capPart + 1]) : parseInt(episodeCode.replace('E', ''));


    // Mostrar loader
    const card = event.currentTarget;
    const originalContent = card.innerHTML;
    card.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#00d4ff;"></i></div>';

    try {
        // Obtener estructura de temporadas del servidor (desde la página de detalle)
        const temporadas = await obtenerEstructuraTemporadas(tipo, serieSlug);

        // Obtener enlaces del episodio actual
        const bridgeApiUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;
        const response = await fetch(bridgeApiUrl);

        if (!response.ok) throw new Error(`Bridge error: ${response.status}`);

        const data = await response.json();
        if (data.status !== 'success' || !data.links || data.links.length === 0) {
            throw new Error(data.msg || 'No se encontraron enlaces');
        }

        // Procesar enlaces
        const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
        const processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));

        // Precargar 4 siguientes y 2 anteriores
        const capitulosACargar = [];
        const tempActual = temporadas.find(t => t.numero === temporada);
        const totalCaps = tempActual?.totalCapitulos || 24;

        // 4 siguientes
        for (let i = 1; i <= 4; i++) {
            const capNum = capitulo + i;
            if (capNum <= totalCaps) {
                capitulosACargar.push({
                    temporada,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${capNum}`
                });
            } else {
                const nextTemp = temporadas.find(t => t.numero === temporada + 1);
                if (nextTemp) {
                    const nextCap = capNum - totalCaps;
                    if (nextCap <= nextTemp.totalCapitulos) {
                        capitulosACargar.push({
                            temporada: temporada + 1,
                            capitulo: nextCap,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${temporada + 1}/capitulo/${nextCap}`
                        });
                    }
                }
            }
        }

        // 2 anteriores
        const capitulosAnterioresACargar = [];
        for (let i = 1; i <= 2; i++) {
            const capNum = capitulo - i;
            if (capNum >= 1) {
                capitulosAnterioresACargar.push({
                    temporada,
                    capitulo: capNum,
                    fullSlug: `${tipo}/${serieSlug}/temporada/${temporada}/capitulo/${capNum}`
                });
            } else if (temporada > 1 && i === 1) {
                const prevTemp = temporadas.find(t => t.numero === temporada - 1);
                if (prevTemp) {
                    capitulosAnterioresACargar.push({
                        temporada: temporada - 1,
                        capitulo: prevTemp.totalCapitulos,
                        fullSlug: `${tipo}/${serieSlug}/temporada/${temporada - 1}/capitulo/${prevTemp.totalCapitulos}`
                    });
                    if (prevTemp.totalCapitulos > 1) {
                        capitulosAnterioresACargar.push({
                            temporada: temporada - 1,
                            capitulo: prevTemp.totalCapitulos - 1,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${temporada - 1}/capitulo/${prevTemp.totalCapitulos - 1}`
                        });
                    }
                }
                break;
            }
        }

        const capitulosPrecargados = await precargarCapitulos(capitulosACargar);
        const capitulosAnteriores = await precargarCapitulos(capitulosAnterioresACargar);

        // Construir seasonsData completo
        const seasonsData = {
            currentSeason: temporada - 1,
            allSeasons: temporadas.map(t => {
                // Generar array de episodios desde 1 hasta totalCapitulos
                const eps = Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);

                return {
                    id: t.numero - 1,
                    titulo: t.titulo || `Temporada ${t.numero}`,
                    cantidad: `${eps.length} episodios`,
                    totalCapitulos: t.totalCapitulos || eps.length,
                    capitulos: eps.map(capNum => {
                        const esActual = t.numero === temporada && capNum === capitulo;
                        const precargado = capitulosPrecargados.find(c => c.season === t.numero && c.numero === capNum);
                        const anterior = capitulosAnteriores.find(c => c.season === t.numero && c.numero === capNum);

                        return {
                            numero: capNum,
                            displayNum: `E${capNum}`,
                            titulo: title && esActual ? title : `Capítulo ${capNum}`,
                            fullSlug: `${tipo}/${serieSlug}/temporada/${t.numero}/capitulo/${capNum}`,
                            loaded: esActual || !!precargado || !!anterior,
                            links: esActual ? processedLinks : (precargado?.links || anterior?.links || [])
                        };
                    })
                };
            })
        };

        // Extraer info de la serie
        const serieTitle = document.querySelector('h1')?.textContent || serieSlug;
        const poster = document.querySelector('img[src*="tmdb.org"]')?.src || '';

        const nextEp = capitulosPrecargados[0];
        const prevEp = capitulosAnteriores[0];

        // Estructura JSON como solicitó el usuario
        const estructuraJSON = {
            seasons: temporadas.map(t => t.numero),
            episodes: {}
        };
        temporadas.forEach(t => {
            // Usar los episodios de la temporada del servidor
            const eps = Array.from({ length: t.totalCapitulos }, (_, i) => i + 1);
            estructuraJSON.episodes[`season_${t.numero}`] = eps;
        });

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
            prevEpisode: prevEp ? {
                slug: serieSlug,
                season: prevEp.season,
                episode: prevEp.numero,
                type: tipo,
                fullSlug: prevEp.fullSlug,
                links: prevEp.links
            } : null,
            capitulosPrecargados: capitulosPrecargados,
            capitulosAnteriores: capitulosAnteriores,
            seasonsData: seasonsData,
            estructura: estructuraJSON // Nuevo formato solicitado
        };

        const sessionId = CONFIG.utils.generateSessionId();
        CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);

        // Guardar info adicional
        localStorage.setItem('ocean_current_serie', JSON.stringify({
            title: serieTitle,
            slug: serieSlug,
            type: tipo,
            poster: poster
        }));

        localStorage.setItem('ocean_current_episode', JSON.stringify({
            tipo: tipo,
            slug: serieSlug,
            temporada: temporada,
            capitulo: capitulo,
            fullSlug: fullSlug,
            title: title || `Capítulo ${capitulo}`
        }));

        // Redirigir
        const playerUrl = `/${CONFIG.BASE_URL}/ver/serie/?sid=${sessionId}`.replace(/\/+/g, '/');
        window.location.href = playerUrl;

    } catch (error) {
        console.error('[OCEAN] Error:', error);
        alert(`❌ ${error.message}`);
        card.innerHTML = originalContent;
    }
};

// ABRIR BRIDGE
window.abrirBridge = (fullSlug) => {
    const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}`;
    window.open(bridgeUrl, '_blank');
};

// Inicializar
document.addEventListener('DOMContentLoaded', cargarCapitulo);
