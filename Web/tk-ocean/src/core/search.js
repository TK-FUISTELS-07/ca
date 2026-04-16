// /src/core/search.js
export const GlobalSearch = {
    init: (state) => {
        const searchInput = document.getElementById('navSearchInput');
        const clearBtn = document.querySelector('.clear-btn');

        if (!searchInput) return;

        // Sincronizar el input con la URL si ya hay una búsqueda
        if (state.query) searchInput.value = state.query;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(state.searchTimer);
            const query = e.target.value.trim();

            state.searchTimer = setTimeout(() => {
                if (query.length > 0) {
                    // Mantiene la carpeta actual (?s=) en lugar de ir a index.html
                    window.location.href = `?s=${encodeURIComponent(query)}`;
                } else if (state.view === 'search' && query.length === 0) {
                    // Si se borra, vuelve a la vista normal de la sección
                    window.location.href = `?view=todas`;
                }
            }, 800);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                window.location.href = `?view=todas`;
            });
        }

        // Evitar que el Enter rompa la carga
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
    }
};