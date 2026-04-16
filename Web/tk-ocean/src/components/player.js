const modal = document.getElementById('video-modal');
const player = document.getElementById('video-player');
const closeBtn = document.getElementById('close-video');

function openPlayer(src) {
    if (!modal || !player || !src) return;

    const safeSrc = src.startsWith('http') ? src : src.replace(/^\/?*/, '/');
    player.src = safeSrc;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}

function closePlayer() {
    if (!modal || !player) return;
    player.src = '';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

if (closeBtn) closeBtn.addEventListener('click', closePlayer);
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePlayer();
    });
}

export { openPlayer, closePlayer };
