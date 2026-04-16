// import { fetchPage, parseItems, parseJsonLd, normalizeItem, extractEpisodeLinks } from './api.js';
// import { renderGrid } from '../components/grid.js';
// import { renderDetail } from '../components/detail.js';
// import { setStatus } from '../components/status.js';

// Use window globals
const { fetchPage, parseItems, parseJsonLd, normalizeItem, extractEpisodeLinks } = window.ApiService || {};
const renderGrid = window.renderGrid;
const renderDetail = window.renderDetail;
const setStatus = window.setStatus;

const routes = [
    { pattern: /^(?:\/|\/peliculas(?:\/populares)?)(?:\?.*)?$/, type: 'collection', endpoint: '/peliculas/populares' },
    { pattern: /^\/series(?:\/populares)?(?:\?.*)?$/, type: 'collection', endpoint: '/series/populares' },
    { pattern: /^\/animes(?:\?.*)?$|^\/anime(?:\?.*)?$/, type: 'collection', endpoint: '/animes' },
    { pattern: /^\/generos\/[a-zA-Z0-9-%]+(?:\?.*)?$/, type: 'collection' },
    { pattern: /^\/year\/[0-9]{4}(?:\?.*)?$/, type: 'collection' },
    { pattern: /^\/search(?:\?.*)?$/, type: 'search' },
    { pattern: /^\/pelicula\/[a-zA-Z0-9-]+(?:\?.*)?$/, type: 'detail', category: 'pelicula' },
    { pattern: /^\/serie\/[a-zA-Z0-9-]+(?:\/temporada\/[0-9]+\/capitulo\/[0-9]+)?(?:\?.*)?$/, type: 'detail', category: 'serie' },
    { pattern: /^\/anime\/[a-zA-Z0-9-]+(?:\?.*)?$/, type: 'detail', category: 'anime' },
];

function getRouteInfo(path) {
    const lower = path.toLowerCase().split('?')[0];
    return routes.find(r => r.pattern.test(lower)) || routes[0];
}

function buildEndpointFromPath(path) {
    const route = getRouteInfo(path);
    if (route.endpoint) return route.endpoint + (path.includes('?') ? path.slice(path.indexOf('?')) : '');

    // For generos/year/search no transformation, use path as is
    return path;
}

async function navigate(path) {
    history.pushState({}, '', path);
    await render(path);
}

async function render(path) {
    const route = getRouteInfo(path);
    setStatus('Cargando...');

    try {
        const endpoint = buildEndpointFromPath(path);
        const html = await fetchPage(endpoint);

        if (route.type === 'collection' || route.type === 'search') {
            const items = parseItems(html);
            renderGrid(items, item => navigate(new URL(item.url).pathname));
            setStatus(`${items.length} items mostrados`);
            return;
        }

        if (route.type === 'detail') {
            const jsonld = parseJsonLd(html);
            const primary = jsonld.find(i => i['@type'] === 'Movie' || i['@type'] === 'TVSeries' || i['@type'] === 'TVEpisode') || jsonld[0];
            const detailData = normalizeItem(primary || { name: 'Detalle no disponible' });
            const episodes = extractEpisodeLinks(html);
            renderDetail(detailData, episodes);
            setStatus('Detalle cargado');
            return;
        }

        // fallback to collection list
        const items = parseItems(html);
        renderGrid(items, item => navigate(new URL(item.url).pathname));
        setStatus(`${items.length} items mostrados`);
    } catch (err) {
        console.error(err);
        setStatus('Error cargando datos');
        renderGrid([]);
    }
}

window.onpopstate = () => render(window.location.pathname + window.location.search);

// Export to window
window.navigate = navigate;
window.render = render;
window.getRouteInfo = getRouteInfo;
