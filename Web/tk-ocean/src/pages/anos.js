import { ApiService } from '../core/api.js';
import { RenderService } from '../ui/render.js';

let state = {
    year: null,
    view: 'year',
    page: 1,
    totalPages: 1,
    query: '',
    searchTimer: null,
    gridId: 'catalog-grid'
};

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const yearParam = params.get('year');
    const searchParam = params.get('s');

    // Prioridad: si hay búsqueda, usar búsqueda; si no, usar año
    if (searchParam) {
        state.view = 'search';
        state.query = searchParam;
        state.year = null; // No usar año cuando hay búsqueda
    } else if (yearParam && /^\d{4}$/.test(yearParam)) {
        const yearNum = parseInt(yearParam);
        const currentYear = new Date().getFullYear();
        const minYear = 1900;
        const maxYear = currentYear + 20; // Permitir hasta 20 años en el futuro

        if (yearNum >= minYear && yearNum <= maxYear) {
            state.year = yearParam;
            state.view = 'year';
            state.query = '';
        } else {
            // Año inválido: redirigir con mensaje de error simple
            window.location.href = `/anos/?error=invalid_year&year=${yearParam}`;
            return;
        }
    } else {
        // Si no hay parámetro year, usar el año actual
        state.year = new Date().getFullYear().toString();
        state.view = 'year';
        state.query = '';
    }

    state.page = parseInt(params.get('page')) || 1;
}

function getSlug(item) {
    const rawPath = item.slug || item.path || item.url || '';
    let clean = rawPath.trim().replace(/^\/+|\/+$/g, '');
    if (clean.startsWith('peliculas/') || clean.startsWith('serie/')) return clean;
    return `peliculas/${clean}`;
}

function extractTotalPages(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = doc.querySelectorAll('a.nova-button, span.nova-button');
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

    // Actualizar los spans del cuadro de paginación
    const currentLabel = document.getElementById('current-page-num');
    const totalLabel = document.getElementById('total-pages-num');

    if (currentLabel) currentLabel.textContent = state.page;
    if (totalLabel) totalLabel.textContent = state.totalPages;

    const { year, page, totalPages } = state;
    let html = '';

    if (page > 1) {
        html += `<a href="?year=${year}&page=${page - 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-left"></i></a>`;
    }

    // Lógica simplificada de botones
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
            html += `<a href="?year=${year}&page=${i}" class="nova-button ${i === page ? 'active' : ''}">${i}</a>`;
        } else if (i === page - 2 || i === page + 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    if (page < totalPages) {
        html += `<a href="?year=${year}&page=${page + 1}" class="nova-button nav-arrow"><i class="fas fa-chevron-right"></i></a>`;
    }
    container.innerHTML = html;
}

