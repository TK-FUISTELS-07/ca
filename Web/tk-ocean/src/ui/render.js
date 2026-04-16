// src/ui/render.js
// Usa variables globales definidas en config.js
// import { ApiService } from '../core/api.js';
const ApiService = window.ApiService;
const CONFIG = window.CONFIG;

function renderCard(item, onClick) {
    const card = document.createElement('article');
    card.className = 'movie-card relative group cursor-pointer';

    // Badge "Nuevo" si el item es nuevo
    if (item.isNew) {
        const badge = document.createElement('div');
        badge.className = 'absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-lg';
        badge.innerHTML = '<i class="fas fa-fire mr-1"></i> NUEVO';
        card.appendChild(badge);
    }

    const img = document.createElement('img');
    img.src = item.image || 'https://via.placeholder.com/300x450?text=sin+imagen';
    img.alt = item.title;
    img.loading = 'lazy';
    img.className = 'w-full h-auto rounded-lg';

    const info = document.createElement('div');
    info.className = 'info p-2 text-center';

    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold truncate';
    title.textContent = item.title;

    const details = document.createElement('p');
    let meta = '';
    if (item.datePublished) meta += item.datePublished;
    if (item.rating) meta += (meta ? ' • ' : '') + `⭐ ${item.rating}`;
    details.textContent = meta;

    info.append(title, details);
    card.append(img, info);

    // Agregar event listener para click
    card.addEventListener('click', () => {
        console.log('Click en card:', item);
        console.log('URL que se generará:', onClick.toString());
        onClick(item);
    });

    return card;
}

function renderGrid(items, containerId = 'grid', onClick) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = '<p class="p-4">No se encontró contenido.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const card = renderCard(item, onClick || (() => { }));
        fragment.append(card);
    });

    container.append(fragment);
    ApiService.parseItems('');
}

function renderDetail(item) {
    const section = document.getElementById('detail-section');
    if (!section) return;

    section.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-pane';

    // Título
    const titleEl = document.createElement('h2');
    titleEl.textContent = item.title;
    wrapper.appendChild(titleEl);

    // Imagen
    if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title;
        img.style.maxWidth = '260px';
        img.style.marginBottom = '1rem';
        wrapper.appendChild(img);
    }

    // Badges (año, rating, etc.)
    if (item.badges && item.badges.length) {
        const badgesDiv = document.createElement('div');
        badgesDiv.style.marginBottom = '1rem';
        item.badges.forEach(badge => {
            const span = document.createElement('span');
            span.className = 'nova-badge';
            span.textContent = badge;
            span.style.marginRight = '0.5rem';
            badgesDiv.appendChild(span);
        });
        wrapper.appendChild(badgesDiv);
    }

    // Géneros
    if (item.genres && item.genres.length) {
        const genresDiv = document.createElement('div');
        genresDiv.innerHTML = '<strong>Géneros:</strong> ' + item.genres.join(', ');
        genresDiv.style.marginBottom = '1rem';
        wrapper.appendChild(genresDiv);
    }

    // Descripción
    const descP = document.createElement('p');
    descP.textContent = item.description || 'Descripción no disponible.';
    descP.style.marginBottom = '1rem';
    wrapper.appendChild(descP);

    // Video o selector de temporadas
    if (item.type === 'PELICULA') {
        if (item.video) {
            const videoDiv = document.createElement('div');
            videoDiv.style.marginBottom = '1rem';
            const btn = document.createElement('button');
            btn.className = 'nova-button';
            btn.textContent = 'Reproducir Película';
            btn.addEventListener('click', () => {
                location.href = `${window.CONFIG.BASE_URL}/ver/pelicula/?source=${encodeURIComponent(item.video)}`;
            });
            videoDiv.appendChild(btn);
            wrapper.appendChild(videoDiv);
        }
    } else if (item.seasons && item.seasons.length) {
        // Selector de temporadas para series
        const seasonsDiv = document.createElement('div');
        seasonsDiv.style.marginBottom = '1rem';
        seasonsDiv.innerHTML = '<h3>Seleccionar Temporada</h3>';

        const select = document.createElement('select');
        select.className = 'season-selector';
        select.style.marginBottom = '1rem';
        item.seasons.forEach((season, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = season.title;
            select.appendChild(option);
        });

        const episodesDiv = document.createElement('div');
        episodesDiv.className = 'episodes-list';
        episodesDiv.style.marginBottom = '1rem';

        function showEpisodes(seasonIndex) {
            episodesDiv.innerHTML = '<h4>Episodios</h4>';
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            item.seasons[seasonIndex].episodes.forEach(ep => {
                const li = document.createElement('li');
                li.style.marginBottom = '0.5rem';
                const a = document.createElement('a');
                a.href = `${window.CONFIG.BASE_URL}/ver/serie/?episode=${encodeURIComponent(ep.path)}&serie=${encodeURIComponent(item.slug || item.title)}`;
                a.textContent = ep.title;
                a.className = 'spa-link episode-link';
                a.style.display = 'block';
                a.style.padding = '0.5rem';
                a.style.border = '1px solid #ccc';
                a.style.borderRadius = '4px';
                a.style.textDecoration = 'none';
                a.style.color = '#333';
                a.addEventListener('mouseenter', () => a.style.backgroundColor = '#f0f0f0');
                a.addEventListener('mouseleave', () => a.style.backgroundColor = 'transparent');
                li.appendChild(a);
                ul.appendChild(li);
            });
            episodesDiv.appendChild(ul);
        }

        select.addEventListener('change', (e) => {
            showEpisodes(e.target.value);
        });

        seasonsDiv.appendChild(select);
        seasonsDiv.appendChild(episodesDiv);
        wrapper.appendChild(seasonsDiv);

        // Mostrar primera temporada por defecto
        if (item.seasons.length > 0) {
            showEpisodes(0);
        }
    }

    // Items similares
    if (item.similarItems && item.similarItems.length) {
        const similarDiv = document.createElement('div');
        similarDiv.innerHTML = '<h3>Similares</h3>';
        const grid = document.createElement('div');
        grid.className = 'grid';
        item.similarItems.forEach(sim => {
            const card = renderCard(sim, () => {
                // Navegar a detalle del similar
                const tipo = sim.type === 'TVSeries' ? 'serie' : 'pelicula';
                location.href = `${window.CONFIG.BASE_URL}/detalle/${sim.type === 'TVSeries' ? 'detalles-series' : 'detalles-peliculas'}?tipo=${tipo}&slug=${sim.slug}`;
            });
            grid.appendChild(card);
        });
        similarDiv.appendChild(grid);
        wrapper.appendChild(similarDiv);
    }

    section.appendChild(wrapper);
}


function renderPlayer(source) {
    const player = document.getElementById('player-section');
    if (!player) return;

    player.innerHTML = `<iframe src="${source}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
}

// Export to window
window.RenderService = {
    renderCard,
    renderGrid,
    renderDetail,
    renderPlayer,
};
