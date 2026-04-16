import { navigate } from '../core/router.js';

const links = [
    { name: 'Inicio', path: '/' },
    { name: 'Películas', path: '/peliculas' },
    { name: 'Series', path: '/series' },
    { name: 'Animes', path: '/animes' },
    { name: 'Comedia', path: '/generos/comedia' },
    { name: '2023', path: '/year/2023' }
];

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const ul = sidebar.querySelector('ul');
    if (!ul) return;

    ul.innerHTML = '';

    links.forEach((item) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = item.name;
        button.className = item.path === '/' ? 'active' : '';
        button.addEventListener('click', (ev) => {
            ev.preventDefault();
            document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            navigate(item.path);
        });

        li.appendChild(button);
        ul.appendChild(li);
    });

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('searchInput');
    if (!searchForm || !searchInput) return;

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const q = (searchInput.value || '').trim();
        if (!q) return;
        const searchRoute = `/search?s=${encodeURIComponent(q)}`;
        navigate(searchRoute);
    });
}

export { initSidebar };
