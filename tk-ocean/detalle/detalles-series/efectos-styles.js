/**
 * TK-OCEAN Estilos Detalle Series - Layout Horizontal
 */

(function () {
    'use strict';

    function estilizarLayoutPrincipal() {
        const main = document.querySelector('main');
        if (!main) return;

        const contenedorPrincipal = main.querySelector('.md\\:flex, [class*="flex"]');
        if (!contenedorPrincipal) return;

        const imgContainer = contenedorPrincipal.querySelector('.md\\:w-72, .lg\\:w-80, [class*="flex-shrink-0"]');
        const imgFondo = imgContainer?.querySelector('img[src*="tmdb.org"]');

        if (imgFondo && main) {
            const imgUrl = imgFondo.src;
            const imgUrlLarge = imgUrl.replace('/w500/', '/original/').replace('/w300/', '/original/').replace('/w200/', '/original/');

            main.style.cssText = `
                background-image: linear-gradient(180deg, 
                    rgba(10,10,15,0.7) 30%, 
                    rgba(10,10,15,0.85) 70%, 
                    rgba(10,10,15,1) 100%), 
                    url('${imgUrlLarge}');
                background-size: cover;
                background-position: center 0%;
                background-repeat: no-repeat;
                position: relative;
            `;

            const videoEffectStyle = document.createElement('style');
            videoEffectStyle.id = 'tk-video-effect';
            videoEffectStyle.textContent = `
                @keyframes videoPan {
                    0% { background-position: center 0%, center 0%; }
                    25% { background-position: center 5%, center 2%; }
                    50% { background-position: center 10%, center 0%; }
                    75% { background-position: center 5%, center -2%; }
                    100% { background-position: center 0%, center 0%; }
                }
            `;
            document.head.appendChild(videoEffectStyle);

            let currentBgY = 0;
            let targetBgY = 0;
            let time = 0;

            function animateBackground() {
                time += 0.005;
                const loopOffset = Math.sin(time) * 3;
                currentBgY += (targetBgY - currentBgY) * 0.1;
                main.style.backgroundPosition = `center ${currentBgY + loopOffset}%`;
                requestAnimationFrame(animateBackground);
            }
            animateBackground();

            window.addEventListener('scroll', function () {
                const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
                targetBgY = scrollPercent * 30;
            }, { passive: true });
        }

        const isMobile = window.innerWidth < 768;
        contenedorPrincipal.style.cssText = `
            display: flex !important;
            flex-direction: ${isMobile ? 'column' : 'row'} !important;
            gap: 2rem !important;
            align-items: ${isMobile ? 'center' : 'flex-start'} !important;
            padding: 2rem !important;
            border: none !important;
            background-color: transparent !important;
        `;

        if (imgContainer) {
            imgContainer.style.cssText = `
                flex-shrink: 0 !important;
                width: ${isMobile ? '100%' : '380px'} !important;
                max-width: ${isMobile ? '280px' : '100%'} !important;
                margin: ${isMobile ? '0 auto' : '0'} !important;
            `;

            const overlay = imgContainer.querySelector('.absolute.inset-0');
            if (overlay && overlay.querySelector('.fa-play')) {
                overlay.style.display = 'none';
            }

            const img = imgContainer.querySelector('img');
            if (img) {
                img.style.cssText = `
                    width: 100% !important;
                    height: auto !important;
                    border-radius: 1rem !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
                `;
            }
        }

        const infoContainer = contenedorPrincipal.querySelector('.flex-1');
        if (infoContainer) {
            infoContainer.style.cssText = `
                flex: 1 !important;
                padding: 0 !important;
                width: 100% !important;
            `;

            // 4. MOVER BOTÓN VER AHORA - debajo del H1
            const h1 = infoContainer.querySelector('h1');
            const botonVer = infoContainer.querySelector('button[data-action="ver"], .btn-ver-ahora');
            if (botonVer && h1) {
                botonVer.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 0.5rem !important;
                    padding: 1rem 2rem !important;
                    font-size: 1rem !important;
                    font-weight: 800 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 0.75rem !important;
                    cursor: pointer !important;
                    background: linear-gradient(90deg, #00d4ff, #7b2cbf, #00d4ff) !important;
                    background-size: 200% 100% !important;
                    animation: gradientMove 3s ease infinite !important;
                    box-shadow: 0 8px 25px rgba(0,212,255,0.3) !important;
                    transition: all 0.3s ease !important;
                    margin-bottom: 1.5rem !important;
                `;

                botonVer.onmouseover = function () {
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 0 30px rgba(0,212,255,0.5)';
                };
                botonVer.onmouseout = function () {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 8px 25px rgba(0,212,255,0.3)';
                };

                h1.parentNode.insertBefore(botonVer, h1.nextSibling);
            }

            const btnReportar = infoContainer.querySelector('button[data-action="reportar"], .btn-reportar');
            if (btnReportar) {
                btnReportar.className = 'nova-card px-4 py-2 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all';
                btnReportar.style.cssText = '';
            }
        }

        if (!document.querySelector('#tk-ocean-animations')) {
            const style = document.createElement('style');
            style.id = 'tk-ocean-animations';
            style.textContent = `
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `;
            document.head.appendChild(style);
        }

        // === REORGANIZAR CAPITULOS EN SELECTOR DE TEMPORADAS ===
        // Ejecutar inmediatamente sin delay para evitar flash del contenido original
        reorganizarCapitulosEnTemporadas();
    }

    // === FUNCIÓN PARA REORGANIZAR CAPÍTULOS ===
    function reorganizarCapitulosEnTemporadas() {
        const contenedorOriginal = document.querySelector('.p-6.space-y-4');
        if (!contenedorOriginal) return;

        // Ocultar contenedor inmediatamente para evitar flash del contenido original
        contenedorOriginal.style.opacity = '0';
        contenedorOriginal.style.transition = 'opacity 0.2s ease';

        // Verificar si ya fue reorganizado
        if (contenedorOriginal.querySelector('.tk-temporadas-layout')) return;

        // Extraer todas las temporadas y capítulos
        const temporadas = [];
        const botonesTemporada = contenedorOriginal.querySelectorAll('button[onclick^="toggleSeason"]');

        botonesTemporada.forEach((btn, index) => {
            const onclickAttr = btn.getAttribute('onclick');
            const temporadaId = onclickAttr?.match(/'(\d+)'/)?.[1] || index.toString();
            const tituloTemp = btn.querySelector('.font-bold')?.textContent || `Temporada ${index + 1}`;
            const cantidadEpisodios = btn.querySelector('.text-xs')?.textContent || '';

            // Encontrar el contenedor de capítulos de esta temporada
            const capitulosContainer = contenedorOriginal.querySelector(`#season-${temporadaId}`);
            // Los capítulos son enlaces con clase 'nova-card' dentro del contenedor de temporada
            const linksCapitulos = capitulosContainer?.querySelectorAll('a.nova-card[href*="capitulo"], a[href*="/temporada/"][href*="/capitulo/"]') || [];

            // Obtener tipo y slug de la URL actual
            const urlParams = new URLSearchParams(window.location.search);
            const tipoActual = urlParams.get('tipo') || 'serie';
            const slugActual = urlParams.get('slug') || '';

            temporadas.push({
                id: temporadaId,
                titulo: tituloTemp,
                cantidad: cantidadEpisodios,
                capitulos: Array.from(linksCapitulos).map(link => {
                    const hrefOriginal = link.getAttribute('href') || '';
                    const numeroCap = link.querySelector('.nova-badge')?.textContent ||
                        hrefOriginal.match(/capitulo\/(\d+)/)?.[1] || '';
                    // El título está en el span con clase 'text-nova-text' o en cualquier span
                    const tituloCap = link.querySelector('span.text-nova-text')?.textContent ||
                        link.querySelector('span')?.textContent ||
                        `Capítulo ${numeroCap}`;

                    // Extraer número de capítulo del href original
                    let numCap = numeroCap.toString().replace(/\D/g, ''); // Quitar todo lo que no sea número
                    if (!numCap) {
                        const match = hrefOriginal.match(/capitulo[/\-](\d+)/i);
                        if (match) numCap = match[1];
                    }

                    // Construir slug interno
                    const tempNum = parseInt(temporadaId) + 1;
                    let slugCap = '';

                    // Intentar extraer slug de serie del href original
                    const slugMatch = hrefOriginal.match(/(?:serie|anime|dorama)\/([^/]+)/);
                    if (slugMatch) {
                        slugCap = `${tipoActual}/${slugMatch[1]}/temporada/${tempNum}/capitulo/${numCap}`;
                    } else if (slugActual) {
                        // Usar slug de la URL actual - asegurar que incluya el tipo
                        let baseSlug = slugActual.split('/temporada/')[0];
                        // Si el baseSlug no incluye el tipo, agregarlo
                        if (!baseSlug.includes('/')) {
                            baseSlug = `${tipoActual}/${baseSlug}`;
                        }
                        slugCap = `${baseSlug}/temporada/${tempNum}/capitulo/${numCap}`;
                    } else {
                        // Fallback: usar un slug genérico
                        slugCap = `${tipoActual}/temporada/${tempNum}/capitulo/${numCap}`;
                    }

                    // Construir URL interna
                    const hrefInterno = `/${CONFIG.BASE_URL}/detalle/detalles-series/capitulos/?tipo=${tipoActual}&slug=${encodeURIComponent(slugCap)}`.replace(/\/+/g, '/');

                    return {
                        href: hrefInterno,
                        hrefOriginal: hrefOriginal, // Guardar original para reproducción directa
                        numero: `E${numCap}`,
                        titulo: tituloCap
                    };
                })
            });
        });

        if (temporadas.length === 0) return;

        // Crear nuevo layout
        const nuevoLayout = document.createElement('div');
        nuevoLayout.className = 'tk-temporadas-layout';

        const primeraTemporada = temporadas[0];

        nuevoLayout.innerHTML = `
            <div class="tk-temporadas-wrapper">
                <button class="tk-btn-toggle-temps" onclick="toggleTemporadasDropdown()">
                    <i class="fas fa-layer-group"></i>
                    <span>Temporadas</span>
                    <i class="fas fa-chevron-down tk-chevron"></i>
                </button>
                <div class="tk-temporadas-dropdown" id="tk-temps-dropdown">
                    <div class="tk-temporadas-scroll">
                        ${temporadas.map((temp, idx) => `
                            <button class="tk-btn-temporada ${idx === 0 ? 'tk-activa' : ''}" 
                                    data-temporada="${temp.id}" 
                                    onclick="seleccionarTemporada('${temp.id}', this)">
                                <span class="tk-temp-num">T${parseInt(temp.id) + 1}</span>
                                <span class="tk-temp-info">
                                    <span class="tk-temp-nombre">${temp.titulo}</span>
                                    <span class="tk-temp-caps">${temp.cantidad}</span>
                                </span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="tk-capitulos-panel">
                <div class="tk-capitulos-header">
                    <div class="tk-capitulos-titulo-wrapper">
                        <h4 class="tk-capitulos-titulo" id="tk-cap-titulo-temp">${primeraTemporada.titulo}</h4>
                        <span class="tk-capitulos-subtitulo" id="tk-cap-subtitulo">${primeraTemporada.cantidad}</span>
                    </div>
                </div>
                <div class="tk-capitulos-scroll">
                    ${temporadas.map((temp, idx) => `
                        <div class="tk-capitulos-temporada ${idx === 0 ? 'tk-visible' : 'tk-oculta'}" data-temporada="${temp.id}">
                            ${temp.capitulos.map(cap => `
                                <div class="tk-capitulo-card" data-ocean-fixed="true" onclick="reproducirCapituloDirectoDesdeCard(event, window.CONFIG.utils.extractPathFromMirror('${cap.href}'), '${temp.id}', '${cap.numero.replace(/'/g, "\\'")}', '${cap.titulo.replace(/'/g, "\\'")}')">
                                    <div class="tk-cap-numero">${cap.numero}</div>
                                    <div class="tk-cap-info">
                                        <span class="tk-cap-titulo">${cap.titulo}</span>
                                    </div>
                                    <a href="${cap.href}" class="tk-cap-play-btn" onclick="return navegarADetalleCapitulo(event)">
                                        <i class="fas fa-info-circle"></i>
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Reemplazar contenido original
        contenedorOriginal.innerHTML = '';
        contenedorOriginal.appendChild(nuevoLayout);

        // Agregar estilos CSS
        agregarEstilosTemporadas();

        // Mostrar contenedor con animación suave
        requestAnimationFrame(() => {
            contenedorOriginal.style.opacity = '1';
        });

        // Exponer funciones globales
        window.toggleTemporadasDropdown = function () {
            const dropdown = document.getElementById('tk-temps-dropdown');
            const chevron = document.querySelector('.tk-btn-toggle-temps .tk-chevron');
            const isOpen = dropdown.classList.toggle('tk-open');
            chevron.classList.toggle('tk-rotate');

            // Crear/eliminar overlay en móvil
            if (window.innerWidth <= 768) {
                let overlay = document.getElementById('tk-temps-overlay');
                if (isOpen) {
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'tk-temps-overlay';
                        overlay.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0,0,0,0.8);
                            backdrop-filter: blur(5px);
                            z-index: 99;
                            transition: opacity 0.3s ease;
                            opacity: 0;
                        `;
                        overlay.onclick = function () {
                            toggleTemporadasDropdown();
                        };
                        document.body.appendChild(overlay);
                        setTimeout(() => overlay.style.opacity = '1', 10);
                    }
                } else if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 300);
                }
            }
        };

        window.seleccionarTemporada = function (tempId, btn) {
            // Actualizar botón activo
            document.querySelectorAll('.tk-btn-temporada').forEach(b => b.classList.remove('tk-activa'));
            btn.classList.add('tk-activa');

            // Actualizar título
            const tempData = temporadas.find(t => t.id === tempId);
            if (tempData) {
                document.getElementById('tk-cap-titulo-temp').textContent = tempData.titulo;
                document.getElementById('tk-cap-subtitulo').textContent = tempData.cantidad;
            }

            // Mostrar capítulos de esta temporada
            document.querySelectorAll('.tk-capitulos-temporada').forEach(container => {
                if (container.dataset.temporada === tempId) {
                    container.classList.remove('tk-oculta');
                    container.classList.add('tk-visible');
                } else {
                    container.classList.remove('tk-visible');
                    container.classList.add('tk-oculta');
                }
            });

            // Cerrar dropdown y overlay en móvil
            if (window.innerWidth <= 768) {
                document.getElementById('tk-temps-dropdown').classList.remove('tk-open');
                document.querySelector('.tk-btn-toggle-temps .tk-chevron').classList.remove('tk-rotate');
                const overlay = document.getElementById('tk-temps-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 300);
                }
            }
        };

        // Cerrar dropdown al hacer click fuera (solo en desktop)
        document.addEventListener('click', function (e) {
            const wrapper = document.querySelector('.tk-temporadas-wrapper');
            const dropdown = document.getElementById('tk-temps-dropdown');
            if (wrapper && !wrapper.contains(e.target) && window.innerWidth > 768) {
                const chevron = document.querySelector('.tk-btn-toggle-temps .tk-chevron');
                if (dropdown) dropdown.classList.remove('tk-open');
                if (chevron) chevron.classList.remove('tk-rotate');
            }
        });

        // Navegar a la página de detalle del capítulo (desde el botón info)
        window.navegarADetalleCapitulo = function (event) {
            // Detener propagación para que no llegue al card padre
            event.stopPropagation();
            // Permitir navegación normal del link
            return true;
        };

    }

    function agregarEstilosTemporadas() {
        if (document.querySelector('#tk-temporadas-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'tk-temporadas-styles';
        styles.textContent = `
            .tk-temporadas-layout {
                display: grid;
                grid-template-columns: 40% 60%;
                gap: 1.5rem;
                min-height: 500px;
            }
            
            /* Botón Toggle Temporadas */
            .tk-temporadas-wrapper {
                position: sticky;
                top: 1rem;
                height: fit-content;
            }
            
            .tk-btn-toggle-temps {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                background: rgba(0,212,255,0.1);
                border: 1px solid rgba(0,212,255,0.3);
                border-radius: 1rem;
                color: #00d4ff;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
                backdrop-filter: blur(10px);
                width: 100%;
            }
            
            .tk-btn-toggle-temps:hover {
                background: rgba(0,212,255,0.2);
                border-color: rgba(0,212,255,0.5);
                box-shadow: 0 0 20px rgba(0,212,255,0.2);
            }
            
            .tk-btn-toggle-temps i:first-child {
                font-size: 1.1rem;
            }
            
            .tk-btn-toggle-temps .tk-chevron {
                transition: transform 0.3s ease;
                margin-left: auto;
            }
            
            .tk-btn-toggle-temps .tk-chevron.tk-rotate {
                transform: rotate(180deg);
            }
            
            /* Dropdown de Temporadas */
            .tk-temporadas-dropdown {
                position: absolute;
                top: calc(100% + 0.5rem);
                left: 0;
                right: 0;
                width: 100%;
                max-height: 0;
                overflow: hidden;
                background: rgba(10,15,30,0.95);
                border: 1px solid rgba(0,212,255,0.2);
                border-radius: 1rem;
                backdrop-filter: blur(20px);
                z-index: 100;
                transition: max-height 0.3s ease, opacity 0.3s ease;
                opacity: 0;
            }
            
            .tk-temporadas-dropdown.tk-open {
                max-height: 400px;
                opacity: 1;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            
            .tk-temporadas-scroll {
                max-height: 400px;
                overflow-y: auto;
                padding: 0.75rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .tk-temporadas-scroll::-webkit-scrollbar {
                width: 6px;
            }
            
            .tk-temporadas-scroll::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.2);
                border-radius: 3px;
            }
            
            .tk-temporadas-scroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #00d4ff, #7b2cbf);
                border-radius: 3px;
            }
            
            .tk-btn-temporada {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(0,212,255,0.1);
                border-radius: 0.75rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
                width: 100%;
                min-width: 0;
            }
            
            .tk-temp-nombre {
                font-weight: 600;
                font-size: 0.85rem;
                color: white;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .tk-btn-temporada:hover {
                background: rgba(0,212,255,0.1);
                border-color: rgba(0,212,255,0.3);
                transform: translateX(5px);
            }
            
            .tk-btn-temporada.tk-activa {
                background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,44,191,0.2));
                border-color: #00d4ff;
                box-shadow: 0 0 15px rgba(0,212,255,0.2);
            }
            
            .tk-temp-num {
                min-width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #00d4ff, #7b2cbf);
                border-radius: 0.5rem;
                font-weight: 700;
                font-size: 0.85rem;
                color: white;
            }
            
            .tk-temp-info {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }
            
            .tk-temp-caps {
                font-size: 0.75rem;
                color: rgba(255,255,255,0.5);
            }
            
            /* Panel de Capítulos */
            .tk-capitulos-panel {
                background: rgba(0,0,0,0.2);
                border-radius: 1rem;
                padding: 1.5rem;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(0,212,255,0.1);
                display: flex;
                flex-direction: column;
                min-height: 500px;
            }
            
            .tk-capitulos-header {
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(0,212,255,0.2);
            }
            
            .tk-capitulos-titulo-wrapper {
                display: flex;
                align-items: baseline;
                gap: 1rem;
                flex-wrap: wrap;
            }
            
            .tk-capitulos-titulo {
                color: #00d4ff;
                font-size: 1.4rem;
                font-weight: 700;
                margin: 0;
                text-shadow: 0 0 20px rgba(0,212,255,0.3);
            }
            
            .tk-capitulos-subtitulo {
                color: rgba(255,255,255,0.6);
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .tk-capitulos-scroll {
                flex: 1;
                overflow-y: auto;
                max-height: 450px;
                padding-right: 0.5rem;
            }
            
            .tk-capitulos-scroll::-webkit-scrollbar {
                width: 6px;
            }
            
            .tk-capitulos-scroll::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.2);
                border-radius: 3px;
            }
            
            .tk-capitulos-scroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #00d4ff, #7b2cbf);
                border-radius: 3px;
            }
            
            .tk-capitulos-temporada {
                display: none;
            }
            
            .tk-capitulos-temporada.tk-visible {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                animation: fadeInSlide 0.4s ease;
            }
            
            @keyframes fadeInSlide {
                from { 
                    opacity: 0; 
                    transform: translateX(20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateX(0); 
                }
            }
            
            .tk-capitulo-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.25rem;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(0,212,255,0.1);
                border-radius: 0.75rem;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                cursor: pointer;
                user-select: none;
            }
            
            .tk-capitulo-card:hover {
                background: rgba(0,212,255,0.1);
                border-color: rgba(0,212,255,0.3);
                transform: translateX(10px);
                box-shadow: 0 5px 20px rgba(0,212,255,0.15);
            }
            
            .tk-cap-numero {
                min-width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,212,255,0.15);
                border: 1px solid rgba(0,212,255,0.3);
                border-radius: 0.5rem;
                font-weight: 700;
                color: #00d4ff;
                font-size: 0.9rem;
            }
            
            .tk-cap-info {
                flex: 1;
                min-width: 0;
            }
            
            .tk-cap-titulo {
                color: white;
                font-weight: 500;
                font-size: 0.95rem;
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .tk-cap-play-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #00d4ff, #7b2cbf);
                border-radius: 50%;
                color: white;
                font-size: 0.8rem;
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s ease;
                text-decoration: none;
                cursor: pointer;
                pointer-events: auto;
            }
            
            .tk-cap-play-btn:hover {
                color: white;
                transform: scale(1.1);
            }
            
            .tk-capitulo-card:hover .tk-cap-play-btn {
                opacity: 1;
                transform: scale(1);
            }
            
            /* Responsive - Modal flotante en móvil */
            @media (max-width: 768px) {
                .tk-temporadas-layout {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .tk-temporadas-wrapper {
                    position: relative;
                }
                
                /* Modal flotante centrado */
                .tk-temporadas-dropdown {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    right: auto;
                    transform: translate(-50%, -50%) scale(0.9);
                    width: 90%;
                    max-width: 350px;
                    max-height: 0;
                    opacity: 0;
                    border-radius: 1rem;
                    z-index: 100;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                }
                
                .tk-temporadas-dropdown.tk-open {
                    max-height: 70vh;
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                
                .tk-temporadas-scroll {
                    max-height: 70vh;
                    padding: 1rem;
                }
                
                .tk-btn-toggle-temps {
                    width: 100%;
                    justify-content: center;
                }
                
                .tk-capitulos-panel {
                    min-height: 400px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    window.TKOceanDetailEffects = {
        init: function () {
            estilizarLayoutPrincipal();
        },
        reset: function () {
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', estilizarLayoutPrincipal);
    } else {
        setTimeout(estilizarLayoutPrincipal, 500);
    }

    window.TKOceanEstilosPaso1 = estilizarLayoutPrincipal;
})();
