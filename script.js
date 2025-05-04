const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('message-box');
const sound = document.getElementById('touch-sound');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];
let messages = [
  "Cada paso te lleva a un lugar único ✨",
  "¿Dónde terminará tu viaje? 🌌",
  "El destino es tan brillante como tu imaginación 💫",
  "No dejes de soñar, incluso si cierras los ojos 🌙",
  "Tus pasos están dibujando un mapa invisible ⭐",
  "Muy pronto… todo se revelará 🌠"
];
let messageIndex = 0;
let lastMessageTime = 0;

// Estrella con estela
function createStar(x, y) {
  const trailCount = 6;
  for (let i = 0; i < trailCount; i++) {
    stars.push({
      x: x + Math.random() * 20 - 10,
      y: y + Math.random() * 20 - 10,
      size: Math.random() * 2 + 1,
      opacity: 1,
      speedY: Math.random() * 1 + 0.5,
      color: `hsl(${Math.random() * 360}, 100%, 80%)`
    });
  }
  sound.currentTime = 0;
  sound.play();
}

// Dibujar estrellas y moverlas
function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach((star, index) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hexToRgb(star.color)}, ${star.opacity})`;
    ctx.fill();
    star.y -= star.speedY;
    star.opacity -= 0.01;
    if (star.opacity <= 0) stars.splice(index, 1);
  });
  requestAnimationFrame(drawStars);
}

// Mostrar mensaje mágico
function showMessage() {
  if (Date.now() - lastMessageTime < 4000) return;
  messageBox.textContent = messages[messageIndex];
  messageBox.style.opacity = 1;
  setTimeout(() => {
    messageBox.style.opacity = 0;
  }, 3000);
  messageIndex = (messageIndex + 1) % messages.length;
  lastMessageTime = Date.now();
}

// Manejo del toque/desliz
function handleInteraction(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  createStar(x, y);
  showMessage();
}

// Utilidad para convertir HSL a RGB
function hexToRgb(hsl) {
  const tmp = document.createElement("div");
  tmp.style.color = hsl;
  document.body.appendChild(tmp);
  const cs = getComputedStyle(tmp).color;
  document.body.removeChild(tmp);
  return cs.replace("rgb(", "").replace(")", "");
}

// Eventos de interacción
canvas.addEventListener('touchstart', handleInteraction);
canvas.addEventListener('mousemove', handleInteraction);

// Comienza la animación
drawStars();