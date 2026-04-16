/**
 * TK-OCEAN Estilos Detalle - Paso 1: Layout Horizontal
 */

(function() {
    'use strict';

    function estilizarLayoutPrincipal() {
        const main = document.querySelector('main');
        if (!main) return;

        // Encontrar el contenedor principal (el que tiene md:flex)
        const contenedorPrincipal = main.querySelector('.md\\:flex, [class*="flex"]');
        if (!contenedorPrincipal) {
            return;
        }

        // 0. CREAR IMAGEN DE FONDO EN MAIN
        const imgContainer = contenedorPrincipal.querySelector('.md\\:w-72, .lg\\:w-80, [class*="flex-shrink-0"]');
        const imgFondo = imgContainer?.querySelector('img[src*="tmdb.org"]');
        if (imgFondo && main) {
            const imgUrl = imgFondo.src;
            const imgUrlLarge = imgUrl.replace('/w500/', '/original/').replace('/w300/', '/original/').replace('/w200/', '/original/');
            
            // Aplicar fondo al main con efecto de fondo negro semitransparente y parallax
            main.style.cssText = `
                background-image: linear-gradient(180deg, 
                    rgba(10,10,15,0.7) 30%, 
                    rgba(10,10,15,0.7) 30%, 
                    rgba(10,10,15,0.85) 70%, 
                    rgba(10,10,15,1) 100%), 
                    url('${imgUrlLarge}');
                background-size: cover;
                background-position: center 0%;
                background-repeat: no-repeat;
                position: relative;
            `;
            
            // Efecto de animación tipo video - movimiento oscilante suave
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
                @keyframes videoZoom {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(videoEffectStyle);
            
            // Efecto parallax suave al scroll
            let lastScrollY = window.scrollY;
            let currentBgY = 0;
            let targetBgY = 0;
            
            // Animación de loop suave tipo video
            let time = 0;
            function animateBackground() {
                time += 0.005;
                const loopOffset = Math.sin(time) * 3; // Oscilación suave de ±3%
                
                // Interpolación suave hacia el target
                currentBgY += (targetBgY - currentBgY) * 0.1;
                
                // Combinar loop + parallax
                const finalY = currentBgY + loopOffset;
                main.style.backgroundPosition = `center ${finalY}%`;
                
                requestAnimationFrame(animateBackground);
            }
            animateBackground();
            
            // Actualizar target al hacer scroll
            window.addEventListener('scroll', function() {
                lastScrollY = window.scrollY;
                const scrollPercent = lastScrollY / (document.body.scrollHeight - window.innerHeight);
                targetBgY = scrollPercent * 30; // Máximo 30% de desplazamiento
            }, { passive: true });
        }

        // 1. LAYOUT RESPONSIVE - Horizontal en desktop, vertical en móvil
        const isMobile = window.innerWidth < 768;
        contenedorPrincipal.style.cssText = `
            display: flex !important;
            flex-direction: ${isMobile ? 'column' : 'row'} !important;
            flex-wrap: ${isMobile ? 'nowrap' : 'nowrap'} !important;
            gap: 2rem !important;
            align-items: ${isMobile ? 'center' : 'flex-start'} !important;
            padding: 2rem !important;
            border: none !important;
            background-color: transparent !important;
        `;

        // 2. ESTILIZAR CONTENEDOR DE IMAGEN (izquierda) - MÁS GRANDE
        if (imgContainer) {
            // Responsive: en móvil ocupa todo el ancho centrado, en desktop 380px
            imgContainer.style.cssText = `
                flex-shrink: 0 !important;
                width: ${isMobile ? '100%' : '380px'} !important;
                max-width: ${isMobile ? '280px' : '100%'} !important;
                position: relative !important;
                order: ${isMobile ? '0' : '0'} !important;
                margin: ${isMobile ? '0 auto' : '0'} !important;
            `;
            
            // Quitar overlay de play
            const overlay = imgContainer.querySelector('.absolute.inset-0');
            if (overlay && overlay.querySelector('.fa-play')) {
                overlay.style.display = 'none';
            }

            // Mejorar la imagen
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

        // 3. ESTILIZAR CONTENEDOR DE INFO (derecha)
        const infoContainer = contenedorPrincipal.querySelector('.flex-1');
        if (infoContainer) {
            infoContainer.style.cssText = `
                flex: 1 !important;
                padding: 0 !important;
                order: ${isMobile ? '1' : '1'} !important;
                width: 100% !important;
            `;

            // Mejorar el H1
            const h1 = infoContainer.querySelector('h1');
            if (h1) {
                h1.style.cssText = `
                    font-size: 2.5rem !important;
                    font-weight: 900 !important;
                    color: white !important;
                    margin-bottom: 1rem !important;
                    text-shadow: 0 0 20px rgba(0,212,255,0.3) !important;
                `;
            }

            // 4. MOVER BOTÓN VER AHORA - debajo del H1
            const botonVer = infoContainer.querySelector('button[data-action="ver"]') || infoContainer.querySelector('button[onclick*="activarReproduccion"]');
            if (botonVer && h1) {
                // Estilos para el botón VER AHORA
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

                // Eventos hover
                botonVer.onmouseover = function() {
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 0 30px rgba(0,212,255,0.5)';
                };
                botonVer.onmouseout = function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 8px 25px rgba(0,212,255,0.3)';
                };

                // Mover el botón para que esté justo después del h1
                h1.parentNode.insertBefore(botonVer, h1.nextSibling);
            }

            // 5. ESTILIZAR BOTÓN REPORTAR FALLO (estilo sutil como en series)
            const btnReportar = infoContainer.querySelector('button[data-action="reportar"], .btn-reportar');
            if (btnReportar) {
                btnReportar.className = 'nova-card px-4 py-2 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all';
                btnReportar.style.cssText = '';
            }
        }

        // Agregar keyframes para la animación del gradiente
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

    }

    // API pública para que confi-detalle.js pueda llamar
    window.TKOceanDetailEffects = {
        init: function() {
            estilizarLayoutPrincipal();
        },
        reset: function() {
        }
    };

    // Ejecutar cuando el DOM esté listo (por si se carga directamente)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', estilizarLayoutPrincipal);
    } else {
        setTimeout(estilizarLayoutPrincipal, 500);
    }

    // Exponer función para re-ejecutar si es necesario
    window.TKOceanEstilosPaso1 = estilizarLayoutPrincipal;
})();