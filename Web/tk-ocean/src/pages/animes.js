// import { ApiService } from '../core/api.js';
// import { RenderService } from '../ui/render.js';
// import { GlobalSearch } from '../core/search.js';
const ApiService = window.ApiService;
const RenderService = window.RenderService;
const GlobalSearch = window.GlobalSearch;

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

    if (query && query.trim() !== '') {
        state.view = 'search';
        state.query = query.trim();
        state.page = parseInt(params.get('page')) || 1;
    } else {
        state.view = params.get('view') || 'todas';
        state.query = '';
        state.page = parseInt(params.get('page')) || 1;
    }
}

function getSlug(item) {
    const rawPath = item.slug || item.path || item.url || '';
    let clean = rawPath.trim().replace(/^\/+|\/+$/g, '');

    if (clean.startsWith('anime/')) {
        return clean;
    }
    return `anime/${clean}`;
}

function extractTotalPages(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Buscamos todos los botones de paginación que tengan números
    const links = doc.querySelectorAll('a.nova-button, span.nova-button');
    let maxPage = state.page;

    links.forEach(link => {
        // Limpiamos el texto para quedarnos solo con el número (ej: " 30 " -> 30)
        const text = link.textContent.trim();
        const num = parseInt(text);
        if (!isNaN(num) && num > maxPage) {
            maxPage = num;
        }
    });

    return maxPage;
}

function renderPagination() {
    const container = document.getElementById('pagination-controls');
    const currentLabel = document.getElementById('current-page-num');
    const totalLabel = document.getElementById('total-pages-num');

    if (!container) return;

    // Actualizar etiquetas de texto
    if (currentLabel) currentLabel.textContent = state.page;
    if (totalLabel) totalLabel.textContent = state.totalPages;

    const { view, page, totalPages, query } = state;

    // CORRECCIÓN: Definir la base de la URL según si hay búsqueda o no
    // Si hay búsqueda, usamos 's', si no, usamos 'view'
    const baseUrl = query
        ? `?s=${encodeURIComponent(query)}`
        : `?view=${view}`;

    let html = '';

    // Botón Anterior
    if (page > 1) {
        html += `
            <a href="${baseUrl}&page=${page - 1}" class="nova-button nav-arrow">
                <i class="fas fa-chevron-left"></i>
                <span class="nav-text ml-2">Anterior</span>
            </a>`;
    }

    // Primera Página
    html += `<a href="${baseUrl}&page=1" class="nova-button ${page === 1 ? 'active' : ''}">1</a>`;

    // Elipsis inicial
    if (page > 3) {
        html += `<span class="pagination-ellipsis text-nova-text/30 px-1">...</span>`;
    }

    // Páginas intermedias
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
        if (i === 1 || i === totalPages) continue;
        html += `
            <a href="${baseUrl}&page=${i}" class="nova-button ${i === page ? 'active' : ''}">
                ${i}
            </a>`;
    }

    // Elipsis final
    if (page < totalPages - 2) {
        html += `<span class="pagination-ellipsis text-nova-text/30 px-1">...</span>`;
    }

    // Última Página
    if (totalPages > 1) {
        html += `
            <a href="${baseUrl}&page=${totalPages}" class="nova-button ${page === totalPages ? 'active' : ''}">
                ${totalPages}
            </a>`;
    }

    // Botón Siguiente
    if (page < totalPages) {
        html += `
            <a href="${baseUrl}&page=${page + 1}" class="nova-button nav-arrow">
                <span class="nav-text mr-2">Siguiente</span>
                <i class="fas fa-chevron-right"></i>
            </a>`;
    }

    container.innerHTML = html;
}

