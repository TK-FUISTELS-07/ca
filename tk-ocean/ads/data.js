/**
 * DATA CONFIGURATION FOR REELS
 * 
 * To add more reels, simply add a new object to the REELS array.
 * Each reel object should have:
 * - id: unique identifier
 * - badge: { icon: font-awesome class, text: badge text }
 * - title: main headline
 * - description: supporting text
 * - media: { type: 'image' or 'video', src: URL }
 * - link: { url: redirect URL, text: link text, icon: font-awesome class }
 * - cta: { text: button text, icon: font-awesome class }
 * - stats: { likes: string (e.g., "12.5K") }
 * - smartlink: boolean (if true, uses the SMARTLINK_URL)
 */

// Adsterra Smartlink - Main redirect URL
const SMARTLINK_URL = 'https://www.profitablecpmratenetwork.com/fd92nnjkv?key=6932873a546891664b4dce617e72621d';

// Reels data - Easy to add/modify
const REELS = [
    {
        id: 1,
        badge: { icon: 'fas fa-fire', text: 'Oferta Exclusiva' },
        title: 'Acceso Premium Ilimitado',
        description: 'Disfruta de todo nuestro catálogo sin límites. Películas, series y animes en HD.',
        media: { type: 'image', src: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=1000&fit=crop' },
        link: { url: SMARTLINK_URL, text: 'Ver más información', icon: 'fas fa-crown' },
        cta: { text: 'ACCEDER AHORA', icon: 'fas fa-play' },
        stats: { likes: '12.5K' },
        smartlink: true
    },
    {
        id: 2,
        badge: { icon: 'fas fa-star', text: 'Estrenos 2024' },
        title: 'Las Mejores Películas del Año',
        description: 'Descubre los estrenos más esperados. Acción, drama, comedia y más géneros.',
        media: { type: 'image', src: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=1000&fit=crop' },
        link: { url: SMARTLINK_URL, text: 'Ver catálogo completo', icon: 'fas fa-film' },
        cta: { text: 'VER ESTRENOS', icon: 'fas fa-play' },
        stats: { likes: '8.3K' },
        smartlink: false
    },
    {
        id: 3,
        badge: { icon: 'fas fa-tv', text: 'Series Trending' },
        title: 'Series que Todos Están Viendo',
        description: 'Las series más populares del momento. Episodios completos sin cortes.',
        media: { type: 'image', src: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&h=1000&fit=crop' },
        link: { url: SMARTLINK_URL, text: 'Explorar series', icon: 'fas fa-list' },
        cta: { text: 'VER SERIES', icon: 'fas fa-play' },
        stats: { likes: '15.7K' },
        smartlink: true
    },
    {
        id: 4,
        badge: { icon: 'fas fa-dragon', text: 'Anime HD' },
        title: 'Anime Sub y Dub en Alta Calidad',
        description: 'Desde clásicos hasta los últimos simulcasts. Tu anime favorito te espera.',
        media: { type: 'image', src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=1000&fit=crop' },
        link: { url: SMARTLINK_URL, text: 'Ver anime ahora', icon: 'fas fa-play-circle' },
        cta: { text: 'VER ANIME', icon: 'fas fa-play' },
        stats: { likes: '22.1K' },
        smartlink: false
    },
    {
        id: 5,
        badge: { icon: 'fas fa-gem', text: 'Solo por Tiempo Limitado' },
        title: 'Contenido Exclusivo Premium',
        description: 'Accede a contenido que no encontrarás en ningún otro lugar. ¡No te lo pierdas!',
        media: { type: 'image', src: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=1000&fit=crop' },
        link: { url: SMARTLINK_URL, text: 'Obtener acceso', icon: 'fas fa-gift' },
        cta: { text: 'ACCESO VIP', icon: 'fas fa-play' },
        stats: { likes: '31.4K' },
        smartlink: true
    }
];

// Ad Configuration
const ADS_CONFIG = {
    // Adsterra Native Banner
    nativeBanner: {
        containerId: 'container-67e26d16354984487841c0badbdbb792',
        scriptUrl: 'https://pl29162396.profitablecpmratenetwork.com/67e26d16354984487841c0badbdbb792/invoke.js'
    },
    // Adsterra Social Bar
    socialBar: {
        scriptUrl: 'https://pl29162395.profitablecpmratenetwork.com/b0/f0/a4/b0f0a465b1c66ee1c469e876f6871721.js'
    },
    // Smartlink
    smartlink: SMARTLINK_URL
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REELS, ADS_CONFIG, SMARTLINK_URL };
}
