import { upgradeImageUrl, upgradeImagesInContainer } from '../core/api.js';

const gridElement = document.getElementById('grid');

function createCard(item, onClick) {
    const card = document.createElement('article');
    card.className = 'movie-card';

    const img = document.createElement('img');
    img.src = item.image ? upgradeImageUrl(item.image) : 'https://via.placeholder.com/300x450?text=sin+imagen';
    img.alt = item.title;
    img.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'info';

    const title = document.createElement('h3');
    title.textContent = item.title;

    const meta = document.createElement('p');
    const parts = [];
    if (item.datePublished) parts.push(item.datePublished);
    if (item.rating) parts.push(`⭐ ${item.rating}`);
    meta.textContent = parts.join(' • ');

    info.append(title, meta);

    card.append(img, info);
    card.addEventListener('click', () => onClick(item));

    return card;
}

function renderGrid(items = [], onCardClick = () => { }) {
    if (!gridElement) return;
    gridElement.innerHTML = '';

    if (!items.length) {
        gridElement.innerHTML = '<p>No hay resultados</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const card = createCard(item, onCardClick);
        fragment.appendChild(card);
    });

    gridElement.appendChild(fragment);
    upgradeImagesInContainer(gridElement);
}

export { renderGrid };
