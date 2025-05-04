document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const bodyContainer = document.getElementById('body-container');
    const gameContainer = document.getElementById('game-container'); // Contenedor principal
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const messageOverlay = document.getElementById('message-overlay');
    const startScreen = document.getElementById('start-screen');
    const finalScreen = document.getElementById('final-screen');
    const finalMessageName = document.getElementById('final-message-name');
    const finalMessageText = document.getElementById('final-message-text');
    const restartButton = document.getElementById('restart-button');
    // const interactionSound = document.getElementById('interaction-sound');

    // --- Estado del Juego ---
    let width, height;
    let particles = [];
    let interactionData = { count: 0, lastPoint: null, isDragging: false };
    let currentLevel = 0;
    let gameActive = false;
    let isTransitioning = false;
    let animationFrameId = null;
    let userName = "Explorador Estelar";
    const MAX_PARTICLES_PER_LEVEL = [150, 250, 350];
    const PARTICLE_TRAIL_OPACITY = [0.15, 0.12, 0.1];

    // --- Configuración de Niveles Detallada ---
    // (Igual que la versión anterior "espectacular" - omitida por brevedad)
     const levels = [
        { // Nivel 1: Polvo Estelar
            particleBaseSize: 1.5, sizeVariation: 1.5, baseSpeed: 0.4, speedVariation: 0.8,
            colors: ['#FFFFFF', '#FFFACD', '#F0FFFF', '#FFFAF0'],
            messages: ["Un susurro en el cosmos...", "Cada toque crea una estrella fugaz.", "Sigue la estela luminosa.", "El universo te da la bienvenida.", "La calma antes del viaje..."],
            interactionsToNextLevel: 60, particleType: 'starDust', createRate: 3, pushForce: 0.03,
        },
        { // Nivel 2: Nebulosa Naciente
            particleBaseSize: 2.5, sizeVariation: 2.5, baseSpeed: 0.6, speedVariation: 1.0,
            colors: ['#ADD8E6', '#B0E0E6', '#AFEEEE', '#98FB98', '#E6E6FA'],
            messages: ["Navegas entre nubes cósmicas...", "La energía fluye a tu alrededor.", "Cada paso te acerca a lo desconocido.", "¿Sientes la vibración del espacio?", "Los colores danzan para ti."],
            interactionsToNextLevel: 150, particleType: 'nebulaCloud', createRate: 4, pushForce: 0.05,
        },
        { // Nivel 3: Corazón Galáctico
            particleBaseSize: 2, sizeVariation: 3, baseSpeed: 0.8, speedVariation: 1.4,
            colors: ['#FFD700', '#FFA500', '#FF69B4', '#DA70D6', '#8A2BE2', '#40E0D0'],
            messages: ["¡Has alcanzado el corazón de la galaxia!", "Un torbellino de luz y color.", "Tu destino resplandece intensamente.", "La imaginación es tu única frontera.", "El viaje es infinito, como tus sueños."],
            interactionsToNextLevel: 250, particleType: 'galaxyCore', createRate: 5, pushForce: 0.07,
        }
    ];


    // --- Clase Partícula Mejorada ---
    // (Igual que la versión anterior "espectacular" - omitida por brevedad)
    class Particle {
        constructor(x, y, levelIndex) {
            const config = levels[levelIndex];
            this.x = x; this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = config.baseSpeed + Math.random() * config.speedVariation;
            this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
            this.baseSize = config.particleBaseSize; this.sizeVariation = config.sizeVariation;
            this.size = this.baseSize + Math.random() * this.sizeVariation;
            this.initialLife = (Math.random() * 60 + 80) * (1 + levelIndex * 0.2);
            this.life = this.initialLife;
            this.opacity = 0.8 + Math.random() * 0.2;
            this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
            this.type = config.particleType;
            this.pulsateSpeed = Math.random() * 0.1 + 0.02;
            this.angle = Math.random() * Math.PI * 2;
        }
        update(deltaTime) {
            this.x += this.vx * deltaTime; this.y += this.vy * deltaTime;
            this.life -= deltaTime;
            this.opacity = Math.max(0, (this.life / this.initialLife) * 0.9);
            this.currentSize = this.size * (1 + Math.sin(this.life * this.pulsateSpeed) * 0.1);
            if (this.type === 'galaxyCore') { this.angle += 0.01 * deltaTime; }
            if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) { this.life = 0; }
        }
        draw(ctx) {
            if (this.opacity <= 0 || this.currentSize <= 0) return;
            ctx.save(); // Guardar estado del contexto
            ctx.beginPath();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.currentSize * 1.5 + 3;
            switch (this.type) {
                case 'starDust': ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2); break;
                case 'nebulaCloud': ctx.shadowBlur = this.currentSize * 2 + 5; ctx.arc(this.x, this.y, this.currentSize * 1.2, 0, Math.PI * 2); break;
                case 'galaxyCore':
                    ctx.moveTo(this.x + Math.cos(this.angle) * this.currentSize, this.y + Math.sin(this.angle) * this.currentSize);
                    for (let i = 1; i < 8; i++) {
                        const angleOffset = Math.PI / 4 * i; const radius = (i % 2 === 0) ? this.currentSize : this.currentSize * 0.5;
                        ctx.lineTo(this.x + Math.cos(this.angle + angleOffset) * radius, this.y + Math.sin(this.angle + angleOffset) * radius);
                    }
                    ctx.closePath(); break;
                default: ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore(); // Restaurar estado (incluyendo shadowBlur y globalAlpha)
        }
    }

    // --- Funciones del Juego (con ajustes menores) ---

    function handleInteraction(x, y, isContinuingDrag = false) {
        if (!gameActive || isTransitioning) return;
        // console.log(`Interaction: ${isContinuingDrag ? 'Drag' : 'Start'} at ${x.toFixed(0)}, ${y.toFixed(0)}`); // Log para depurar

        const levelConfig = levels[currentLevel];
        const maxParticles = MAX_PARTICLES_PER_LEVEL[currentLevel];

        // Crear Partículas
        const particlesToCreate = isContinuingDrag ? Math.ceil(levelConfig.createRate / 2) : levelConfig.createRate;
        for (let i = 0; i < particlesToCreate; i++) {
            if (particles.length < maxParticles) {
                particles.push(new Particle(x, y, currentLevel));
            } else { break; }
        }

        // Aplicar Fuerza de Repulsión
        const pushRadius = 80;
        const pushForce = levelConfig.pushForce;
        particles.forEach(p => {
            const dx = p.x - x; const dy = p.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < pushRadius * pushRadius && distSq > 1) { // Evitar distSq = 0
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / pushRadius) * pushForce;
                // Aplicar fuerza limitada para evitar saltos extremos
                p.vx = Math.max(-5, Math.min(5, p.vx + (dx / dist) * force * 15));
                p.vy = Math.max(-5, Math.min(5, p.vy + (dy / dist) * force * 15));
            }
        });

        if (!isContinuingDrag) {
            interactionData.count++;
            // try { interactionSound?.play(); } catch(e) { console.warn("Sound play failed", e); }
            // Mostrar Mensaje Misterioso
             if (interactionData.count % 40 === 1) { showRandomMessage(); }
             // Comprobar Avance de Nivel solo al inicio del toque
             checkLevelUp();
        }
    }

    function showRandomMessage() {
        const messages = levels[currentLevel].messages;
        if (messages.length === 0) return;
        const message = messages[Math.floor(Math.random() * messages.length)];
        messageOverlay.textContent = message;
        messageOverlay.classList.add('visible');
        setTimeout(() => { messageOverlay.classList.remove('visible'); }, 4000);
    }

     function checkLevelUp() {
        if (isTransitioning || !gameActive) return; // Doble chequeo
        const levelConfig = levels[currentLevel];
        const reachedNextLevel = currentLevel < levels.length - 1 && interactionData.count >= levelConfig.interactionsToNextLevel;
        const reachedFinalLevel = currentLevel === levels.length - 1 && interactionData.count >= levelConfig.interactionsToNextLevel;

        if (reachedNextLevel) { startLevelTransition(); }
        else if (reachedFinalLevel) { endGame(); }
    }

     function startLevelTransition() {
        if (isTransitioning) return; // Prevenir transiciones múltiples
        // console.log("Starting level transition"); // Log para depurar
        isTransitioning = true;
        messageOverlay.classList.remove('visible');
        bodyContainer.classList.add('level-transition');

        setTimeout(() => {
            currentLevel++;
            bodyContainer.className = `level-${currentLevel + 1}`;
            particles = []; // Limpiar partículas
             // Reiniciar contador para el nuevo nivel (o mantenerlo acumulativo, decisión de diseño)
             // interactionData.count = 0; // Descomentar si quieres reiniciar el conteo por nivel
            isTransitioning = false;
            if (currentLevel === 1) showMessageDirect("Has entrado en la Nebulosa...");
            if (currentLevel === 2) showMessageDirect("¡Alcanzando el Corazón Galáctico!");
             // console.log("Level transition finished. New level:", currentLevel + 1); // Log para depurar
        }, 500);
    }

    function showMessageDirect(text) { /* ... (igual que antes) ... */ }

    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        if (!gameActive) {
            animationFrameId = null;
            return;
        }
        animationFrameId = requestAnimationFrame(gameLoop); // Solicitar el siguiente frame *primero*

        try { // Añadido TryCatch simple para depuración
            const deltaTime = Math.min(32, timestamp - lastTimestamp) / 16.67; // Normalizado a ~60fps
            lastTimestamp = timestamp;

            if (isNaN(deltaTime) || deltaTime <= 0) { // Si deltaTime no es válido, saltar este frame
                 // console.warn("Invalid deltaTime:", deltaTime); // Log para depurar
                 return;
             }

            // Dibujar rastro
            ctx.fillStyle = `rgba(0, 0, 0, ${PARTICLE_TRAIL_OPACITY[currentLevel]})`;
            ctx.fillRect(0, 0, width, height);

            // Actualizar y dibujar partículas
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update(deltaTime);
                if (p.life <= 0) {
                    particles.splice(i, 1);
                } else {
                    // Verificar que draw exista y p sea válido antes de llamar
                    if (p && typeof p.draw === 'function') {
                         p.draw(ctx);
                    }
                }
            }
        } catch (error) {
            console.error("Error in gameLoop:", error);
            gameActive = false; // Detener el juego si hay un error grave
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            // Podrías mostrar un mensaje de error al usuario aquí
        }
    }

    function startGame() {
        // console.log("Attempting to start game..."); // Log para depurar
        if (gameActive) return; // Evitar iniciar si ya está activo

         // Preguntar nombre solo la primera vez
        if (userName === "Explorador Estelar") { // O usa una flag si quieres permitir cambiarlo al reiniciar
            const inputName = prompt("¿Cómo te llamas, viajero/a de sueños?", userName);
            userName = inputName && inputName.trim() ? inputName.trim() : "Explorador Estelar";
        }

        startScreen.classList.remove('active');

        // Pequeño retraso para asegurar que la pantalla de inicio se oculte visualmente
        setTimeout(() => {
            // console.log("Starting game now..."); // Log para depurar
            gameActive = true;
            isTransitioning = false;
            currentLevel = 0;
            interactionData = { count: 0, lastPoint: null, isDragging: false };
            particles = [];
            messageOverlay.classList.remove('visible');
            finalScreen.classList.remove('active');
            bodyContainer.className = `level-${currentLevel + 1}`;

            resizeCanvas(); // Asegura el tamaño correcto *antes* de iniciar el loop

            if (!animationFrameId) {
                lastTimestamp = performance.now();
                animationFrameId = requestAnimationFrame(gameLoop);
                // console.log("Game loop started with ID:", animationFrameId); // Log para depurar
            } else {
                 // console.warn("Game loop was already running?"); // Log para depurar
            }
        }, 50); // 50ms de retraso
    }

    function endGame() { /* ... (igual que antes) ... */ }
    function createFinalBurst() { /* ... (igual que antes) ... */ }

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;

        // Considerar la densidad de píxeles para nitidez, pero cuidado con el rendimiento
        const dpr = window.devicePixelRatio || 1;
        // Limitar DPR en móviles de gama baja si el rendimiento es un problema
        // const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // El escalado debe hacerse después de establecer las dimensiones
        ctx.scale(dpr, dpr);
        // console.log(`Canvas resized: ${width}x${height} (DPR: ${dpr})`); // Log para depurar
    }

    // --- Event Listeners (Ajustados) ---

    // Listener unificado para iniciar el juego (más robusto)
    function handleInitialInteraction(event) {
         // Solo iniciar si la pantalla de inicio está activa y el juego no
         if (startScreen.classList.contains('active') && !gameActive) {
              // Prevenir comportamiento por defecto solo si es táctil (evitar zoom doble toque)
              if (event.type === 'touchstart') {
                 event.preventDefault();
              }
              startGame();
         }
    }
    gameContainer.addEventListener('touchstart', handleInitialInteraction, { passive: false }); // passive:false para poder usar preventDefault si es necesario
    gameContainer.addEventListener('mousedown', handleInitialInteraction);


    // Listeners para interacción DENTRO del juego (en el canvas)
    canvas.addEventListener('touchstart', (e) => {
        if (!gameActive) return;
        // e.preventDefault(); // Ya prevenido en el contenedor si inició el juego
        const touch = e.touches[0];
        interactionData.isDragging = true;
        interactionData.lastPoint = { x: touch.clientX, y: touch.clientY };
        handleInteraction(touch.clientX, touch.clientY, false);
    }, { passive: true }); // Puede ser passive:true aquí si no necesitas preventDefault extra

    canvas.addEventListener('touchmove', (e) => {
        if (!interactionData.isDragging || !gameActive) return;
        e.preventDefault(); // Prevenir scroll MIENTRAS se arrastra en el canvas
        const touch = e.touches[0];
        handleInteraction(touch.clientX, touch.clientY, true);
        interactionData.lastPoint = { x: touch.clientX, y: touch.clientY };
    }, { passive: false }); // Necesita passive: false para preventDefault

    canvas.addEventListener('touchend', () => {
        interactionData.isDragging = false;
        interactionData.lastPoint = null;
    });
    canvas.addEventListener('touchcancel', () => {
        interactionData.isDragging = false;
        interactionData.lastPoint = null;
    });

    // Interacción con Mouse (PC)
    let isMouseDown = false;
    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive) return; // Ya no inicia el juego desde aquí
        isMouseDown = true;
        interactionData.lastPoint = { x: e.clientX, y: e.clientY };
        handleInteraction(e.clientX, e.clientY, false);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown || !gameActive) return;
        handleInteraction(e.clientX, e.clientY, true);
        interactionData.lastPoint = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mouseup', () => { isMouseDown = false; interactionData.lastPoint = null; });
    canvas.addEventListener('mouseleave', () => { isMouseDown = false; interactionData.lastPoint = null; });


    // Botón de Reinicio
    restartButton.addEventListener('click', restartGameToStartScreen);
    function restartGameToStartScreen() { /* ... (igual que antes) ... */ }

    // --- Inicialización ---
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas); // Asegurar que se redimensione
     // La pantalla de inicio ya está activa por defecto en el HTML

    // Log final para confirmar que el script se ejecutó hasta el final
     console.log("El Viaje de los Sueños - Script Loaded and Initialized.");

});