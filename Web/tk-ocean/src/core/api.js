// Core API - TK-OCEAN
// Usa variable global API_BASE_URL definida en config.js

function normalizeSlug(path) {
    if (!path) return '';
    try {
        const url = new URL(path, window.location.origin);
        return url.pathname.replace(/^\/+/, '');
    } catch {
        let clean = path.startsWith('/') ? path.slice(1) : path;
        return clean.split('?')[0].split('#')[0];
    }
}

function upgradeImage(file) {
    if (!file || typeof file !== 'string') return file;
    if (file.includes('tmdb.org')) {
        return file.replace(/\/w(\d+)\//g, '/w500/');
    }
    return file;
}

function cleanSlugFromUrl(url) {
    if (!url) return '';
    const u = url.replace(/^https?:\/\//, '');
    const i = u.indexOf('/');
    return i === -1 ? u : u.slice(i + 1);
}

async function fetchPage(route) {
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    // Obtener base URL desde variable global o fallback
    let baseUrl = window.API_BASE_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : null);

    // Fallback si no hay base URL configurada
    if (!baseUrl) {
        baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`; // Fallback usando el hostname actual
    }

    const url = new URL(normalizedRoute, baseUrl).toString();
    const res = await fetch(url, {
        headers: { 'Accept': 'text/html' },
        mode: 'cors'
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return await res.text();
}

function extractJsonLd(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
        try {
            const data = JSON.parse(script.textContent);
            if (data) return data;
        } catch (e) { continue; }
    }
    return null;
}

function extractVideoUrl(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const iframe = doc.querySelector('iframe[src*="embed"], iframe[src*="player"], iframe[src*="video"]');
    if (iframe) return iframe.getAttribute('src') || '';

    const videoTag = doc.querySelector('video source[src], video[src]');
    if (videoTag) return videoTag.getAttribute('src') || '';

    const playBtn = doc.querySelector('a[href*="/embed"], button[data-video]');
    if (playBtn) return playBtn.getAttribute('href') || playBtn.dataset.video || '';

    return '';
}

function normalizeEntity(o) {
    if (!o || typeof o !== 'object') return { title: '', description: '' };
    const type = o['@type'] || o.type || 'Unknown';
    const title = o.name || o.headline || o.title || 'Sin título';
    const description = o.description || o.summary || '';
    const image = upgradeImage(typeof o.image === 'string' ? o.image : o.image?.url || '');

    let rawPath = o.url || o['@id'] || '';
    let slug = normalizeSlug(rawPath);

    return {
        type,
        title,
        description,
        image,
        slug,
        path: rawPath,
        raw: o
    };
}

function parseItems(html) {
    const json = extractJsonLd(html);
    if (json) {
        const items = [];
        const data = json['@graph'] || (Array.isArray(json) ? json : [json]);
        data.forEach(obj => {
            if (obj.itemListElement) {
                obj.itemListElement.forEach(el => items.push(normalizeEntity(el.item || el)));
            } else {
                items.push(normalizeEntity(obj));
            }
        });
        return items.filter(i => i.title !== 'Sin título');
    }

    return parseCatalogItems(html);
}

function parseCatalogItems(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a[href*="/pelicula/"], a[href*="/serie/"], a[href*="/anime/"]'));
    const itemsByHref = new Map();

    anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || itemsByHref.has(href)) return;

        const img = a.querySelector('img');
        const title = a.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim() || img?.alt || a.textContent.trim();

        itemsByHref.set(href, {
            type: href.includes('/serie/') ? 'TVSeries' : (href.includes('/pelicula/') ? 'Movie' : 'Anime'),
            title: title || 'Sin título',
            description: a.querySelector('p')?.textContent?.trim() || '',
            image: upgradeImage(img?.getAttribute('src') || ''),
            slug: normalizeSlug(href),
            path: href,
        });
    });

    return [...itemsByHref.values()];
}

async function fetchLocalCatalog() {
    try {
        const response = await fetch('./scan_namual_de_htmls/http1921680455000.html');
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        const html = await response.text();
        return parseCatalogItems(html);
    } catch (e) {
        return [];
    }
}

function parseDetail(html) {
    const json = extractJsonLd(html);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    let result = {
        title: '',
        image: '',
        badges: [],
        genres: [],
        description: '',
        videoUrl: extractVideoUrl(html),
        navigation: {
            prev: null,
            next: null,
            list: null
        }
    };

    if (json) {
        const entity = Array.isArray(json) ? json[0] : (json['@graph'] ? json['@graph'][0] : json);
        result.title = entity.name || entity.headline || '';
        result.image = upgradeImage(entity.image?.url || entity.image || '');
        result.description = entity.description || '';
        if (entity.datePublished) result.badges.push(entity.datePublished);
        if (entity.aggregateRating) result.badges.push(`${entity.aggregateRating.ratingValue}/10`);
        const genreData = entity.genre || entity.keywords;
        result.genres = Array.isArray(genreData) ? genreData : (genreData ? [genreData] : []);
    }

    const titleSelectors = ['h1.text-3xl', 'h1.gradient-text', 'h1', '.title', 'meta[property="og:title"]'];
    for (const selector of titleSelectors) {
        if (result.title) break;
        const el = selector.startsWith('meta') ? doc.querySelector(selector)?.getAttribute('content') : doc.querySelector(selector)?.textContent;
        if (el) result.title = el.trim();
    }

    const descSelectors = ['h2.text-base.leading-relaxed', '.mb-6 h2', '#description', 'p.text-gray-400', '.description', 'meta[name="description"]', 'meta[property="og:description"]'];
    let foundDesc = "";
    for (const selector of descSelectors) {
        const el = selector.startsWith('meta') ? doc.querySelector(selector)?.getAttribute('content') : doc.querySelector(selector)?.textContent;
        if (el && el.trim().length > foundDesc.length) foundDesc = el.trim();
    }
    result.description = foundDesc || result.description;

    const imgEl = doc.querySelector('img.object-cover, .md\\:w-72 img, #poster, [alt*="Ver"]');
    if (!result.image && imgEl) {
        const src = imgEl.getAttribute('srcset') ? imgEl.getAttribute('srcset').split(',').pop().trim().split(' ')[0] : (imgEl.getAttribute('src') || imgEl.getAttribute('data-src'));
        result.image = upgradeImage(src);
    } else if (!result.image) {
        result.image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    }

    const badgeSelectors = '.nova-badge, .badge, .glass-border[href*="/year/"], .year, .rating, .quality';
    const badgeList = Array.from(doc.querySelectorAll(badgeSelectors)).map(b => b.textContent.trim());
    result.badges = [...new Set([...result.badges, ...badgeList])].filter(b => b && b.length < 50);

    const genreSelectors = 'a[href*="/generos/"], .glass-border[href*="/generos/"], [itemprop="genre"], .genre';
    const genreList = Array.from(doc.querySelectorAll(genreSelectors)).map(a => a.textContent.trim());
    result.genres = [...new Set([...result.genres, ...genreList])].filter(g => g);

    if (!result.videoUrl) {
        const videoEl = doc.querySelector('iframe[src*="embed"], iframe[src*="player"], iframe[data-src], video source, .video-container iframe');
        if (videoEl) {
            result.videoUrl = videoEl.getAttribute('src') || videoEl.getAttribute('data-src');
        }
    }

    const allLinks = doc.querySelectorAll('a');
    allLinks.forEach(link => {
        const text = link.textContent.toLowerCase().trim();
        const href = link.getAttribute('href');

        if (href && href !== '#' && !href.startsWith('javascript')) {
            const cleanPath = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');

            if (text.includes('anterior') || link.querySelector('.fa-chevron-left')) {
                result.navigation.prev = cleanPath;
            } else if (text.includes('siguiente') || link.querySelector('.fa-chevron-right')) {
                result.navigation.next = cleanPath;
            } else if (text.includes('lista') || text.includes('listado') || link.querySelector('.fa-list-ul')) {
                result.navigation.list = cleanPath;
            }
        }
    });

    const seasons = parseSeasons(html);
    if (seasons.length > 0) {
        result.seasons = seasons;
    }

    return result.title ? result : null;
}

function parseSeasons(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const seasons = [];

    const containers = doc.querySelectorAll([
        '.season-list',
        '.seasons-container',
        '[id^="season-"]',
        '.season-toggle',
        '.seasons',
        '.tvshows',
        '.episodios',
        '#seasons'
    ].join(','));

    if (containers.length > 0) {
        containers.forEach((container, index) => {
            const titleEl = container.querySelector('h3, .season-title, .title, span, b');
            const title = titleEl ? titleEl.textContent.trim() : `Temporada ${index + 1}`;

            const episodeLinks = container.querySelectorAll('a[href*="/episodio/"], a[href*="/capitulo/"], a[href*="/episode/"], a[href*="/season-"]');

            const episodes = Array.from(episodeLinks).map(link => {
                const href = link.getAttribute('href');
                return {
                    title: link.textContent.replace(/\s+/g, ' ').trim() || 'Episodio',
                    path: href ? href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '') : ''
                };
            }).filter(ep => ep.path);

            if (episodes.length > 0) {
                seasons.push({ title, episodes });
            }
        });
    }

    if (seasons.length === 0) {
        const allEpisodes = doc.querySelectorAll('a[href*="/episodio/"], a[href*="/capitulo/"], a[href*="/episode/"]');
        if (allEpisodes.length > 0) {
            const episodes = Array.from(allEpisodes).map(link => {
                const href = link.getAttribute('href');
                return {
                    title: link.textContent.replace(/\s+/g, ' ').trim() || 'Episodio',
                    path: href ? href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '') : ''
                };
            }).filter(ep => ep.path);

            if (episodes.length > 0) {
                seasons.push({ title: 'Temporada 1', episodes });
            }
        }
    }

    return seasons.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
}

function getEpisodeHandle(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('a[href*="/temporada/"][href*="/capitulo/"]')).map(l => ({
        title: l.textContent.trim(),
        path: l.getAttribute('href')
    }));
}

function parseSimilarItems(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.querySelector('.grid, .similar-items, #catalog-grid');
    if (!container) return [];

    return Array.from(container.querySelectorAll('a[href*="/pelicula/"], a[href*="/serie/"]')).map(card => ({
        type: card.getAttribute('href').includes('/serie/') ? 'TVSeries' : 'Movie',
        title: card.querySelector('h3, .title')?.textContent?.trim() || '',
        image: upgradeImage(card.querySelector('img')?.src || ''),
        slug: normalizeSlug(card.getAttribute('href')),
        path: card.getAttribute('href'),
    }));
}

export const ApiService = {
    fetchPage,
    extractJsonLd,
    extractVideoUrl,
    parseItems,
    parseCatalogItems,
    fetchLocalCatalog,
    normalizeSlug,
    cleanSlugFromUrl,
    getEpisodeHandle,
    parseDetail,
    parseSeasons,
    parseSimilarItems,
    upgradeImage,
    normalizeEntity
};
