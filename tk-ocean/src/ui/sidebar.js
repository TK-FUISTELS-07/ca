// src/ui/sidebar.js
// Usa variable global CONFIG definida en config.js

function performSearch(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('searchInput');
    const query = input && input.value.trim();
    if (!query) {
        const status = document.getElementById('status-label');
        if (status) status.textContent = 'Escribe un término para buscar';
        return false;
    }
    window.location.href = `${window.CONFIG.BASE_URL}/search?q=${encodeURIComponent(query)}`;
    return false;
}

function toggleCompactSubmenu(submenuId) {
    const submenu = document.getElementById(submenuId + '-submenu');
    const arrow = document.getElementById(submenuId + '-arrow');

    if (!submenu) return;
    const expanded = !submenu.classList.contains('hidden');

    if (expanded) {
        submenu.classList.add('hidden');
        submenu.style.maxHeight = '0';
        submenu.style.opacity = '0';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        submenu.classList.remove('hidden');
        submenu.style.maxHeight = submenu.scrollHeight + 'px';
        submenu.style.opacity = '1';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

let isSidebarOpen = false;
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
    document.body.classList.add('overflow-hidden');
    isSidebarOpen = true;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.classList.add('hidden'), 300);
    document.body.classList.remove('overflow-hidden');
    isSidebarOpen = false;
}

function toggleSidebar() {
    if (isSidebarOpen) closeSidebar(); else openSidebar();
}

window.performSearch = performSearch;
window.toggleCompactSubmenu = toggleCompactSubmenu;
window.toggleSidebar = toggleSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

window.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('sidebar-toggle');
    if (burger) burger.addEventListener('click', toggleSidebar);

    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    const search = document.getElementById('searchInput');
    if (search) {
        search.addEventListener('keypress', e => {
            if (e.key === 'Enter') performSearch(e);
        });
    }
});
