import { openPlayer, closePlayer } from './player.js';

const detailElement = document.getElementById('detail-section');

function renderDetail(item = {}, episodes = []) {
    if (!detailElement) return;

    detailElement.innerHTML = '';

    const wrapper = document.createElement('article');
    wrapper.className = 'detail-pane';

    const title = document.createElement('h2');
    title.textContent = item.title || 'Detalle';

    const subtitle = document.createElement('p');
    subtitle.innerHTML = `<strong>Tipo:</strong> ${item.type} ${item.genre ? `• ${item.genre}` : ''}`;

    const description = document.createElement('p');
    description.textContent = item.description || 'Sin descripción disponible.';

    const textMeta = document.createElement('p');
    textMeta.innerHTML = `<strong>Publicado:</strong> ${item.datePublished || 'N/A'} ${item.rating ? `• ⭐ ${item.rating}` : ''}`;

    wrapper.append(title, subtitle, textMeta, description);

    if (item.image) {
        const cover = document.createElement('img');
        cover.src = item.image;
        cover.alt = item.title;
        cover.style.maxWidth = '250px';
        cover.style.borderRadius = '10px';
        cover.style.display = 'block';
        cover.style.marginTop = '1rem';
        wrapper.appendChild(cover);
    }

    if (item.url) {
        const openLink = document.createElement('button');
        openLink.textContent = 'Ver en servidor original';
        openLink.className = 'nova-button';
        openLink.style.marginTop = '1rem';
        openLink.addEventListener('click', () => window.open(item.url, '_blank', 'noopener'));
        wrapper.appendChild(openLink);
    }

    if (episodes.length) {
        const eps = document.createElement('section');
        eps.style.marginTop = '1rem';
        eps.innerHTML = `<h3>Episodios</h3>`;
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        episodes.slice(0, 30).forEach(ep => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${ep.url}" class="spa-link">${ep.title}</a>`;
            li.style.margin = '0.25rem 0';
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                openPlayer(ep.url);
            });
            list.appendChild(li);
        });

        eps.appendChild(list);
        wrapper.appendChild(eps);
    }

    detailElement.appendChild(wrapper);
}

export { renderDetail };