async function loadContent() {
    const gridId = state.gridId;
    const gridElement = document.getElementById(gridId);
    const titleElement = document.getElementById('page-title');

    if (gridElement) {
        gridElement.style.opacity = '0.5';
        gridElement.innerHTML = `
            <div class="col-span-full text-center py-20 text-nova-accent animate-pulse">
                <i class="fas fa-spinner fa-spin mr-2"></i> Cargando Anime...
            </div>`;
    }

    try {
        let endpoint;
        if (state.view === 'search' && state.query) {
            endpoint = `/search?s=${encodeURIComponent(state.query)}&page=${state.page}`;
        } else if (state.view === 'year' && state.year) {
            endpoint = `/year/${state.year}?page=${state.page}`;
        } else {
            endpoint = state.view === 'populares'
                ? `/animes/populares?page=${state.page}`
                : `/animes?page=${state.page}`;
        }

        const html = await ApiService.fetchPage(endpoint);
        state.totalPages = extractTotalPages(html);

        // Actualizar título
        if (titleElement) {
            titleElement.innerHTML = state.view === 'populares'
                ? '<i class="fas fa-fire text-orange-500"></i> Anime Populares'
                : '<i class="fas fa-dragon"></i> Catálogo de Anime';
        }

        // Parsear HTML directamente
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const movieCards = doc.querySelectorAll('.movie-card');

        if (gridElement) {
            gridElement.innerHTML = '';
            gridElement.style.opacity = '1';

            if (movieCards.length === 0) {
                gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400">No se encontraron animes</div>`;
            } else {
                movieCards.forEach(card => {
                    const link = card.querySelector('a');
                    const img = card.querySelector('img');
                    const titleEl = card.querySelector('h2, h4, .title');

                    if (!link || !img) return;

                    const href = link.getAttribute('href');
                    const imageSrc = img.getAttribute('src');
                    const imageTitle = titleEl ? titleEl.textContent.trim() : (img.getAttribute('alt') || '');

                    // Extraer badges
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

                    // Extraer rating (solo el número)
                    let rating = '';
                    if (ratingBadge) {
                        const badgeClone = ratingBadge.cloneNode(true);
                        const icon = badgeClone.querySelector('i');
                        if (icon) icon.remove();
                        rating = badgeClone.textContent.trim();
                    }
                    const year = yearBadge ? yearBadge.textContent.trim() : '';
                    const typeText = typeBadge ? typeBadge.textContent.trim() : 'Anime';

                    // Detectar tipo desde la URL del servidor (prioridad)
                    // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
                    let detectedType = 'anime';
                    if (href.includes('/anime/')) detectedType = 'anime';
                    else if (href.includes('/pelicula/')) detectedType = 'pelicula';
                    else if (href.includes('/serie/') || href.includes('/dorama/')) detectedType = 'serie';

                    const cleanPath = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+|\/+$/g, '');
                    const pathParts = cleanPath.split('/');
                    const slugLimpio = [...pathParts].pop();

                    let archivoDestino;
                    if (detectedType === 'pelicula') {
                        archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-peliculas/`.replace(/^\/+/, '/');
                    } else {
                        archivoDestino = `/${CONFIG.BASE_URL}detalle/detalles-series/`.replace(/^\/+/, '/');
                    }
                    const urlFinal = `${archivoDestino}?tipo=${detectedType}&slug=${encodeURIComponent(slugLimpio)}`;

                    // Crear card con estilo home-hcard
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'home-hcard group cursor-pointer';

                    let badgesHTML = '';
                    if (rating) {
                        badgesHTML += `<div class="home-hcard-badge badge-rating"><i class="fas fa-star mr-1"></i>${rating.replace('N/A', '0')}</div>`;
                    }
                    if (year) {
                        badgesHTML += `<div class="home-hcard-badge badge-year">${year}</div>`;
                    }

                    cardDiv.innerHTML = `
                        <div class="home-hcard-image-wrapper">
                            <img src="${imageSrc}" alt="${imageTitle}" loading="lazy" class="home-hcard-image">
                            ${badgesHTML}
                            <div class="home-hcard-type type-anime">${typeText}</div>
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
                        window.location.href = urlFinal;
                    });

                    gridElement.appendChild(cardDiv);
                });
            }
        }

        renderPagination();

    } catch (error) {
        console.error("Error crítico:", error);
        if (gridElement) {
            gridElement.style.opacity = '1';
            gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error de conexión con el servidor.</div>`;
        }
    }
}

function init() {
    parseUrlParams();

    // Configurar enlaces de menú
    const linkTodas = document.getElementById('link-todas');
    const linkPopulares = document.getElementById('link-populares');
    if (linkTodas) linkTodas.href = "?view=todas";
    if (linkPopulares) linkPopulares.href = "?view=populares";

    // CORRECCIÓN: Pasar las acciones al buscador
    GlobalSearch.init(state, {
        onSearch: (query) => {
            // Esto hace que al escribir, la URL cambie y la página se recargue con resultados
            window.location.href = `?s=${encodeURIComponent(query)}`;
        },
        onClear: () => {
            // Esto limpia la búsqueda y vuelve al catálogo general
            window.location.href = `?view=todas`;
        }
    });

    loadContent();
}

document.addEventListener('DOMContentLoaded', init);