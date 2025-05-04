document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const bodyContainer = document.getElementById('body-container');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const messageOverlay = document.getElementById('message-overlay');
    const startScreen = document.getElementById('start-screen');
    const finalScreen = document.getElementById('final-screen');
    const finalMessageName = document.getElementById('final-message-name');
    const finalMessageText = document.getElementById('final-message-text');
    const restartButton = document.getElementById('restart-button');
    // const interactionSound = document.getElementById('interaction-sound'); // Descomentar si usas sonido

    // --- Estado del Juego ---
    let width, height;
    let particles = [];
    let interactionData = { count: 0, lastPoint: null, isDragging: false };
    let currentLevel = 0;
    let gameActive = false;
    let isTransitioning = false;
    let animationFrameId = null;
    let userName = "Explorador Estelar"; // Nombre por defecto más temático
    const MAX_PARTICLES_PER_LEVEL = [150, 250, 350]; // Límites más altos
    const PARTICLE_TRAIL_OPACITY = [0.15, 0.12, 0.1]; // Opacidad del rastro por nivel

    // --- Configuración de Niveles Detallada ---
    const levels = [
        { // Nivel 1: Polvo Estelar
            particleBaseSize: 1.5, sizeVariation: 1.5,
            baseSpeed: 0.4, speedVariation: 0.8,
            colors: ['#FFFFFF', '#FFFACD', '#F0FFFF', '#FFFAF0'], // Blancos, cremas, azules muy pálidos
            messages: [
                "Un susurro en el cosmos...",
                "Cada toque crea una estrella fugaz.",
                "Sigue la estela luminosa.",
                "El universo te da la bienvenida.",
                "La calma antes del viaje...",
            ],
            interactionsToNextLevel: 60,
            particleType: 'starDust',
            createRate: 3, // Partículas por toque/movimiento
            pushForce: 0.03, // Fuerza de repulsión al tocar cerca
        },
        { // Nivel 2: Nebulosa Naciente
            particleBaseSize: 2.5, sizeVariation: 2.5,
            baseSpeed: 0.6, speedVariation: 1.0,
            colors: ['#ADD8E6', '#B0E0E6', '#AFEEEE', '#98FB98', '#E6E6FA'], // Azules celestes, verde pálido, lavanda
            messages: [
                "Navegas entre nubes cósmicas...",
                "La energía fluye a tu alrededor.",
                "Cada paso te acerca a lo desconocido.",
                "¿Sientes la vibración del espacio?",
                "Los colores danzan para ti.",
            ],
            interactionsToNextLevel: 150,
            particleType: 'nebulaCloud',
            createRate: 4,
            pushForce: 0.05,
        },
        { // Nivel 3: Corazón Galáctico
            particleBaseSize: 2, sizeVariation: 3,
            baseSpeed: 0.8, speedVariation: 1.4,
            colors: ['#FFD700', '#FFA500', '#FF69B4', '#DA70D6', '#8A2BE2', '#40E0D0'], // Dorados, naranjas, rosas, violetas, turquesas
            messages: [
                "¡Has alcanzado el corazón de la galaxia!",
                "Un torbellino de luz y color.",
                "Tu destino resplandece intensamente.",
                "La imaginación es tu única frontera.",
                "El viaje es infinito, como tus sueños.",
            ],
            interactionsToNextLevel: 250, // Último nivel
            particleType: 'galaxyCore',
            createRate: 5,
            pushForce: 0.07,
        }
    ];

    // --- Clase Partícula Mejorada ---
    class Particle {
        constructor(x, y, levelIndex) {
            const config = levels[levelIndex];
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = config.baseSpeed + Math.random() * config.speedVariation;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            this.baseSize = config.particleBaseSize;
            this.sizeVariation = config.sizeVariation;
            this.size = this.baseSize + Math.random() * this.sizeVariation;
            this.initialLife = (Math.random() * 60 + 80) * (1 + levelIndex * 0.2); // Viven más en niveles altos
            this.life = this.initialLife;
            this.opacity = 0.8 + Math.random() * 0.2; // Empiezan brillantes
            this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
            this.type = config.particleType;
            this.pulsateSpeed = Math.random() * 0.1 + 0.02;
            this.angle = Math.random() * Math.PI * 2; // Para rotaciones o formas complejas
        }

        update(deltaTime) {
            // Movimiento
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Vida y Opacidad
            this.life -= deltaTime;
            this.opacity = Math.max(0, (this.life / this.initialLife) * 0.9); // Fade out suave

            // Pulsación sutil
            this.currentSize = this.size * (1 + Math.sin(this.life * this.pulsateSpeed) * 0.1);

             // Rotación (para tipos específicos)
             if (this.type === 'galaxyCore') {
                 this.angle += 0.01 * deltaTime;
             }

            // Eliminar si está fuera de pantalla (con un margen)
            if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                this.life = 0;
            }
        }

        draw(ctx) {
            if (this.opacity <= 0 || this.currentSize <= 0) return;

            ctx.beginPath();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.currentSize * 1.5 + 3; // Brillo proporcional al tamaño

            switch (this.type) {
                case 'starDust':
                    ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
                    break;
                case 'nebulaCloud':
                    // Círculo más difuso
                     ctx.shadowBlur = this.currentSize * 2 + 5;
                     ctx.arc(this.x, this.y, this.currentSize * 1.2, 0, Math.PI * 2);
                    break;
                case 'galaxyCore':
                    // Forma similar a una estrella simple (4 puntas)
                     ctx.moveTo(this.x + Math.cos(this.angle) * this.currentSize, this.y + Math.sin(this.angle) * this.currentSize);
                    for (let i = 1; i < 8; i++) {
                        const angleOffset = Math.PI / 4 * i;
                        const radius = (i % 2 === 0) ? this.currentSize : this.currentSize * 0.5;
                        ctx.lineTo(this.x + Math.cos(this.angle + angleOffset) * radius, this.y + Math.sin(this.angle + angleOffset) * radius);
                    }
                    ctx.closePath(); // Cierra la forma
                    break;
                default:
                    ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
            }

            ctx.fill();

            // Resetear para la siguiente partícula
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }
    }

    // --- Funciones del Juego ---

    function handleInteraction(x, y, isContinuingDrag = false) {
        if (!gameActive || isTransitioning) return;

        const levelConfig = levels[currentLevel];
        const maxParticles = MAX_PARTICLES_PER_LEVEL[currentLevel];

        // Crear Partículas
        const particlesToCreate = isContinuingDrag ? Math.ceil(levelConfig.createRate / 2) : levelConfig.createRate; // Menos si es drag continuo
        for (let i = 0; i < particlesToCreate; i++) {
            if (particles.length < maxParticles) {
                particles.push(new Particle(x, y, currentLevel));
            } else {
                 // Opcional: reemplazar la más vieja si se alcanza el límite
                 // particles.shift(); particles.push(new Particle(x, y, currentLevel));
                 break;
            }
        }

        // Aplicar Fuerza de Repulsión a Partículas Cercanas
        const pushRadius = 80; // Radio de influencia del toque
        const pushForce = levelConfig.pushForce;
        particles.forEach(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < pushRadius * pushRadius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / pushRadius) * pushForce; // Más fuerza cuanto más cerca
                p.vx += (dx / dist) * force * 10; // Multiplicador para que sea más notable
                p.vy += (dy / dist) * force * 10;
                 // Opcional: Añadir un poco de brillo temporal al ser empujada
                 // p.opacity = Math.min(1, p.opacity + 0.3);
            }
        });


        // Incrementar contador solo en el inicio del toque/drag, no en cada punto del drag
        if (!isContinuingDrag) {
             interactionData.count++;
              // Reproducir sonido (si está habilitado)
              // interactionSound?.play().catch(e => console.log("Error sonido", e));
        }

        // Mostrar Mensaje Misterioso
        if (interactionData.count % 40 === 1 && !isContinuingDrag) { // Menos frecuente y solo al iniciar toque
             showRandomMessage();
        }

        // Comprobar Avance de Nivel
        checkLevelUp();
    }

    function showRandomMessage() {
        const messages = levels[currentLevel].messages;
        if (messages.length === 0) return;

        const message = messages[Math.floor(Math.random() * messages.length)];
        messageOverlay.textContent = message;
        messageOverlay.classList.add('visible');

        setTimeout(() => {
            messageOverlay.classList.remove('visible');
        }, 4000); // Duración del mensaje: 4 segundos
    }

    function checkLevelUp() {
        const levelConfig = levels[currentLevel];
        if (isTransitioning) return;

        const reachedNextLevel = currentLevel < levels.length - 1 && interactionData.count >= levelConfig.interactionsToNextLevel;
        const reachedFinalLevel = currentLevel === levels.length - 1 && interactionData.count >= levelConfig.interactionsToNextLevel;

        if (reachedNextLevel) {
            startLevelTransition();
        } else if (reachedFinalLevel) {
            endGame();
        }
    }

     function startLevelTransition() {
        isTransitioning = true;
        messageOverlay.classList.remove('visible'); // Ocultar mensajes durante transición
        bodyContainer.classList.add('level-transition'); // Flash blanco

        // Sonido de transición (opcional)
        // levelUpSound?.play().catch(e => console.log("Error sonido nivel", e));

        setTimeout(() => {
            currentLevel++;
            bodyContainer.className = `level-${currentLevel + 1}`; // Actualizar clase de fondo
            particles = []; // Limpiar partículas para el nuevo nivel (o podrías transformarlas)
            isTransitioning = false;
            // Mostrar un mensaje de bienvenida al nuevo nivel
             if (currentLevel === 1) showMessageDirect("Has entrado en la Nebulosa...");
             if (currentLevel === 2) showMessageDirect("¡Alcanzando el Corazón Galáctico!");

        }, 500); // Duración de la transición (flash + pausa)
    }

     function showMessageDirect(text) {
         messageOverlay.textContent = text;
         messageOverlay.classList.add('visible');
         setTimeout(() => messageOverlay.classList.remove('visible'), 3000);
     }


    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        if (!gameActive) {
             animationFrameId = null; // Asegura que no queden bucles corriendo
             return;
        }

         // Calcular deltaTime para animaciones consistentes independientemente del framerate
         const deltaTime = Math.min(32, timestamp - lastTimestamp) / 16.67; // Normalizado a 60fps, con límite
         lastTimestamp = timestamp;


        // Dibujar rastro (fondo semi-transparente)
        ctx.fillStyle = `rgba(0, 0, 0, ${PARTICLE_TRAIL_OPACITY[currentLevel]})`;
        ctx.fillRect(0, 0, width, height);

        // Actualizar y dibujar partículas
        // Iterar al revés es más eficiente al eliminar elementos
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update(deltaTime);
            if (p.life <= 0) {
                particles.splice(i, 1); // Eliminar partícula muerta
            } else {
                p.draw(ctx);
            }
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
         // Preguntar nombre solo si no se ha establecido antes o si se reinicia desde cero
        if (!userName || userName === "Explorador Estelar") {
            const inputName = prompt("¿Cómo te llamas, viajero/a de sueños?", userName);
            userName = inputName && inputName.trim() ? inputName.trim() : "Explorador Estelar";
        }

        startScreen.classList.remove('active');

        // Retraso mínimo para que la pantalla de inicio se oculte antes de iniciar
        setTimeout(() => {
            gameActive = true;
            isTransitioning = false;
            currentLevel = 0;
            interactionData = { count: 0, lastPoint: null, isDragging: false };
            particles = [];
            messageOverlay.classList.remove('visible');
            finalScreen.classList.remove('active');
            bodyContainer.className = `level-${currentLevel + 1}`; // Establecer clase de nivel inicial
            resizeCanvas(); // Ajustar tamaño

            // Iniciar el bucle de animación si no está corriendo ya
             if (!animationFrameId) {
                lastTimestamp = performance.now(); // Iniciar timestamp
                animationFrameId = requestAnimationFrame(gameLoop);
            }
        }, 50); // Pequeño retraso
    }

    function endGame() {
        if (!gameActive) return; // Evitar múltiples llamadas
        gameActive = false;
        isTransitioning = true; // Prevenir interacciones durante la pantalla final

        // Crear una explosión final de partículas
        createFinalBurst();

        // Esperar un poco para que la explosión sea visible antes de mostrar la pantalla
        setTimeout(() => {
             finalMessageName.textContent = `${userName}`;
             finalMessageText.textContent = `Has completado tu Viaje de los Sueños. La magia reside en el camino recorrido.`;
             bodyContainer.className = 'level-final'; // Fondo especial final
             finalScreen.classList.add('active');
             isTransitioning = false; // Permitir reiniciar
        }, 1500); // Espera 1.5 segundos
    }

    function createFinalBurst() {
        const centerX = width / 2;
        const centerY = height / 2;
        const burstConfig = levels[levels.length - 1]; // Usar config del último nivel
        burstConfig.baseSpeed *= 1.5; // Más rápido para la explosión
        burstConfig.particleBaseSize *= 1.2;

        for (let i = 0; i < 150; i++) { // Crear muchas partículas
            const p = new Particle(centerX, centerY, levels.length - 1);
             // Hacer que se muevan hacia afuera desde el centro
             const angle = Math.random() * Math.PI * 2;
             const speed = 1 + Math.random() * 4; // Velocidad radial variable
             p.vx = Math.cos(angle) * speed;
             p.vy = Math.sin(angle) * speed;
             p.initialLife *= 0.8; // Duración un poco menor
             p.life = p.initialLife;
             particles.push(p);
        }
    }


    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * window.devicePixelRatio; // Mayor resolución en pantallas retina
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio); // Escalar el contexto
    }

    // --- Event Listeners ---
    window.addEventListener('resize', resizeCanvas);

    // Toque y Arrastre (Móvil)
    canvas.addEventListener('touchstart', (e) => {
        if (!gameActive && !finalScreen.classList.contains('active') && !startScreen.classList.contains('active')) {
             // Si ni el juego, ni final, ni inicio están activos (estado raro), mostrar inicio
             restartGameToStartScreen();
             return;
        }
         if (startScreen.classList.contains('active')) {
            startGame();
         }
        e.preventDefault();
        const touch = e.touches[0];
        interactionData.isDragging = true;
        interactionData.lastPoint = { x: touch.clientX, y: touch.clientY };
        handleInteraction(touch.clientX, touch.clientY, false); // false = inicio de toque
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!interactionData.isDragging || !gameActive) return;
        e.preventDefault();
        const touch = e.touches[0];
        // Crear partículas a lo largo del arrastre
        // Se podría interpolar puntos si el movimiento es muy rápido, pero esto es más simple
         handleInteraction(touch.clientX, touch.clientY, true); // true = drag continuo
         interactionData.lastPoint = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        interactionData.isDragging = false;
        interactionData.lastPoint = null;
    });
    canvas.addEventListener('touchcancel', (e) => { // Por si el sistema interrumpe el toque
         interactionData.isDragging = false;
         interactionData.lastPoint = null;
    });


    // Interacción con Mouse (PC/Escritorio)
    let isMouseDown = false;
    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive && !finalScreen.classList.contains('active') && !startScreen.classList.contains('active')) {
             restartGameToStartScreen();
             return;
         }
         if (startScreen.classList.contains('active')) {
            startGame();
         }
         isMouseDown = true;
         interactionData.lastPoint = { x: e.clientX, y: e.clientY };
        handleInteraction(e.clientX, e.clientY, false);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown || !gameActive) return;
         handleInteraction(e.clientX, e.clientY, true);
         interactionData.lastPoint = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
        interactionData.lastPoint = null;
    });
     canvas.addEventListener('mouseleave', () => { // Si el ratón sale de la ventana
        isMouseDown = false;
        interactionData.lastPoint = null;
    });

    // Botón de Reinicio
    restartButton.addEventListener('click', restartGameToStartScreen);

     function restartGameToStartScreen() {
         finalScreen.classList.remove('active');
         if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Detener bucle si está activo
            animationFrameId = null;
         }
         gameActive = false;
         isTransitioning = false;
         particles = []; // Limpiar partículas restantes
         // Pequeña demora antes de mostrar la pantalla de inicio
         setTimeout(() => {
             bodyContainer.className = ''; // Quitar clases de nivel
             startScreen.classList.add('active');
         }, 300); // Espera un poco
     }


    // --- Inicialización ---
    resizeCanvas();
    // La pantalla de inicio ya tiene 'active' en el HTML inicial

});