import { ApiService } from '../core/api.js';
import { RenderService } from '../ui/render.js';

let state = {
    view: 'peliculas',
    page: 1,
    totalPages: 1,
    query: '',
    searchTimer: null
};

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const pathSegments = window.location.pathname.split('/').filter(seg => seg && seg !== 'index.html' && seg !== 'generos');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const query = params.get('s');

    if (query) {
        state.view = 'search';
        state.query = query;
    } else {
        state.view = params.get('v') || lastSegment || 'peliculas';
        state.query = '';
    }
    state.page = parseInt(params.get('page')) || 1;
}

function getSlug(item) {
    const rawPath = item.slug || item.path || item.url || '';
    let clean = rawPath.trim().replace(/^\/+|\/+$/g, '');
    if (clean.startsWith('genero/')) {
        return clean;
    }
    return `genero/${clean}`;
}

function extractTotalPages(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = doc.querySelectorAll('a.nova-button, span.nova-button, .pagination a');
    let maxPage = state.page;

    links.forEach(link => {
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

    if (currentLabel) currentLabel.textContent = state.page;
    if (totalLabel) totalLabel.textContent = state.totalPages;

    const { view, page, totalPages, query } = state;
    let html = '';

    const isCleanPath = window.location.pathname.includes(view) && !window.location.search.includes('v=');
    const baseUrl = query
        ? `?v=${view}&s=${encodeURIComponent(query)}&page=`
        : (isCleanPath ? `?page=` : `?v=${view}&page=`);

    if (page > 1) {
        html += `<a href="${baseUrl}${page - 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-left"></i></a>`;
    }

    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        html += `<a href="${baseUrl}${i}" class="nova-button ${i === page ? 'active' : ''}">${i}</a>`;
    }

    if (page < totalPages) {
        html += `<a href="${baseUrl}${page + 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-right"></i></a>`;
    }

    container.innerHTML = html;
}

async function loadContent() {
    const gridId = 'catalog-grid';
    const gridElement = document.getElementById(gridId);
    const genreDisplay = document.getElementById('genre-display');
    const currentLabel = document.getElementById('current-page-num');
    const totalLabel = document.getElementById('total-pages-num');
    const pageTitle = document.getElementById('page-title');

    if (gridElement) {
        gridElement.style.opacity = '0.5';
        gridElement.innerHTML = `
            <div class="col-span-full text-center py-20 text-nova-accent animate-pulse">
                <i class="fas fa-spinner fa-spin mr-2"></i> Cargando contenido...
            </div>`;
    }

    try {
        let endpoint;
        const viewClean = state.view
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const categoriasPrincipales = ['peliculas', 'series', 'animes', 'doramas'];

        if (state.view === 'search' && state.query) {
            endpoint = `/search?s=${encodeURIComponent(state.query)}&page=${state.page}`;
            if (pageTitle) {
                pageTitle.innerHTML = `<i class="fas fa-search text-blue-500"></i> Resultados para "${state.query}"`;
            }
        } else if (categoriasPrincipales.includes(viewClean)) {
            endpoint = `/${viewClean}?page=${state.page}`;
            if (pageTitle) {
                pageTitle.innerHTML = `<i class="fas fa-film"></i> Catálogo: ${state.view}`;
            }
        } else {
            endpoint = `/generos/${viewClean}?page=${state.page}`;
            if (pageTitle) {
                pageTitle.innerHTML = `<i class="fas fa-theater-masks"></i> Género: ${state.view}`;
            }
        }

        const html = await ApiService.fetchPage(endpoint);
        state.totalPages = extractTotalPages(html);

        if (currentLabel) currentLabel.textContent = state.page;
        if (totalLabel) totalLabel.textContent = state.totalPages;
        if (genreDisplay) genreDisplay.textContent = state.view.replace(/-/g, ' ');

        // Parsear HTML directamente
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const movieCards = doc.querySelectorAll('.movie-card');

        if (gridElement) {
            gridElement.innerHTML = '';
            gridElement.style.opacity = '1';

            if (movieCards.length === 0) {
                gridElement.innerHTML = `
                    <div class="col-span-full text-center py-20 text-gray-400">
                        <i class="fas fa-search mb-4 text-4xl block"></i>
                        No se encontró contenido disponible.
                    </div>`;
                return;
            }

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
                const typeText = typeBadge ? typeBadge.textContent.trim() : 'Película';

                // Detectar tipo desde la URL del servidor (prioridad)
                // NOTA: Solo 3 tipos válidos: anime, serie, pelicula. Dorama usa tipo=serie.
                let detectedType = 'pelicula';
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

                let typeClass = 'type-movie';
                if (detectedType === 'anime') typeClass = 'type-anime';
                else if (detectedType === 'dorama') typeClass = 'type-dorama';
                else if (detectedType === 'serie') typeClass = 'type-serie';

                cardDiv.innerHTML = `
                    <div class="home-hcard-image-wrapper">
                        <img src="${imageSrc}" alt="${imageTitle}" loading="lazy" class="home-hcard-image">
                        ${badgesHTML}
                        <div class="home-hcard-type ${typeClass}">${typeText}</div>
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

        renderPagination();

    } catch (error) {
        console.error("Error cargando contenido:", error);
        if (gridElement) {
            gridElement.style.opacity = '1';
            gridElement.innerHTML = `
                <div class="col-span-full text-center py-20 text-red-500">
                    <i class="fas fa-exclamation-triangle mb-4 text-4xl"></i>
                    <p>Error al cargar el catálogo de este género.</p>
                    <button onclick="location.reload()" class="nova-button mt-4">Reintentar</button>
                </div>`;
        }
    }
}

function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('v') && !params.has('s')) {
        window.location.href = `?v=peliculas`;
        return;
    }

    parseUrlParams();

    const searchInput = document.getElementById('navSearchInput');
    const clearBtn = document.querySelector('.clear-btn');

    if (searchInput) {
        if (state.query) {
            searchInput.value = state.query;
            if (clearBtn) clearBtn.style.display = 'flex';
        }

        searchInput.addEventListener('input', (e) => {
            clearTimeout(state.searchTimer);
            const query = e.target.value.trim();

            if (clearBtn) clearBtn.style.display = query.length > 0 ? 'flex' : 'none';

            state.searchTimer = setTimeout(() => {
                if (query.length > 0) {
                    window.location.href = `?v=${state.view}&s=${encodeURIComponent(query)}`;
                } else if (state.view === 'search' && query.length === 0) {
                    window.location.href = `?v=peliculas`;
                }
            }, 800);
        });

        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            window.location.href = `?v=${state.view}`;
        });
    }

    loadContent();
}

document.addEventListener('DOMContentLoaded', init);