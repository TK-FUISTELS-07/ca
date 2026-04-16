// Player Controller - TK-OCEAN Series
(function() {
    'use strict';

    // === Variables ===
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sid');
    
    // Obtener datos de localStorage
    let playerData = null;
    
    if (sessionId) {
        playerData = CONFIG.utils.getFromStorage('ocean_serie_' + sessionId);
    }
    
    // Fallback a datos directos
    if (!playerData) {
        const currentUrl = params.get('source');
        const backupParam = params.get('backupSources');
        const backupUrls = backupParam ? JSON.parse(decodeURIComponent(backupParam)) : [];
        
        playerData = {
            sources: currentUrl ? [decodeURIComponent(currentUrl), ...backupUrls.map(u => decodeURIComponent(u))] : [],
            serie: JSON.parse(localStorage.getItem('ocean_current_serie') || '{}'),
            nextEpisode: JSON.parse(localStorage.getItem('ocean_next_episode') || 'null')
        };
    }
    
    // Filtrar solo enlaces embed válidos
    const rawSources = playerData.sources || [];
    
    const allSources = CONFIG.utils.filterEmbedLinks(rawSources);
    
    const currentSerie = playerData.serie || JSON.parse(localStorage.getItem('ocean_current_serie') || '{}');
    const nextEpisode = playerData.nextEpisode || JSON.parse(localStorage.getItem('ocean_next_episode') || 'null');
    
    
    let currentIndex = 0;
    let inactivityTimer;
    let isHeaderVisible = true;
    const INACTIVITY_DELAY = 3000;
    const HEADER_HIDE_DELAY = 800;
    const HEADER_SHOW_DELAY = 200;
    
    // Flags de navegación para evitar múltiples clics
    let isNavigating = false;
    let navigationQueue = [];
    
    // Precarga inteligente
    const INITIAL_LOAD_COUNT = 4; // Cargar primeros 4 enlaces
    const precachedLinks = []; // Enlaces precargados
    let isPrecaching = false;

    // === DOM Elements ===
    const frame = document.getElementById('video-frame');
    const loader = document.getElementById('loader');
    const error = document.getElementById('error');
    const header = document.getElementById('header');
    const titleElement = document.getElementById('serie-title');
    const subtitleElement = document.getElementById('episode-info');
    const nextBtn = document.getElementById('btn-next-episode');
    const mouseOverlay = document.getElementById('mouseOverlay');

    // === Header Auto-Hide/Show Mejorado ===
    function initHeaderBehavior() {
        header.style.transition = `transform ${HEADER_HIDE_DELAY}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${HEADER_HIDE_DELAY}ms ease`;
        
        function showHeader() {
            if (!isHeaderVisible) {
                header.style.transition = `transform ${HEADER_SHOW_DELAY}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${HEADER_SHOW_DELAY}ms ease`;
                header.style.transform = 'translateY(0)';
                header.style.opacity = '1';
                isHeaderVisible = true;
            }
            resetInactivityTimer();
        }
        
        function hideHeader() {
            if (isHeaderVisible && !header.matches(':hover')) {
                header.style.transition = `transform ${HEADER_HIDE_DELAY}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${HEADER_HIDE_DELAY}ms ease`;
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
        document.addEventListener('mousemove', showHeader);
        document.addEventListener('mousedown', showHeader);
        document.addEventListener('keydown', showHeader);
        document.addEventListener('touchstart', showHeader);
        
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
        
        resetInactivityTimer();
    }

    // === Video Player Functions ===
    function loadSource(index) {
        
        if (index < 0 || index >= allSources.length) {
            return;
        }
        
        currentIndex = index;
        const url = allSources[index];
        
        loader.classList.remove('hidden');
        error.classList.remove('active');
        
        // Aplicar stream proxy
        let processedUrl = url;
        if (!url.includes(':5002/stream_proxy')) {
            processedUrl = CONFIG.utils.getStreamUrl(url);
        }
        
        frame.src = processedUrl;
        
        frame.onload = () => {
            loader.classList.add('hidden');
            
            // Intentar auto-click en el botón de play después de que cargue
            setTimeout(() => {
                
                // Click en el centro del iframe donde está el botón de play
                try {
                    const iframe = document.getElementById('videoFrame');
                    if (iframe) {
                        
                        // Obtener las coordenadas del centro del iframe
                        const rect = iframe.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        // Crear y disparar eventos de ratón en el documento principal
                        // que se propaguen al iframe
                        const events = ['mousedown', 'mouseup', 'click'];
                        events.forEach(eventType => {
                            const event = new MouseEvent(eventType, {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: centerX,
                                clientY: centerY,
                                screenX: centerX,
                                screenY: centerY
                            });
                            document.dispatchEvent(event);
                        });
                        
                        // También intentar enviar postMessage como fallback
                        if (iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                                type: 'jwplayer',
                                command: 'play'
                            }, '*');
                        }
                        
                    }
                } catch (e) {
                }
            }, 3000); // Esperar 3 segundos para que el reproductor inicialice completamente
        };
        
        setTimeout(() => {
            if (!loader.classList.contains('hidden')) {
                showError();
            }
        }, 15000);
    }

    function showError(customMessage = null) {
        loader.classList.add('hidden');
        
        const errorTitle = error.querySelector('h2');
        const errorText = error.querySelector('p');
        
        if (customMessage) {
            if (errorTitle) errorTitle.textContent = 'Error';
            if (errorText) errorText.textContent = customMessage;
        }
        
        error.classList.add('active');
    }
    
    // Función para mostrar error de navegación
    function showNavigationError(message, targetSeason, targetEp) {
        const errorScreen = document.getElementById('error');
        const loader = document.getElementById('loader');
        
        loader.classList.add('hidden');
        
        errorScreen.innerHTML = `
            <i class="fas fa-exclamation-circle error-icon"></i>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">No se pudo cargar</h2>
            <p style="color: #a3a3a3; margin-bottom: 2rem;">${message}<br>T${targetSeason}E${targetEp}</p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                <button class="btn-control" onclick="retryLoadEpisode(${targetSeason}, ${targetEp})">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
                <button class="btn-control" onclick="goBack()">
                    <i class="fas fa-arrow-left"></i> Volver al detalle
                </button>
            </div>
        `;
        errorScreen.classList.add('active');
    }
    
    // Función para reintentar cargar un episodio específico
    window.retryLoadEpisode = async function(targetSeason, targetEp) {
        const errorScreen = document.getElementById('error');
        errorScreen.classList.remove('active');
        
        // Actualizar episodio actual temporalmente para la navegación
        currentSerie.season = targetSeason;
        currentSerie.episode = targetEp;
        
        // Llamar a la función de navegación correspondiente
        if (targetEp > currentSerie.episode || targetSeason > currentSerie.season) {
            await goToNextEpisode();
        } else {
            await goToPrevEpisode();
        }
    };

    // === Navigation Functions ===
    window.prevSource = function() {
        loadSource(currentIndex - 1);
    };

    window.nextSource = function() {
        loadSource(currentIndex + 1);
    };

    window.retryCurrent = function() {
        loadSource(currentIndex);
    };

    window.goBack = function() {
        if (currentSerie.slug && currentSerie.type) {
            const baseUrl = CONFIG.BASE_URL;
            window.location.href = `${baseUrl}/detalle/detalles-series/?tipo=${currentSerie.type}&slug=${currentSerie.slug}`;
        } else {
            window.history.back();
        }
    };

    // Precargar enlaces del episodio siguiente
    async function precargarEnlacesSiguienteEpisodio() {
        if (!nextEpisode || !nextEpisode.fullSlug || isPrecaching) return;
        
        // PRIMERO: Verificar si tenemos el siguiente capítulo en seasonsData precargado
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        const seasonsData = playerData?.seasonsData;
        
        if (seasonsData?.allSeasons) {
            const currentSeason = seasonsData.allSeasons.find(s => s.id === seasonsData.currentSeason);
            const nextCapInData = currentSeason?.capitulos.find(c => c.numero === nextEpisode.episode);
            
            if (nextCapInData?.loaded && nextCapInData.links.length > 0) {
                // Usar enlaces ya precargados desde detalles-series
                precachedLinks.length = 0;
                nextCapInData.links.forEach(url => precachedLinks.push(url));
                return;
            }
        }
        
        isPrecaching = true;
        
        try {
            const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${nextEpisode.fullSlug}?bridge_action=extract`;
            const response = await fetch(bridgeUrl);
            
            if (!response.ok) throw new Error('Bridge error');
            
            const data = await response.json();
            if (data.status === 'success' && data.links && data.links.length > 0) {
                // Filtrar solo enlaces embed
                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                precachedLinks.length = 0;
                filteredLinks.forEach(url => {
                    precachedLinks.push(CONFIG.utils.getStreamUrl(url));
                });
                
                
                // Si hay siguiente temporada, precargarla también
                if (isLastEpisodeOfSeason()) {
                    await precargarSiguienteTemporada();
                }
            }
        } catch (e) {
        } finally {
            isPrecaching = false;
        }
    }
    
    // Verificar si es el último capítulo de la temporada
    function isLastEpisodeOfSeason() {
        // Verificar si hay un episodio next + 1
        // Esto se determina en base a si el siguiente episodio es capítulo 1 de la siguiente temporada
        return nextEpisode && nextEpisode.episode === 1 && nextEpisode.season > currentSerie.season;
    }
    
    // Precargar primera temporada siguiente
    async function precargarSiguienteTemporada() {
        if (!nextEpisode || nextEpisode.episode !== 1) return;
        
        const siguienteTemporada = nextEpisode.season;
        const nextTempSlug = `${currentSerie.type}/${currentSerie.slug}/temporada/${siguienteTemporada}/capitulo/1`;
        
        
        try {
            const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${nextTempSlug}?bridge_action=extract`;
            const response = await fetch(bridgeUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.links) {
                    // Filtrar solo enlaces embed
                    const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                    // Guardar en storage para uso futuro
                    const tempKey = `ocean_next_temp_${currentSerie.slug}_s${siguienteTemporada}`;
                    CONFIG.utils.saveToStorage(tempKey, {
                        season: siguienteTemporada,
                        episode: 1,
                        links: filteredLinks.map(url => CONFIG.utils.getStreamUrl(url))
                    }, 180); // 3 horas
                }
            }
        } catch (e) {
        }
    }

    // Función para ir al episodio anterior - ROBUSTA
    window.goToPrevEpisode = async function() {
        // Evitar múltiples navegaciones simultáneas
        if (isNavigating) {
            return;
        }
        isNavigating = true;
        
        const prevBtn = document.getElementById('btn-prev-episode');
        
        
        // Calcular episodio anterior
        const currSeason = parseInt(currentSerie.season);
        const currEp = parseInt(currentSerie.episode);
        
        let targetSeason = currSeason;
        let targetEp = currEp - 1;
        
        // Si es el primer capítulo, ir al último de la temporada anterior
        if (targetEp < 1) {
            if (currSeason > 1) {
                targetSeason = currSeason - 1;
                // Obtener cantidad de caps de la temporada anterior del playerData
                const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
                const prevSeasonData = playerData?.seasonsData?.allSeasons?.find(s => (s.id + 1) === targetSeason);
                targetEp = prevSeasonData?.capitulos?.length || 99;
            } else {
                alert('No hay episodio anterior disponible');
                return;
            }
        }
        
        if (prevBtn) {
            prevBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            prevBtn.disabled = true;
        }
        
        try {
            const fullSlug = `${currentSerie.type}/${currentSerie.slug}/temporada/${targetSeason}/capitulo/${targetEp}`;
                
            // VERIFICAR SI YA TENEMOS LINKS PRECARGADOS
            let processedLinks = null;
            const precargado = playerData?.capitulosAnteriores?.find(c => 
                c.season === targetSeason && c.numero === targetEp
            ) || playerData?.capitulosPrecargados?.find(c => 
                c.season === targetSeason && c.numero === targetEp
            );
            
            if (precargado?.links && precargado.links.length > 0) {
                    processedLinks = precargado.links;
            } else {
                // Si no está precargado, hacer fetch
                const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;
                const response = await fetch(bridgeUrl);
                
                if (!response.ok) throw new Error('Bridge error');
                
                const data = await response.json();
                if (data.status !== 'success' || !data.links || data.links.length === 0) {
                    throw new Error('No links found');
                }
                
                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));
            }
            
            const newSessionId = CONFIG.utils.generateSessionId();
            
            // Actualizar seasonsData antes de navegar
            const updatedSeasonsData = playerData?.seasonsData ? JSON.parse(JSON.stringify(playerData.seasonsData)) : null;
            if (updatedSeasonsData?.allSeasons) {
                const targetSeasonData = updatedSeasonsData.allSeasons.find(s => (s.id + 1) === targetSeason);
                if (targetSeasonData) {
                    const targetCap = targetSeasonData.capitulos.find(c => c.numero === targetEp);
                    if (targetCap) {
                        targetCap.loaded = true;
                        targetCap.links = processedLinks;
                    }
                }
                // Marcar capítulo actual como precargado para volver
                const currentSeasonData = updatedSeasonsData.allSeasons.find(s => (s.id + 1) === currSeason);
                if (currentSeasonData) {
                    const currentCap = currentSeasonData.capitulos.find(c => c.numero === currEp);
                    if (currentCap) {
                        currentCap.loaded = true;
                        currentCap.links = allSources || [];
                    }
                }
            }
            
            // Preservar estructura JSON original
            const estructura = playerData?.estructura || {
                seasons: updatedSeasonsData?.allSeasons?.map(s => s.id + 1) || [targetSeason],
                episodes: {}
            };
            if (updatedSeasonsData?.allSeasons) {
                updatedSeasonsData.allSeasons.forEach(s => {
                    estructura.episodes[`season_${s.id + 1}`] = s.capitulos.map(c => c.numero);
                });
            }
            
            const newEpisodeData = {
                sources: processedLinks,
                serie: {
                    title: currentSerie.title,
                    slug: currentSerie.slug,
                    type: currentSerie.type,
                    season: targetSeason,
                    episode: targetEp
                },
                nextEpisode: {
                    slug: currentSerie.slug,
                    season: currSeason,
                    episode: currEp,
                    type: currentSerie.type,
                    fullSlug: `${currentSerie.type}/${currentSerie.slug}/temporada/${currSeason}/capitulo/${currEp}`,
                    links: allSources || []
                },
                seasonsData: updatedSeasonsData,
                estructura: estructura,
                capitulosPrecargados: playerData?.capitulosPrecargados || [],
                capitulosAnteriores: playerData?.capitulosAnteriores || []
            };
            
            
            CONFIG.utils.saveToStorage('ocean_serie_' + newSessionId, newEpisodeData, 120);
            localStorage.setItem('ocean_current_serie', JSON.stringify(newEpisodeData.serie));
            
            window.location.href = `./?sid=${newSessionId}`;
            
        } catch (e) {
            showNavigationError('Error al cargar el episodio anterior', targetSeason, targetEp);
            if (prevBtn) {
                prevBtn.innerHTML = '<i class="fas fa-step-backward"></i><span>Anterior</span>';
                prevBtn.disabled = false;
            }
        } finally {
            isNavigating = false;
        }
    };

    // Función para ir al siguiente episodio - ROBUSTA
    window.goToNextEpisode = async function() {
        // Evitar múltiples navegaciones simultáneas
        if (isNavigating) {
            return;
        }
        isNavigating = true;
        
        const nextBtn = document.getElementById('btn-next-episode');
        
        
        // Calcular siguiente episodio
        const currSeason = parseInt(currentSerie.season);
        const currEp = parseInt(currentSerie.episode);
        
        // Obtener datos de temporadas
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        const seasonsData = playerData?.seasonsData;
        const currentSeasonData = seasonsData?.allSeasons?.find(s => (s.id + 1) === currSeason);
        const totalEpsInSeason = currentSeasonData?.capitulos?.length || currentSeasonData?.totalCapitulos || 100;
        
        let targetSeason = currSeason;
        let targetEp = currEp + 1;
        
        // Si superamos el total de episodios, ir a siguiente temporada
        if (targetEp > totalEpsInSeason) {
            const totalSeasons = seasonsData?.allSeasons?.length || 1;
            if (currSeason < totalSeasons) {
                targetSeason = currSeason + 1;
                targetEp = 1;
            } else {
                mostrarFinDeSerie();
                return;
            }
        }
        
        if (nextBtn) {
            nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            nextBtn.disabled = true;
        }
        
        try {
            const fullSlug = `${currentSerie.type}/${currentSerie.slug}/temporada/${targetSeason}/capitulo/${targetEp}`;
            
            // VERIFICAR SI YA TENEMOS LINKS PRECARGADOS
            let processedLinks = null;
            const precargado = playerData?.capitulosPrecargados?.find(c => 
                c.season === targetSeason && c.numero === targetEp
            ) || playerData?.capitulosAnteriores?.find(c => 
                c.season === targetSeason && c.numero === targetEp
            );
            
            if (precargado?.links && precargado.links.length > 0) {
                processedLinks = precargado.links;
            } else {
                // Si no está precargado, hacer fetch
                const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${fullSlug}?bridge_action=extract`;
                const response = await fetch(bridgeUrl);
                
                if (!response.ok) throw new Error('Bridge error');
                
                const data = await response.json();
                if (data.status !== 'success' || !data.links || data.links.length === 0) {
                    throw new Error('No links found');
                }
                
                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                processedLinks = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));
            }
            
            const newSessionId = CONFIG.utils.generateSessionId();
            
            // Actualizar seasonsData antes de navegar
            const updatedSeasonsData = seasonsData ? JSON.parse(JSON.stringify(seasonsData)) : null;
            if (updatedSeasonsData?.allSeasons) {
                const targetSeasonData = updatedSeasonsData.allSeasons.find(s => (s.id + 1) === targetSeason);
                if (targetSeasonData) {
                    const targetCap = targetSeasonData.capitulos.find(c => c.numero === targetEp);
                    if (targetCap) {
                        targetCap.loaded = true;
                        targetCap.links = processedLinks;
                    }
                }
                // Marcar capítulo actual como precargado para volver
                const currentSeasonData = updatedSeasonsData.allSeasons.find(s => (s.id + 1) === currSeason);
                if (currentSeasonData) {
                    const currentCap = currentSeasonData.capitulos.find(c => c.numero === currEp);
                    if (currentCap) {
                        currentCap.loaded = true;
                        currentCap.links = allSources || [];
                    }
                }
            }
            
            // Preservar estructura JSON original
            const estructura = playerData?.estructura || {
                seasons: updatedSeasonsData?.allSeasons?.map(s => s.id + 1) || [targetSeason],
                episodes: {}
            };
            if (updatedSeasonsData?.allSeasons) {
                updatedSeasonsData.allSeasons.forEach(s => {
                    estructura.episodes[`season_${s.id + 1}`] = s.capitulos.map(c => c.numero);
                });
            }
            
            const newEpisodeData = {
                sources: processedLinks,
                serie: {
                    title: currentSerie.title,
                    slug: currentSerie.slug,
                    type: currentSerie.type,
                    season: targetSeason,
                    episode: targetEp
                },
                prevEpisode: {
                    slug: currentSerie.slug,
                    season: currSeason,
                    episode: currEp,
                    type: currentSerie.type,
                    fullSlug: `${currentSerie.type}/${currentSerie.slug}/temporada/${currSeason}/capitulo/${currEp}`,
                    links: allSources || []
                },
                seasonsData: updatedSeasonsData,
                estructura: estructura,
                capitulosPrecargados: playerData?.capitulosPrecargados || [],
                capitulosAnteriores: playerData?.capitulosAnteriores || []
            };
            
            
            CONFIG.utils.saveToStorage('ocean_serie_' + newSessionId, newEpisodeData, 120);
            localStorage.setItem('ocean_current_serie', JSON.stringify(newEpisodeData.serie));
            
            window.location.href = `./?sid=${newSessionId}`;
            
        } catch (e) {
            showNavigationError('Error al cargar el siguiente episodio', targetSeason, targetEp);
            if (nextBtn) {
                nextBtn.innerHTML = '<i class="fas fa-step-forward"></i><span>Sig. Ep.</span>';
                nextBtn.disabled = false;
            }
        } finally {
            isNavigating = false;
        }
    };

    // Navegación entre fuentes del mismo episodio
    window.nextSource = function() {
        if (currentIndex < allSources.length - 1) {
            loadSource(currentIndex + 1);
        } else {
            alert('No hay más fuentes disponibles');
        }
    };

    window.prevSource = function() {
        if (currentIndex > 0) {
            loadSource(currentIndex - 1);
        } else {
            alert('Estás en la primera fuente');
        }
    };

    // BUFFER BIDIRECCIONAL INTELIGENTE - 4 ADELANTE + 2 ATRÁS
    const BUFFER_AHEAD = 4;   // Capítulos a precargar hacia adelante
    const BUFFER_BEHIND = 2;  // Capítulos a precargar hacia atrás
    let isBuffering = false;

    // Función para verificar si estamos en el penúltimo capítulo precargado y cargar 4 más
    async function verificarYPrecargarMas() {
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        if (!playerData?.seasonsData?.allSeasons) return;
        
        const seasonsData = playerData.seasonsData;
        const currentSeasonData = seasonsData.allSeasons.find(s => (s.id + 1) === currentSerie.season);
        if (!currentSeasonData) return;
        
        // Buscar el último capítulo precargado (loaded=true) en adelante
        const capsAdelanteCargados = currentSeasonData.capitulos.filter(c => 
            c.numero > currentSerie.episode && c.loaded
        );
        
        if (capsAdelanteCargados.length === 0) return;
        
        const ultimoPrecargado = capsAdelanteCargados[capsAdelanteCargados.length - 1];
        const esPenultimoPrecargado = capsAdelanteCargados.length >= 3; // Si quedan 2 o menos por delante
        
        if (esPenultimoPrecargado) {
            
            const capitulosACargar = [];
            const ultimoNum = ultimoPrecargado.numero;
            
            // Cargar 4 capítulos después del último precargado
            for (let i = 1; i <= 4; i++) {
                const epNum = ultimoNum + i;
                const cap = currentSeasonData.capitulos.find(c => c.numero === epNum);
                if (cap && !cap.loaded) {
                    capitulosACargar.push(cap);
                }
            }
            
            if (capitulosACargar.length > 0) {
                
                // Cargar en paralelo (2 a la vez)
                const batchSize = 2;
                for (let i = 0; i < capitulosACargar.length; i += batchSize) {
                    const batch = capitulosACargar.slice(i, i + batchSize);
                    
                    await Promise.all(batch.map(async (cap) => {
                        try {
                            const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${cap.fullSlug}?bridge_action=extract`;
                            const response = await fetch(bridgeUrl);
                            
                            if (!response.ok) return;
                            
                            const data = await response.json();
                            if (data.status === 'success' && data.links && data.links.length > 0) {
                                const filteredLinks = CONFIG.utils.filterEmbedLinks(data.links);
                                cap.links = filteredLinks.map(url => CONFIG.utils.getStreamUrl(url));
                                cap.loaded = true;
                            }
                        } catch (e) {
                        }
                    }));
                }
                
                // Guardar seasonsData actualizado
                CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);
            }
        }
    }

    async function mantenerBufferCapitulos() {
        if (isBuffering) return;
        
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        if (!playerData?.seasonsData?.allSeasons) return;
        
        const seasonsData = playerData.seasonsData;
        const currentSeasonIndex = seasonsData.allSeasons.findIndex(s => 
            (s.id + 1) === currentSerie.season || s.id === (currentSerie.season - 1)
        );
        
        if (currentSeasonIndex === -1) return;
        
        const currentSeason = seasonsData.allSeasons[currentSeasonIndex];
        isBuffering = true;
        
        
        try {
            const capitulosACargar = [];
            
            // 1. PRECARGAR 2 HACIA ATRÁS
            for (let i = 1; i <= BUFFER_BEHIND; i++) {
                const epNum = currentSerie.episode - i;
                if (epNum >= 1) {
                    const cap = currentSeason.capitulos.find(c => c.numero === epNum);
                    if (cap && !cap.loaded) {
                        capitulosACargar.push({ cap, direccion: 'atras', tempIndex: currentSeasonIndex });
                    }
                } else if (currentSeasonIndex > 0 && i === 1) {
                    // Temporada anterior
                    const prevSeason = seasonsData.allSeasons[currentSeasonIndex - 1];
                    const cap = prevSeason.capitulos[prevSeason.capitulos.length + epNum - 1];
                    if (cap && !cap.loaded) {
                        capitulosACargar.push({ cap, direccion: 'temp-anterior', tempIndex: currentSeasonIndex - 1 });
                    }
                }
            }
            
            // 2. PRECARGAR 4 HACIA ADELANTE
            let episodiosRestantes = currentSeason.capitulos.length - currentSerie.episode;
            const capitulosAdelanteACargar = Math.min(BUFFER_AHEAD, episodiosRestantes);
            
            for (let i = 1; i <= capitulosAdelanteACargar; i++) {
                const epNum = currentSerie.episode + i;
                const cap = currentSeason.capitulos.find(c => c.numero === epNum);
                if (cap && !cap.loaded) {
                    capitulosACargar.push({ cap, direccion: 'adelante', tempIndex: currentSeasonIndex });
                }
            }
            
            // 3. SI ESTAMOS CERCA DEL FINAL, PRECARGAR SIGUIENTE TEMPORADA
            if (currentSeasonIndex < seasonsData.allSeasons.length - 1 && episodiosRestantes < 4) {
                const nextSeason = seasonsData.allSeasons[currentSeasonIndex + 1];
                const epsACargarNext = Math.min(4 - episodiosRestantes, nextSeason.capitulos.length);
                for (let i = 0; i < epsACargarNext; i++) {
                    const cap = nextSeason.capitulos[i];
                    if (cap && !cap.loaded) {
                        capitulosACargar.push({ cap, direccion: 'temp-siguiente', tempIndex: currentSeasonIndex + 1 });
                    }
                }
            }
            
            if (capitulosACargar.length === 0) {
                // Verificar si necesitamos cargar más (precarga incremental)
                await verificarYPrecargarMas();
                return;
            }
            
            
            // Cargar en paralelo (máximo 3 a la vez)
            const batchSize = 3;
            for (let i = 0; i < capitulosACargar.length; i += batchSize) {
                const batch = capitulosACargar.slice(i, i + batchSize);
                
                const promises = batch.map(async ({ cap, direccion, tempIndex }) => {
                    try {
                        const bridgeUrl = `${CONFIG.PORT_BRIDGE}/${cap.fullSlug}?bridge_action=extract`;
                        const response = await fetch(bridgeUrl);
                        
                        if (!response.ok) throw new Error('Bridge error');
                        
                        const data = await response.json();
                        if (data.status === 'success' && data.links && data.links.length > 0) {
                            cap.links = data.links.map(url => CONFIG.utils.getStreamUrl(url));
                            cap.loaded = true;
                            return { success: true };
                        }
                    } catch (e) {
                        return { success: false };
                    }
                });
                
                await Promise.allSettled(promises);
            }
            
            // Guardar datos actualizados
            CONFIG.utils.saveToStorage('ocean_serie_' + sessionId, playerData, 120);
            
        } finally {
            isBuffering = false;
        }
    }

    // Verificar si hay más episodios disponibles
    function hayMasEpisodios() {
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        const seasonsData = playerData?.seasonsData;
        
        // PRIORIDAD 1: Si hay seasonsData con todas las temporadas, usarlo
        if (seasonsData?.allSeasons && seasonsData.allSeasons.length > 0) {
            const currentSeasonIndex = seasonsData.allSeasons.findIndex(s => 
                (s.id + 1) === currentSerie.season || s.id === (currentSerie.season - 1)
            );
            
            if (currentSeasonIndex === -1) {
                // Fallback a nextEpisode si no se encuentra la temporada
                return !!(nextEpisode && nextEpisode.fullSlug);
            }
            
            const currentSeason = seasonsData.allSeasons[currentSeasonIndex];
            
            // Hay más episodios si:
            // 1. No es el último capítulo de la temporada actual, O
            // 2. Es el último pero hay más temporadas
            const totalCapitulos = currentSeason.capitulos?.length || currentSeason.totalCapitulos || 100;
            const esUltimoCapitulo = currentSerie.episode >= totalCapitulos;
            const hayMasTemporadas = currentSeasonIndex < (seasonsData.allSeasons.length - 1);
            
            return !esUltimoCapitulo || hayMasTemporadas;
        }
        
        // PRIORIDAD 2: Usar nextEpisode si está disponible
        if (nextEpisode && nextEpisode.fullSlug) {
            return true;
        }
        
        // PRIORIDAD 3: Si no hay datos, asumir que hay siguiente por defecto
        // (el reproductor intentará cargarlo y mostrará error si no existe)
        return true;
    }

    // Volver a la página de detalles de la serie
    window.goBack = function() {
        const serie = currentSerie;
        if (serie && serie.slug && serie.type) {
            // Construir URL de detalle correctamente
            const detailUrl = `/${CONFIG.BASE_URL}/detalle/detalles-series/?tipo=${encodeURIComponent(serie.type)}&slug=${encodeURIComponent(serie.slug)}`.replace(/\/+/g, '/');
            window.location.href = detailUrl;
        } else {
            // Fallback: usar localStorage o ir a series
            const savedSerie = localStorage.getItem('ocean_current_serie');
            if (savedSerie) {
                try {
                    const serieData = JSON.parse(savedSerie);
                    const detailUrl = `/${CONFIG.BASE_URL}/detalle/detalles-series/?tipo=${encodeURIComponent(serieData.type || 'serie')}&slug=${encodeURIComponent(serieData.slug)}`.replace(/\/+/g, '/');
                    window.location.href = detailUrl;
                    return;
                } catch (e) {}
            }
            window.location.href = `/${CONFIG.BASE_URL}/series/`.replace(/\/+/g, '/');
        }
    };

    // Mostrar pantalla de fin de serie
    window.mostrarFinDeSerie = function() {
        const errorScreen = document.getElementById('error');
        const loader = document.getElementById('loader');
        const frame = document.getElementById('video-frame');
        
        loader.classList.add('hidden');
        frame.src = ''; // Detener reproducción
        
        // Personalizar pantalla de error para fin de serie
        errorScreen.innerHTML = `
            <i class="fas fa-check-circle error-icon" style="color: var(--green-primary);"></i>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Fin de la serie</h2>
            <p style="color: #a3a3a3; margin-bottom: 2rem;">Has completado todos los episodios disponibles.</p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                <button class="btn-control" onclick="goBack()">
                    <i class="fas fa-arrow-left"></i> Volver a la serie
                </button>
                <button class="btn-control" onclick="window.location.href='/${CONFIG.BASE_URL}/series/'">
                    <i class="fas fa-th"></i> Ver más series
                </button>
            </div>
        `;
        errorScreen.classList.add('active');
        
        // Ocultar botón de siguiente episodio
        const nextBtn = document.getElementById('btn-next-episode');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.style.display = 'none';
        }
        
        // Guardar en localStorage que terminó la serie
        localStorage.setItem('ocean_serie_completada', JSON.stringify({
            slug: currentSerie.slug,
            title: currentSerie.title,
            type: currentSerie.type,
            completedAt: Date.now()
        }));
    };

    // === Initialization ===
    function init() {
        // Actualizar título
        if (currentSerie.title && titleElement) {
            titleElement.textContent = currentSerie.title;
            document.title = `${currentSerie.title} - TK-OCEAN`;
        }
        
        // Actualizar subtítulo (temporada/episodio)
        if (subtitleElement && currentSerie.season && currentSerie.episode) {
            subtitleElement.textContent = `Temporada ${currentSerie.season} • Episodio ${currentSerie.episode}`;
        }
        
        // Obtener datos para verificar disponibilidad de navegación
        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        const seasonsData = playerData?.seasonsData;
        
        // Configurar botón de episodio anterior
        const prevBtn = document.getElementById('btn-prev-episode');
        if (prevBtn) {
            // Determinar si hay episodio anterior
            let hasPrevEpisode = false;
            
            if (seasonsData?.allSeasons) {
                // Usar seasonsData si está disponible
                hasPrevEpisode = currentSerie.episode > 1 || currentSerie.season > 1;
            } else if (playerData?.prevEpisode?.fullSlug) {
                // Usar prevEpisode si está guardado
                hasPrevEpisode = true;
            } else {
                // Fallback: asumir que hay anterior si no es E1 de T1
                hasPrevEpisode = currentSerie.episode > 1 || currentSerie.season > 1;
            }
            
            prevBtn.disabled = !hasPrevEpisode;
            prevBtn.style.display = 'flex';
        }
        
        // Configurar botón de siguiente episodio
        const nextBtn = document.getElementById('btn-next-episode');
        if (nextBtn) {
            const hasNextEpisode = hayMasEpisodios();
            nextBtn.disabled = !hasNextEpisode;
            nextBtn.style.display = hasNextEpisode ? 'flex' : 'none';
            
            
            // Si no hay más episodios, mostrar mensaje especial
            if (!hasNextEpisode && seasonsData?.allSeasons) {
            }
        }
        
        initHeaderBehavior();
        
        // Iniciar precarga inteligente de siguiente episodio en background
        setTimeout(() => {
            precargarEnlacesSiguienteEpisodio();
        }, 5000);
        
        // Verificar precarga incremental cada 30 segundos
        setInterval(() => {
            verificarYPrecargarMas();
        }, 30000);
        
        if (allSources.length > 0) {
            loadSource(0);
        } else {
            loader.classList.add('hidden');
            error.classList.add('active');
        }
        
        // Iniciar buffer bidireccional
        setTimeout(() => {
            mantenerBufferCapitulos();
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // === Debug Panel Functions ===
    window.toggleDebugPanel = function() {
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

        const playerData = sessionId ? CONFIG.utils.getFromStorage('ocean_serie_' + sessionId) : null;
        const dataToShow = {
            sessionId: sessionId,
            playerData: playerData,
            currentSerie: currentSerie,
            nextEpisode: nextEpisode,
            allSources: allSources,
            currentSourceIndex: currentIndex,
            localStorage: {
                ocean_current_serie: localStorage.getItem('ocean_current_serie'),
                ocean_next_episode: localStorage.getItem('ocean_next_episode'),
                ocean_current_episode: localStorage.getItem('ocean_current_episode')
            }
        };

        debugContent.textContent = JSON.stringify(dataToShow, null, 2);
    }
})();
