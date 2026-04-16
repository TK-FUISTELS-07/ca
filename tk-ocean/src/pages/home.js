import { ApiService } from '../core/api.js';

const CONFIG = window.CONFIG;

let state = {
    view: 'todas',
    page: 1,
    totalPages: 1,
    gridId: 'catalog-grid',
    query: '',
    searchTimer: null
};

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('s');
    if (query) {
        state.view = 'search';
        state.query = query;
    } else {
        state.view = params.get('view') || 'todas';
    }
    state.page = parseInt(params.get('page')) || 1;
}

function getSlugInfo(item, forcedType) {
    const href = item.href || '';
    let type = forcedType || 'pelicula'; // Usar tipo forzado si se proporciona

    // Si no hay tipo forzado, detectamos según la carpeta de la URL
    if (!forcedType) {
        if (href.includes('/serie/')) type = 'serie';
        else if (href.includes('/anime/')) type = 'anime';
        else if (href.includes('/dorama/')) type = 'dorama';
        else if (href.includes('/pelicula/') || href.includes('/movie/')) type = 'pelicula';
    }

    let slugName = '';
    // CASO ESPECIAL: Si es un episodio (contiene temporada)
    if (href.includes('/temporada/')) {
        // Mantenemos la ruta desde el tipo para no perder el capítulo
        // Ejemplo: "anime/nombre/temporada/1/capitulo/1"
        const parts = href.split('/');
        const index = parts.findIndex(p => p === type);
        slugName = parts.slice(index).join('/');
    } else {
        // CASO NORMAL: Solo el ID final
        const parts = href.split('/').filter(Boolean);
        slugName = parts.pop() || '';
    }

    return { tipo: type, slug: slugName };
}

function parseHomeItems(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const cards = doc.querySelectorAll('.episode-card, .movie-card');
    const items = [];
    const seen = new Set();

    cards.forEach(card => {
        const linkElement = card.querySelector('a');
        if (!linkElement) return;

        const href = linkElement.getAttribute('href');
        if (!href || seen.has(href)) return;

        const imgTag = card.querySelector('img');
        const image = imgTag ? (imgTag.getAttribute('src') || imgTag.getAttribute('data-src')) : '';

        const titleTag = card.querySelector('.tk-title, h4, h3');
        let title = titleTag ? titleTag.textContent.trim() : '';

        if (!title || title.toLowerCase() === 'sin título') {
            title = imgTag ? imgTag.getAttribute('title') : 'Contenido';
            title = title.replace(/ - Ver online.*/i, '').trim();
        }

        const badgeNewTag = card.querySelector('.tk-badge-new');
        const esNuevo = badgeNewTag && badgeNewTag.textContent.trim() === 'Nuevo';

        if (image && !image.includes('via.placeholder')) {
            seen.add(href);
            items.push({
                title: title,
                image: image,
                href: href,
                isNew: esNuevo
            });
        }
    });
    return items;
}

function extractTotalPages(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = doc.querySelectorAll('a.nova-button, span.nova-button, .pagination a');
    let maxPage = state.page;

    links.forEach(link => {
        const num = parseInt(link.textContent.trim());
        if (!isNaN(num) && num > maxPage) maxPage = num;
    });
    return maxPage;
}

function renderPagination() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;

    const { view, page, totalPages, query } = state;
    let html = '';
    const baseUrl = query ? `?s=${encodeURIComponent(query)}&page=` : `?view=${view}&page=`;

    if (page > 1) {
        html += `<a href="${baseUrl}${page - 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-left"></i></a>`;
    }

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
        html += `<a href="${baseUrl}${i}" class="nova-button ${i === page ? 'active' : ''}">${i}</a>`;
    }

    if (page < totalPages) {
        html += `<a href="${baseUrl}${page + 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-right"></i></a>`;
    }

    container.innerHTML = html;
}

