// Efectos y estilos adicionales para página de capítulos
(function() {
    'use strict';

    // Agregar estilos CSS adicionales
    function agregarEstilosAdicionales() {
        if (document.getElementById('capitulos-extra-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'capitulos-extra-styles';
        styles.textContent = `
            /* Overlay de reproducción - Botón prominente pero no invasivo */
            .absolute.inset-0.bg-black\\/20,
            .absolute.inset-0.bg-black\\/20.flex {
                position: absolute !important;
                inset: auto !important;
                bottom: 1.5rem !important;
                right: 1.5rem !important;
                left: auto !important;
                top: auto !important;
                width: auto !important;
                height: auto !important;
                background: transparent !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                cursor: pointer !important;
                pointer-events: none !important;
                z-index: 10 !important;
            }

            /* La card del overlay - BOTÓN GRANDE Y VISIBLE */
            .absolute.inset-0.bg-black\\/20 .nova-card,
            .absolute.inset-0.bg-black\\/20.flex .nova-card {
                background: linear-gradient(135deg, #00d4ff, #7b2cbf) !important;
                border: 3px solid rgba(255, 255, 255, 0.3) !important;
                border-radius: 1rem !important;
                padding: 1rem 2rem !important;
                backdrop-filter: blur(10px) !important;
                box-shadow: 
                    0 8px 32px rgba(0, 212, 255, 0.5),
                    0 0 60px rgba(0, 212, 255, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
                transition: all 0.3s ease !important;
                display: flex !important;
                align-items: center !important;
                gap: 1rem !important;
                pointer-events: auto !important;
                animation: pulse-glow 2s ease-in-out infinite !important;
            }

            /* Animación de pulso para llamar la atención */
            @keyframes pulse-glow {
                0%, 100% {
                    box-shadow: 
                        0 8px 32px rgba(0, 212, 255, 0.5),
                        0 0 60px rgba(0, 212, 255, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
                }
                50% {
                    box-shadow: 
                        0 12px 40px rgba(0, 212, 255, 0.7),
                        0 0 80px rgba(0, 212, 255, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
                }
            }

            .absolute.inset-0.bg-black\\/20:hover .nova-card,
            .absolute.inset-0.bg-black\\/20.flex:hover .nova-card {
                transform: scale(1.08) !important;
                box-shadow: 
                    0 12px 40px rgba(0, 212, 255, 0.7),
                    0 0 100px rgba(0, 212, 255, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
                animation: none !important;
            }

            /* Texto del capítulo */
            .absolute.inset-0.bg-black\\/20 .text-gradient,
            .absolute.inset-0.bg-black\\/20.flex .text-gradient,
            .absolute.inset-0.bg-black\\/20 .text-2xl.font-black,
            .absolute.inset-0.bg-black\\/20.flex .text-2xl.font-black {
                color: #fff !important;
                font-size: 1.25rem !important;
                font-weight: 800 !important;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
                margin: 0 !important;
            }

            /* Ocultar el texto pequeño */
            .absolute.inset-0.bg-black\\/20 .text-xs,
            .absolute.inset-0.bg-black\\/20.flex .text-xs,
            .absolute.inset-0.bg-black\\/20 p.text-nova-text-muted,
            .absolute.inset-0.bg-black\\/20.flex p.text-nova-text-muted {
                display: none !important;
            }

            /* Icono de play - GRANDE Y VISIBLE */
            .overlay-play-icon {
                position: static !important;
                opacity: 1 !important;
                transform: none !important;
                pointer-events: none !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .overlay-play-icon i {
                font-size: 1.75rem !important;
                color: #fff !important;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) !important;
            }

            /* Responsive - en móvil botón más grande y centrado */
            @media (max-width: 640px) {
                .absolute.inset-0.bg-black\\/20,
                .absolute.inset-0.bg-black\\/20.flex {
                    justify-content: center !important;
                    left: 1rem !important;
                    right: 1rem !important;
                }

                .absolute.inset-0.bg-black\\/20 .nova-card,
                .absolute.inset-0.bg-black\\/20.flex .nova-card {
                    width: 100% !important;
                    max-width: 280px !important;
                    justify-content: center !important;
                    padding: 1.25rem 2rem !important;
                }

                .absolute.inset-0.bg-black\\/20 .text-2xl.font-black,
                .absolute.inset-0.bg-black\\/20.flex .text-2xl.font-black {
                    font-size: 1.5rem !important;
                }

                .overlay-play-icon i {
                    font-size: 2rem !important;
                }
            }

            /* Spinner en overlay */
            .overlay-play-icon .fa-spinner {
                color: #00d4ff !important;
                animation: spin 1s linear infinite !important;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Mejorar botón de volver */
            .btn-volver-serie {
                display: inline-flex !important;
                align-items: center !important;
                gap: 0.75rem !important;
                padding: 0.75rem 1.25rem !important;
                background: rgba(0, 212, 255, 0.1) !important;
                border: 1px solid rgba(0, 212, 255, 0.3) !important;
                border-radius: 0.75rem !important;
                color: #00d4ff !important;
                font-size: 0.9rem !important;
                font-weight: 500 !important;
                text-decoration: none !important;
                margin-bottom: 1.5rem !important;
                transition: all 0.3s ease !important;
                backdrop-filter: blur(5px) !important;
            }

            .btn-volver-serie:hover {
                background: rgba(0, 212, 255, 0.2) !important;
                border-color: rgba(0, 212, 255, 0.5) !important;
                transform: translateX(-5px) !important;
                box-shadow: 0 5px 15px rgba(0, 212, 255, 0.2) !important;
            }

            .btn-volver-serie i {
                font-size: 1rem !important;
            }

            /* Controles de reproducción mejorados */
            .ocean-player-controls {
                background: rgba(0, 0, 0, 0.3) !important;
                padding: 1rem !important;
                border-radius: 1rem !important;
                border: 1px solid rgba(0, 212, 255, 0.2) !important;
                backdrop-filter: blur(10px) !important;
            }

            .ocean-player-controls button {
                transition: all 0.3s ease !important;
            }

            .ocean-player-controls button:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3) !important;
            }

            /* Navegación de episodios - Anterior, Lista, Siguiente */
            section.mb-12 {
                margin-bottom: 2rem !important;
            }

            section.mb-12 .nova-card {
                background: rgba(0, 0, 0, 0.3) !important;
                border: 1px solid rgba(0, 212, 255, 0.2) !important;
                border-radius: 1rem !important;
                padding: 1.25rem !important;
                backdrop-filter: blur(10px) !important;
            }

            section.mb-12 .flex.flex-col.sm\\:flex-row {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                align-items: center !important;
                gap: 0.75rem !important;
            }

            /* Botones de navegación */
            section.mb-12 .nova-button {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0.5rem !important;
                padding: 0.875rem 1.5rem !important;
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(123, 44, 191, 0.15)) !important;
                border: 1px solid rgba(0, 212, 255, 0.3) !important;
                border-radius: 0.75rem !important;
                color: #fff !important;
                font-weight: 600 !important;
                font-size: 0.9rem !important;
                text-decoration: none !important;
                transition: all 0.3s ease !important;
                backdrop-filter: blur(5px) !important;
                min-width: 160px !important;
                position: relative !important;
                overflow: hidden !important;
            }

            /* Botón secundario (Lista de Episodios) */
            section.mb-12 .nova-button.secondary {
                background: rgba(255, 255, 255, 0.05) !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
            }

            /* Efecto hover glow */
            section.mb-12 .nova-button::before {
                content: '' !important;
                position: absolute !important;
                inset: 0 !important;
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(123, 44, 191, 0.3)) !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
                z-index: -1 !important;
            }

            section.mb-12 .nova-button:hover::before {
                opacity: 1 !important;
            }

            section.mb-12 .nova-button:hover {
                transform: translateY(-3px) !important;
                box-shadow: 0 8px 25px rgba(0, 212, 255, 0.25) !important;
                border-color: rgba(0, 212, 255, 0.5) !important;
            }

            section.mb-12 .nova-button.secondary:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.4) !important;
            }

            /* Iconos en botones */
            section.mb-12 .nova-button i {
                font-size: 0.9rem !important;
                transition: transform 0.3s ease !important;
            }

            /* Animación de iconos en hover */
            section.mb-12 .nova-button:hover i.fa-chevron-left {
                transform: translateX(-3px) !important;
            }

            section.mb-12 .nova-button:hover i.fa-chevron-right {
                transform: translateX(3px) !important;
            }

            section.mb-12 .nova-button:hover i.fa-list-ul {
                transform: scale(1.1) !important;
            }

            /* Responsive */
            @media (max-width: 640px) {
                section.mb-12 .nova-button {
                    width: 100% !important;
                    min-width: unset !important;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', agregarEstilosAdicionales);
    } else {
        agregarEstilosAdicionales();
    }
})();