async function loadContent() {
    const gridElement = document.getElementById('catalog-grid');
    if (!gridElement) return;

    // Elementos de la interfaz
    const currentLabel = document.getElementById('current-page-num');
    const totalLabel = document.getElementById('total-pages-num');
    const yearDisplay = document.getElementById('year-display');
    const pageTitle = document.getElementById('page-title');

    // Mostrar estado de carga
    gridElement.style.opacity = '0.5';
    gridElement.innerHTML = `
        <div class="col-span-full text-center py-20 text-nova-accent animate-pulse">
            <i class="fas fa-spinner fa-spin mr-2"></i> 
            ${state.view === 'search' ? 'Buscando...' : `Cargando año ${state.year}...`}
        </div>`;

    try {
        let endpoint;
        if (state.view === 'search' && state.query) {
            endpoint = `/search?s=${encodeURIComponent(state.query)}&page=${state.page}`;
            if (pageTitle) {
                pageTitle.innerHTML = `<i class="fas fa-search text-blue-500"></i> Resultados para "<span class="text-nova-accent">${state.query}</span>"`;
            }
        } else {
            endpoint = `/year/${state.year}?page=${state.page}`;
            if (pageTitle) {
                pageTitle.innerHTML = `<i class="fas fa-history text-nova-accent"></i> Películas del Año <span class="text-nova-accent font-bold">${state.year}</span>`;
            }
        }

        const html = await ApiService.fetchPage(endpoint);
        state.totalPages = extractTotalPages(html);

        // Actualizar UI
        if (currentLabel) currentLabel.textContent = state.page;
        if (totalLabel) totalLabel.textContent = state.totalPages;
        if (yearDisplay && state.year) yearDisplay.textContent = state.year;

        gridElement.style.opacity = '1';

        // Parsear HTML directamente
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const movieCards = doc.querySelectorAll('.movie-card');

        if (movieCards.length === 0) {
            gridElement.innerHTML = `
                <div class="col-span-full text-center py-20 text-nova-text/50">
                    <i class="fas fa-search mb-4 text-4xl"></i>
                    <p>No se encontraron títulos ${state.view === 'search' ? `para "${state.query}"` : `en el año ${state.year}`}.</p>
                </div>`;
        } else {
            gridElement.innerHTML = ''; // Limpiar el grid

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
                const year = yearBadge ? yearBadge.textContent.trim() : state.year || '';
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
        console.error("Error en anos.js:", error);
        gridElement.style.opacity = '1';
        gridElement.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error al cargar contenido.</div>`;
    }
}

function setupManualYearInput() {
    const input = document.getElementById('manualYearInput');
    const btn = document.getElementById('btnGoYear');

    const handleNavigation = () => {
        const val = input.value.trim();
        // Solo permite navegar si son exactamente 4 números
        if (/^\d{4}$/.test(val)) {
            window.location.href = `/anos/?year=${val}`;
        } else {
            input.classList.add('border-red-500', 'animate-shake');
            setTimeout(() => input.classList.remove('border-red-500', 'animate-shake'), 500);
        }
    };

    btn?.addEventListener('click', handleNavigation);
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleNavigation();
    });
}

function highlightActiveYear() {
    const currentYearStr = new Date().getFullYear().toString();
    const lastYearStr = (new Date().getFullYear() - 1).toString();
    const l1 = document.getElementById('link-current-year');
    const l2 = document.getElementById('link-last-year');

    // Resaltar año actual y año pasado
    if (state.year === currentYearStr) {
        l1?.classList.add('active-link');
    } else {
        l1?.classList.remove('active-link');
    }

    if (state.year === lastYearStr) {
        l2?.classList.add('active-link');
    } else {
        l2?.classList.remove('active-link');
    }

    // También resaltar el año actual en el display
    const yearDisplay = document.getElementById('year-display');
    if (yearDisplay) {
        yearDisplay.textContent = state.year;
        yearDisplay.style.color = 'var(--nova-accent)';
        yearDisplay.style.fontWeight = 'bold';
    }
}

function init() {
    parseUrlParams();

    const searchInput = document.getElementById('navSearchInput');
    const clearBtn = document.querySelector('.clear-btn');

    if (searchInput) {
        // 1. Mostrar la búsqueda actual si existe
        if (state.query) {
            searchInput.value = state.query;
            if (clearBtn) clearBtn.style.display = 'block';
        }

        // 2. Evento al escribir (Búsqueda con retraso/Debounce)
        searchInput.addEventListener('input', (e) => {
            clearTimeout(state.searchTimer);
            const query = e.target.value.trim();

            // Mostrar/ocultar botón X instantáneamente
            if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

            state.searchTimer = setTimeout(() => {
                if (query.length > 0) {
                    // Si buscamos texto, usamos parámetros ?s= pero nos quedamos en años
                    window.location.href = `?s=${encodeURIComponent(query)}`;
                } else if (state.view === 'search' && query.length === 0) {
                    // Si borramos todo estando en búsqueda, volvemos al año actual
                    window.location.href = `?year=${new Date().getFullYear()}`;
                }
            }, 800);
        });

        // 3. Corregir el botón CLEAR - Mantenerse en sección de años
        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            // Redirigir al año actual, no al index.html
            window.location.href = `?year=${new Date().getFullYear()}`;
        });
    }

    // Inicializar el validador de años manual
    setupManualYearInput();
    loadContent();
}

document.addEventListener('DOMContentLoaded', init);