async function loadContent() {
    const gridElement = document.getElementById(state.gridId);
    if (!gridElement) return;

    gridElement.style.opacity = '0.5';
    gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-nova-accent animate-pulse"><i class="fas fa-spinner fa-spin mr-2"></i> Cargando...</div>`;

    try {
        let endpoint;
        if (state.view === 'search' && state.query) {
            endpoint = `/search?s=${encodeURIComponent(state.query)}&page=${state.page}`;
        } else {
            // Default - página 1 usa / sin parámetros, otras páginas usan ?page=X
            endpoint = state.page === 1 ? `/` : `/?page=${state.page}`;
        }

        const html = await ApiService.fetchPage(endpoint);

        // Extraer secciones por categoría del HTML del mirror
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        gridElement.innerHTML = '';
        gridElement.style.opacity = '1';
        gridElement.className = 'w-full p-4 space-y-12'; // Vertical stack de secciones

        // ========== SECCIÓN: ÚLTIMOS EPISODIOS (PRIMERO) ==========
        // Buscar sección de últimos episodios (compatible con todos los navegadores)
        let ultimosEpisodiosSection = null;
        const allSections = doc.querySelectorAll('section');
        for (const section of allSections) {
            const header = section.querySelector('.section-header');
            if (header && header.querySelector('.fa-clock')) {
                ultimosEpisodiosSection = section;
                break;
            }
        }

        if (ultimosEpisodiosSection) {
            const episodeSlides = ultimosEpisodiosSection.querySelectorAll('.episode-slide');
            if (episodeSlides.length > 0) {
                const ultimosDiv = document.createElement('div');
                ultimosDiv.className = 'home-section';
                ultimosDiv.innerHTML = `
                    <div class="home-section-header mb-4">
                        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                            <i class="fas fa-clock text-nova-accent"></i> Últimos Episodios
                        </h2>
                    </div>
                `;

                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'home-horizontal-scroll';

                episodeSlides.forEach(slide => {
                    const card = slide.querySelector('.episode-card');
                    if (!card) return;

                    const link = card.querySelector('a');
                    const img = card.querySelector('img');
                    const titleEl = card.querySelector('h4');

                    if (!link || !img) return;

                    const href = link.getAttribute('href');
                    const imageSrc = img.getAttribute('src');
                    const imageTitle = titleEl ? titleEl.textContent.trim() : (img.getAttribute('alt') || '');

                    // Extraer T# E# (compatible)
                    const allBadges = card.querySelectorAll('.nova-badge');
                    let tempBadge = null, epBadge = null, nuevoBadge = null, hdBadge = null;
                    allBadges.forEach(badge => {
                        const icon = badge.querySelector('i');
                        if (!icon) return;
                        const iconClass = icon.className || '';
                        const style = badge.getAttribute('style') || '';
                        if (iconClass.includes('fa-layer-group')) tempBadge = badge;
                        else if (iconClass.includes('fa-play-circle')) epBadge = badge;
                        else if (iconClass.includes('fa-hd-video')) hdBadge = badge;
                        if (style.includes('ef4444')) nuevoBadge = badge;
                    });

                    const tempText = tempBadge ? tempBadge.textContent.trim() : '';
                    const epText = epBadge ? epBadge.textContent.trim() : '';
                    const esNuevo = !!nuevoBadge;
                    const esHD = !!hdBadge;

                    // Crear card de episodio
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'home-hcard group cursor-pointer';

                    let badgesHTML = '';
                    if (esNuevo) {
                        badgesHTML += `<div class="home-hcard-badge badge-nuevo-ep"><i class="fas fa-fire mr-1"></i> Nuevo</div>`;
                    }
                    if (esHD) {
                        badgesHTML += `<div class="home-hcard-badge badge-hd-ep"><i class="fas fa-hd-video mr-1"></i> HD</div>`;
                    }

                    let infoHTML = '';
                    if (tempText || epText) {
                        infoHTML = `<div class="home-ep-info">${tempText} ${epText}</div>`;
                    }

                    cardDiv.innerHTML = `
                        <div class="home-hcard-image-wrapper">
                            <img src="${imageSrc}" alt="${imageTitle}" loading="lazy" class="home-hcard-image">
                            ${badgesHTML}
                            ${infoHTML}
                            <div class="home-hcard-overlay">
                                <div class="home-hcard-play">
                                    <i class="fas fa-play text-white text-xl"></i>
                                </div>
                            </div>
                        </div>
                        <div class="home-hcard-content">
                            <h3 class="home-hcard-title">${imageTitle}</h3>
                        </div>
                    `;

                    cardDiv.addEventListener('click', () => {
                        // Detectar tipo desde la URL del href
                        let detectedType = 'serie';
                        if (href.includes('/anime/')) detectedType = 'anime';
                        else if (href.includes('/serie/')) detectedType = 'serie';
                        else if (href.includes('/pelicula/')) detectedType = 'pelicula';
                        else if (href.includes('/dorama/')) detectedType = 'dorama';

                        const item = { href: href, title: imageTitle };
                        const info = getSlugInfo(item, detectedType);

                        let archivoDestino;
                        if (info.tipo === 'pelicula') {
                            archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/`.replace(/^\/+/, '/');
                        } else {
                            archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-series/`.replace(/^\/+/, '/');
                        }

                        window.location.href = `${archivoDestino}?tipo=${info.tipo}&slug=${encodeURIComponent(info.slug)}`;
                    });

                    scrollContainer.appendChild(cardDiv);
                });

                ultimosDiv.appendChild(scrollContainer);
                gridElement.appendChild(ultimosDiv);
            }
        }

        // ========== MANEJO DE BÚSQUEDA ==========
        if (state.view === 'search' && state.query) {
            // En búsqueda, buscar cards directamente (no hay tabs)
            const searchCards = doc.querySelectorAll('.movie-card, .episode-card');
            if (searchCards.length > 0) {
                const searchDiv = document.createElement('div');
                searchDiv.className = 'home-section';
                searchDiv.innerHTML = `
                    <div class="home-section-header mb-4">
                        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                            <i class="fas fa-search text-nova-accent"></i> Resultados de "${state.query}"
                        </h2>
                    </div>
                `;

                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'home-horizontal-scroll';

                searchCards.forEach(card => {
                    const link = card.querySelector('a');
                    const img = card.querySelector('img');
                    const titleEl = card.querySelector('h4, h6, .title');

                    if (!link || !img) return;

                    const href = link.getAttribute('href');
                    const imageSrc = img.getAttribute('src');
                    const imageTitle = titleEl ? titleEl.textContent.trim() : (img.getAttribute('alt') || '');

                    // Extraer badges (compatible)
                    const allBadges = card.querySelectorAll('.nova-badge');
                    let ratingBadge = null, yearBadge = null, typeBadge = null;
                    allBadges.forEach(badge => {
                        const icon = badge.querySelector('i');
                        if (icon && icon.className && icon.className.includes('fa-star')) {
                            ratingBadge = badge;
                        }
                        if (badge.classList.contains('year')) yearBadge = badge;
                        if (badge.classList.contains('secondary')) typeBadge = badge;
                    });
                    if (!typeBadge) typeBadge = card.querySelector('[style*="linear-gradient"]');

                    // Extraer rating (solo el número, no el icono)
                    let rating = '';
                    if (ratingBadge) {
                        // Clonar para no modificar el original
                        const badgeClone = ratingBadge.cloneNode(true);
                        // Remover el icono
                        const icon = badgeClone.querySelector('i');
                        if (icon) icon.remove();
                        rating = badgeClone.textContent.trim();
                    }
                    const year = yearBadge ? yearBadge.textContent.trim() : '';
                    const typeText = typeBadge ? typeBadge.textContent.trim() : '';

                    // Crear card
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'home-hcard group cursor-pointer';

                    let badgesHTML = '';
                    if (rating) {
                        badgesHTML += `<div class="home-hcard-badge badge-rating"><i class="fas fa-star mr-1"></i>${rating.replace('N/A', '0')}</div>`;
                    }
                    if (year) {
                        badgesHTML += `<div class="home-hcard-badge badge-year">${year}</div>`;
                    }

                    let typeBadgeClass = 'badge-type';
                    if (typeText.includes('Película')) typeBadgeClass += ' type-movie';
                    else if (typeText.includes('Serie')) typeBadgeClass += ' type-serie';
                    else if (typeText.includes('Anime')) typeBadgeClass += ' type-anime';
                    else if (typeText.includes('Dorama')) typeBadgeClass += ' type-dorama';

                    cardDiv.innerHTML = `
                        <div class="home-hcard-image-wrapper">
                            <img src="${imageSrc}" alt="${imageTitle}" loading="lazy" class="home-hcard-image">
                            ${badgesHTML}
                            <div class="home-hcard-type ${typeBadgeClass}">${typeText}</div>
                            <div class="home-hcard-overlay">
                                <div class="home-hcard-play">
                                    <i class="fas fa-play text-white text-xl"></i>
                                </div>
                            </div>
                        </div>
                        <div class="home-hcard-content">
                            <h3 class="home-hcard-title">${imageTitle}</h3>
                        </div>
                    `;

                    cardDiv.addEventListener('click', () => {
                        // Detectar tipo desde el badge
                        let detectedType = 'pelicula';
                        if (typeText.includes('Anime')) detectedType = 'anime';
                        else if (typeText.includes('Serie')) detectedType = 'serie';
                        else if (typeText.includes('Dorama')) detectedType = 'dorama';
                        else if (typeText.includes('Película')) detectedType = 'pelicula';

                        const item = { href: href, title: imageTitle };
                        const info = getSlugInfo(item, detectedType);

                        let archivoDestino;
                        if (info.tipo === 'pelicula') {
                            archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/`.replace(/^\/+/, '/');
                        } else {
                            archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-series/`.replace(/^\/+/, '/');
                        }

                        window.location.href = `${archivoDestino}?tipo=${info.tipo}&slug=${encodeURIComponent(info.slug)}`;
                    });

                    scrollContainer.appendChild(cardDiv);
                });

                // Agregar paginación de estado
                const paginationStatus = document.createElement('div');
                paginationStatus.className = 'home-section-header mt-4 mb-4 text-center';
                paginationStatus.innerHTML = `
                    <div class="nova-card p-4 inline-block">
                        <p class="text-nova-text-secondary">
                            Página <span class="text-gradient font-bold">${state.page}</span> 
                            de <span class="text-gradient font-bold">${state.totalPages}</span>
                        </p>
                    </div>
                `;
                searchDiv.appendChild(scrollContainer);
                searchDiv.appendChild(paginationStatus);
                gridElement.appendChild(searchDiv);
            } else {
                gridElement.innerHTML = `<div class="text-center py-20 text-gray-400">No se encontraron resultados para "${state.query}"</div>`;
            }
            renderPagination();
            return;
        }

        // ========== SECCIONES POR CATEGORÍA (vista normal) ==========
        // Buscar todas las secciones de tabs (peliculas, series, anime, doramas)
        const tabPanes = doc.querySelectorAll('.tab-pane');

        if (tabPanes.length === 0 && !ultimosEpisodiosSection) {
            gridElement.innerHTML = `<div class="text-center py-20 text-gray-400">No se encontró contenido</div>`;
            return;
        }

        // Procesar cada sección (tab)
        tabPanes.forEach((pane, index) => {
            // Solo procesar las primeras 4 secciones (peliculas, series, anime, doramas)
            if (index >= 4) return;

            const sectionHeader = pane.querySelector('.section-header h5, .section-header h7, .section-header h9, .section-header h11');
            const sectionTitle = sectionHeader ? sectionHeader.innerHTML : '';
            const movieCards = pane.querySelectorAll('.movie-card');

            if (movieCards.length === 0) return;

            // Crear contenedor de sección
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'home-section';

            // Header de la sección
            const headerHTML = sectionTitle ? `
                <div class="home-section-header mb-4">
                    <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                        ${sectionTitle}
                    </h2>
                </div>
            ` : '';

            // Crear contenedor horizontal scroll
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'home-horizontal-scroll';

            // Procesar cada card de película/serie
            movieCards.forEach(card => {
                const link = card.querySelector('a');
                const img = card.querySelector('img');
                const titleEl = card.querySelector('h6, h8, h10, h12');

                if (!link || !img) return;

                const href = link.getAttribute('href');
                const imageSrc = img.getAttribute('src');
                const imageTitle = titleEl ? titleEl.textContent.trim() : (img.getAttribute('alt') || '');

                // Extraer badges (compatible)
                const allBadges2 = card.querySelectorAll('.nova-badge');
                let ratingBadge = null, yearBadge = null, typeBadge = null;
                allBadges2.forEach(badge => {
                    const icon = badge.querySelector('i');
                    if (icon && icon.className && icon.className.includes('fa-star')) {
                        ratingBadge = badge;
                    }
                    if (badge.classList.contains('year')) yearBadge = badge;
                    if (badge.classList.contains('secondary')) typeBadge = badge;
                });
                if (!typeBadge) typeBadge = card.querySelector('[style*="linear-gradient"]');

                // Extraer rating (solo el número, no el icono)
                let rating = '';
                if (ratingBadge) {
                    const badgeClone = ratingBadge.cloneNode(true);
                    const icon = badgeClone.querySelector('i');
                    if (icon) icon.remove();
                    rating = badgeClone.textContent.trim();
                }
                const year = yearBadge ? yearBadge.textContent.trim() : '';
                const typeText = typeBadge ? typeBadge.textContent.trim() : '';

                // Crear card horizontal
                const cardDiv = document.createElement('div');
                cardDiv.className = 'home-hcard group cursor-pointer';

                // Badges HTML
                let badgesHTML = '';
                if (rating) {
                    badgesHTML += `<div class="home-hcard-badge badge-rating"><i class="fas fa-star mr-1"></i>${rating.replace('N/A', '0')}</div>`;
                }
                if (year) {
                    badgesHTML += `<div class="home-hcard-badge badge-year">${year}</div>`;
                }

                // Tipo badge color
                let typeBadgeClass = 'badge-type';
                if (typeText.includes('Película')) typeBadgeClass += ' type-movie';
                else if (typeText.includes('Serie')) typeBadgeClass += ' type-serie';
                else if (typeText.includes('Anime')) typeBadgeClass += ' type-anime';
                else if (typeText.includes('Dorama')) typeBadgeClass += ' type-dorama';

                cardDiv.innerHTML = `
                    <div class="home-hcard-image-wrapper">
                        <img src="${imageSrc}" alt="${imageTitle}" loading="lazy" class="home-hcard-image">
                        ${badgesHTML}
                        <div class="home-hcard-type ${typeBadgeClass}">${typeText}</div>
                        <div class="home-hcard-overlay">
                            <div class="home-hcard-play">
                                <i class="fas fa-play text-white text-xl"></i>
                            </div>
                        </div>
                    </div>
                    <div class="home-hcard-content">
                        <h3 class="home-hcard-title">${imageTitle}</h3>
                    </div>
                `;

                // Evento click
                cardDiv.addEventListener('click', () => {
                    // Detectar tipo desde el badge
                    let detectedType = 'pelicula';
                    if (typeText.includes('Anime')) detectedType = 'anime';
                    else if (typeText.includes('Serie')) detectedType = 'serie';
                    else if (typeText.includes('Dorama')) detectedType = 'dorama';
                    else if (typeText.includes('Película')) detectedType = 'pelicula';

                    const item = { href: href, title: imageTitle };
                    const info = getSlugInfo(item, detectedType);

                    let archivoDestino;
                    if (info.tipo === 'pelicula') {
                        archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/`.replace(/^\/+/, '/');
                    } else {
                        archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-series/`.replace(/^\/+/, '/');
                    }

                    window.location.href = `${archivoDestino}?tipo=${info.tipo}&slug=${encodeURIComponent(info.slug)}`;
                });

                scrollContainer.appendChild(cardDiv);
            });

            sectionDiv.innerHTML = headerHTML;
            sectionDiv.appendChild(scrollContainer);
            gridElement.appendChild(sectionDiv);
        });

        renderPagination();

    } catch (error) {
        gridElement.style.opacity = '1';
        gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error de conexión con el servidor</div>`;
    }
}

// Parser alternativo más flexible
function parseItemsAlt(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const items = [];
    const seen = new Set();
    
    // Buscar todos los links que contienen pelicula, serie, anime, dorama
    const links = doc.querySelectorAll('a[href*="pelicula"], a[href*="serie"], a[href*="anime"], a[href*="dorama"]');
    
    links.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || seen.has(href)) return;
        
        // Buscar imagen
        let img = a.querySelector('img');
        if (!img) {
            const parent = a.closest('.episode-card, .movie-card, .card, .item, [class*="slide"]');
            if (parent) img = parent.querySelector('img');
        }
        
        const image = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : '';
        let title = img ? img.getAttribute('alt') || img.getAttribute('title') || '' : '';
        
        // Limpiar título
        title = title.replace(/ - Ver online.*/i, '').replace(/Ver /, '').trim();
        
        if (image && title && title !== 'Sin título') {
            seen.add(href);
            items.push({
                title: title,
                image: image,
                href: href
            });
        }
    });
    
    return items;
}

function init() {
    parseUrlParams();

    const searchInput = document.getElementById('navSearchInput');
    const clearBtn = document.querySelector('.clear-btn');

    if (searchInput) {
        if (state.query) searchInput.value = state.query;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(state.searchTimer);
            const query = e.target.value.trim();

            if (clearBtn) {
                clearBtn.style.display = query.length > 0 ? 'block' : 'none';
            }

            state.searchTimer = setTimeout(() => {
                if (query.length > 0) {
                    window.location.href = `?s=${encodeURIComponent(query)}`;
                } else if (state.view === 'search' && query.length === 0) {
                    window.location.href = `?view=todas`;
                }
            }, 800);
        });

        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            if (state.view === 'search' && state.query) {
                window.location.href = `${CONFIG.BASE_URL}index.html`;
            } else {
                searchInput.focus();
            }
        });
    }

    loadContent();
}

document.addEventListener('DOMContentLoaded', init);