// Página Series - TK-OCEAN
// Usa variables globales definidas en config.js
// import { ApiService } from '../core/api.js';
// import { RenderService } from '../ui/render.js';
// import { GlobalSearch } from '../core/search.js';
const ApiService = window.ApiService;
const RenderService = window.RenderService;
const GlobalSearch = window.GlobalSearch;
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
        state.query = '';
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
    const titleElement = document.getElementById('page-title');

    if (!gridElement) return;

    // Estado de carga visual
    gridElement.style.opacity = '0.5';
    gridElement.innerHTML = `
        <div class="col-span-full text-center py-20 text-nova-accent animate-pulse">
            <i class="fas fa-spinner fa-spin mr-2"></i> Cargando contenido...
        </div>`;

    try {
        let endpoint;
        if (state.view === 'search' && state.query) {
            endpoint = `/search?s=${encodeURIComponent(state.query)}&page=${state.page}`;
        } else {
            endpoint = state.view === 'populares'
                ? `/series/populares?page=${state.page}`
                : `/series?page=${state.page}`;
        }

        const html = await ApiService.fetchPage(endpoint);
        state.totalPages = extractTotalPages(html);

        // Actualizar título y paginación
        if (titleElement) {
            titleElement.innerHTML = state.view === 'populares'
                ? '<i class="fas fa-fire text-orange-500"></i> Series Populares'
                : '<i class="fas fa-tv"></i> Catálogo de Series';
        }

        const currentLabel = document.getElementById('current-page-num');
        const totalLabel = document.getElementById('total-pages-num');
        if (currentLabel) currentLabel.textContent = state.page;
        if (totalLabel) totalLabel.textContent = state.totalPages;

        // Parsear HTML directamente
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const movieCards = doc.querySelectorAll('.movie-card');

        gridElement.innerHTML = '';
        gridElement.style.opacity = '1';

        if (movieCards.length === 0) {
            gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400">No se encontraron series</div>`;
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
                const typeText = typeBadge ? typeBadge.textContent.trim() : 'Serie';

                // Detectar tipo desde la URL del servidor (prioridad) y badge (fallback)
                // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
                let detectedType = 'serie';
                if (href.includes('/anime/')) detectedType = 'anime';
                else if (href.includes('/pelicula/')) detectedType = 'pelicula';
                // /serie/ y /dorama/ ambos usan tipo=serie

                // Construir URL
                const cleanPath = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+|\/+$/g, '');
                const pathParts = cleanPath.split('/');
                const slugLimpio = [...pathParts].pop();

                let typeBadgeClass = 'type-serie';
                if (typeText.includes('Película')) typeBadgeClass = 'type-movie';
                else if (typeText.includes('Serie')) typeBadgeClass = 'type-serie';
                else if (typeText.includes('Anime')) typeBadgeClass = 'type-anime';
                else if (typeText.includes('Dorama')) typeBadgeClass = 'type-dorama';

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

                gridElement.appendChild(cardDiv);
            });
        }

        renderPagination();

    } catch (error) {
        console.error("Error en series.js:", error);
        gridElement.style.opacity = '1';
        gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error de conexión con el servidor</div>`;
    }
}

function init() {
    parseUrlParams();

    // Configurar enlaces de menú para que limpien búsquedas previas
    const linkTodas = document.getElementById('link-todas');
    const linkPopulares = document.getElementById('link-populares');
    if (linkTodas) linkTodas.href = "?view=todas";
    if (linkPopulares) linkPopulares.href = "?view=populares";

    // CONEXIÓN CON EL BUSCADOR GLOBAL
    GlobalSearch.init(state);

    loadContent();
}

document.addEventListener('DOMContentLoaded', init);
