/**
 * REELS APP - TK-OCEAN ADS
 * Main application logic for the reels page
 */

(function() {
    'use strict';

    // ===== STATE =====
    const state = {
        currentReel: 0,
        totalReels: REELS.length,
        likedReels: new Set()
    };

    // ===== DOM ELEMENTS =====
    const elements = {
        container: document.getElementById('reelsContainer'),
        scrollHint: document.getElementById('scrollHint'),
        progressBar: document.getElementById('progressBar'),
        loading: document.getElementById('loading')
    };

    // ===== RENDER FUNCTIONS =====
    
    function renderReel(reel, index) {
        const isLiked = state.likedReels.has(reel.id);
        const likeIconClass = isLiked ? 'fas' : 'far';
        const likeColor = isLiked ? 'style="color: #ff3366;"' : '';

        return `
            <article class="reel-item" data-index="${index}" data-id="${reel.id}">
                <div class="reel-media">
                    ${reel.media.type === 'video' 
                        ? `<video src="${reel.media.src}" muted loop playsinline></video>`
                        : `<img src="${reel.media.src}" alt="${reel.title}" loading="lazy">`
                    }
                </div>
                <div class="reel-overlay"></div>
                <div class="reel-content">
                    <div class="reel-badge">
                        <i class="${reel.badge.icon}"></i> ${reel.badge.text}
                    </div>
                    <h2 class="reel-title">${reel.title}</h2>
                    <p class="reel-description">${reel.description}</p>
                    <a href="${reel.link.url}" target="_blank" rel="noopener noreferrer" class="reel-link" data-track="reel-link-${reel.id}">
                        <i class="${reel.link.icon}"></i> ${reel.link.text}
                    </a>
                </div>
                <div class="reel-actions">
                    <div class="action-btn ${isLiked ? 'liked' : ''}" onclick="app.likeReel(${reel.id}, this)" data-track="like-${reel.id}">
                        <i class="${likeIconClass} fa-heart" ${likeColor}></i>
                        <span>${reel.stats.likes}</span>
                    </div>
                    <div class="action-btn" onclick="app.shareReel(${reel.id})" data-track="share-${reel.id}">
                        <i class="fas fa-share"></i>
                        <span>Compartir</span>
                    </div>
                    <div class="action-btn" onclick="app.visitReel(${reel.id})" data-track="visit-${reel.id}">
                        <i class="fas fa-external-link-alt"></i>
                        <span>Visitar</span>
                    </div>
                </div>
                <a href="${reel.smartlink ? ADS_CONFIG.smartlink : reel.link.url}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="cta-button" 
                   data-track="cta-${reel.id}">
                    <i class="${reel.cta.icon}"></i> ${reel.cta.text}
                </a>
            </article>
        `;
    }

    // ===== AD INSERTION =====
    function createNativeBannerAd() {
        return `
            <div class="reel-item reel-ad-item" style="background: linear-gradient(135deg, #1a1a1a, #0a0a0a); display: flex; align-items: center; justify-content: center;">
                <div style="width: 100%; max-width: 400px; padding: 20px; text-align: center;">
                    <div class="reel-badge" style="margin-bottom: 15px;">
                        <i class="fas fa-ad"></i> Patrocinado
                    </div>
                    <div id="container-67e26d16354984487841c0badbdbb792-${Date.now()}"></div>
                    <script async="async" data-cfasync="false" src="https://pl29162396.profitablecpmratenetwork.com/67e26d16354984487841c0badbdbb792/invoke.js"></script>
                    <p style="margin-top: 15px; font-size: 0.8rem; opacity: 0.6;">
                        <i class="fas fa-info-circle"></i> Publicidad
                    </p>
                </div>
            </div>
        `;
    }

    function renderAllReels() {
        if (!elements.container) return;
        
        let html = '';
        REELS.forEach((reel, index) => {
            // Insert Native Banner every 3 reels (after reel 3, 6, 9, etc.)
            if (index > 0 && index % 3 === 0) {
                html += createNativeBannerAd();
            }
            html += renderReel(reel, index);
        });
        
        elements.container.innerHTML = html;
    }

    // ===== INTERACTION FUNCTIONS =====

    function likeReel(reelId, element) {
        const icon = element.querySelector('i');
        const span = element.querySelector('span');
        const isLiked = state.likedReels.has(reelId);

        if (!isLiked) {
            // Like
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#ff3366';
            element.classList.add('liked');
            state.likedReels.add(reelId);

            // Increment counter
            let count = parseFloat(span.textContent) * 1000;
            count += 1;
            span.textContent = (count / 1000).toFixed(1) + 'K';

            // Animation
            icon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                icon.style.transform = 'scale(1)';
            }, 200);
        } else {
            // Unlike
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = '';
            element.classList.remove('liked');
            state.likedReels.delete(reelId);
        }

        // Save to localStorage
        localStorage.setItem('tk-ocean-liked-reels', JSON.stringify([...state.likedReels]));
    }

    function shareReel(reelId) {
        const reel = REELS.find(r => r.id === reelId);
        if (!reel) return;

        const shareData = {
            title: reel.title,
            text: reel.description,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            const text = `${reel.title}\n${reel.description}\n${window.location.href}`;
            navigator.clipboard.writeText(text).then(() => {
                alert('Enlace copiado al portapapeles');
            });
        }
    }

    function visitReel(reelId) {
        const reel = REELS.find(r => r.id === reelId);
        if (reel && reel.link.url) {
            window.open(reel.link.url, '_blank', 'noopener,noreferrer');
        }
    }

    // ===== SCROLL HANDLING =====

    function updateProgressBar() {
        if (!elements.container || !elements.progressBar) return;

        const scrollTop = elements.container.scrollTop;
        const scrollHeight = elements.container.scrollHeight - elements.container.clientHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        
        elements.progressBar.style.width = progress + '%';

        // Update current reel index
        const reelHeight = window.innerHeight;
        const currentIndex = Math.round(scrollTop / reelHeight);
        state.currentReel = currentIndex;
    }

    function handleScroll() {
        if (!elements.container || !elements.scrollHint) return;

        const scrollTop = elements.container.scrollTop;

        // Hide scroll hint after first scroll
        if (scrollTop > 50) {
            elements.scrollHint.classList.add('hidden');
        } else {
            elements.scrollHint.classList.remove('hidden');
        }

        updateProgressBar();
    }

    // ===== VIDEO OBSERVER =====

    function setupVideoObserver() {
        if (!elements.container) return;

        const observerOptions = {
            root: elements.container,
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (video) {
                    if (entry.isIntersecting) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reel-item').forEach(item => {
            observer.observe(item);
        });
    }

    // ===== TRACKING =====

    function setupTracking() {
        document.querySelectorAll('[data-track]').forEach(element => {
            element.addEventListener('click', (e) => {
                const trackId = element.getAttribute('data-track');
                console.log('[REELS TRACK]', trackId, 'clicked');
                
                // Here you could send to analytics
                // gtag('event', 'click', { event_label: trackId });
            });
        });
    }

    // ===== ADS SETUP =====

    function setupAds() {
        // Native Banner is already in HTML
        // Social Bar script is loaded at end of body
        
        console.log('[ADS] Adsterra ads configured');
    }

    // ===== INITIALIZATION =====

    function loadLikedReels() {
        try {
            const saved = localStorage.getItem('tk-ocean-liked-reels');
            if (saved) {
                const liked = JSON.parse(saved);
                state.likedReels = new Set(liked);
            }
        } catch (e) {
            console.warn('[REELS] Could not load liked reels', e);
        }
    }

    function init() {
        console.log('[REELS] Initializing...');

        // Load saved state
        loadLikedReels();

        // Render reels
        renderAllReels();

        // Setup event listeners
        if (elements.container) {
            elements.container.addEventListener('scroll', handleScroll, { passive: true });
        }

        // Setup features
        setupVideoObserver();
        setupTracking();
        setupAds();

        // Hide loading
        if (elements.loading) {
            elements.loading.classList.add('hidden');
        }

        console.log('[REELS] Ready -', REELS.length, 'reels loaded');
    }

    // ===== PUBLIC API =====
    window.app = {
        likeReel,
        shareReel,
        visitReel,
        getState: () => ({ ...state }),
        REELS
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
