// src/services/detalleService.js
import { ApiService } from '../core/api.js';

function resolveRoute(type) {
    const key = (type || '').toLowerCase();
    if (key === 'pelicula') return '/pelicula';
    if (key === 'serie' || key === 'anime' || key === 'dorama') return '/serie';
    if (key === 'episodio') return '/serie'; // episodios están bajo /serie/slug/temporada/x/capitulo/y
    return `/${key}`;
}

async function loadDetalle(tipo, slug) {
    // Limpiar el slug de prefijos
    slug = slug.replace(/^pelicula\//, '').replace(/^serie\//, '').replace(/^anime\//, '').replace(/^dorama\//, '');

    // Determinar la ruta basada en el tipo
    let routePrefix = '/serie';  // default
    if (tipo === 'pelicula') routePrefix = '/pelicula';
    else if (tipo === 'anime') routePrefix = '/anime';
    else if (tipo === 'dorama') routePrefix = '/dorama';
    // else serie

    let route = routePrefix + '/' + slug;
    let html;
    try {
        html = await ApiService.fetchPage(route);
    } catch (e) {
        // Fallback: intentar con /serie si falla
        if (routePrefix !== '/serie') {
            route = '/serie/' + slug;
            html = await ApiService.fetchPage(route);
        } else {
            throw e;
        }
    }

    // Parsear detalle principal
    const detail = ApiService.parseDetail(html);
    if (!detail) {
        throw new Error('No se pudo parsear el detalle');
    }

    // Parsear temporadas si es serie
    const seasons = (tipo !== 'pelicula') ? ApiService.parseSeasons(html) : [];

    // Parsear items similares
    const similarItems = ApiService.parseSimilarItems(html);

    const itemSnapshot = {
        type: tipo.toUpperCase(),
        title: detail.title || slug.replace(/[-_]/g, ' '),
        description: detail.description,
        image: detail.image,
        video: detail.videoUrl,
        badges: detail.badges,
        genres: detail.genres,
        seasons,
        similarItems,
        slug: slug,
    };

    return itemSnapshot;
}

export const DetalleService = {
    resolveRoute,
    loadDetalle,
};
