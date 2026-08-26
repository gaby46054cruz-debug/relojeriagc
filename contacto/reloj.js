/* --- CANVAS DE RELOJERÍA MECÁNICA DE LUJO (ESTILO BRONCE) --- */
const canvas = document.getElementById('clockCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function drawGear(centerX, centerY, radius, teeth, angle, color) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#4a2f1b';
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i * 2 * Math.PI) / teeth;
    const a2 = ((i + 0.5) * 2 * Math.PI) / teeth;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.lineTo(Math.cos(a2) * (radius * 1.15), Math.sin(a2) * (radius * 1.15));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Agujero central del engranaje
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0908';
  ctx.fill();
  ctx.restore();
}

function drawLuxuryBronzeClock() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) * 0.8;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const secProgress = seconds + milliseconds / 1000;

  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. Engranajes Internos en Movimiento (Efecto Skeleton)
  drawGear(0, 0, radius * 0.4, 16, secProgress * 0.2, 'rgba(122, 82, 48, 0.25)');
  drawGear(radius * 0.35, -radius * 0.35, radius * 0.25, 12, -secProgress * 0.3, 'rgba(176, 125, 79, 0.2)');

  // 2. Bisel Exterior de Bronce
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.08, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(176, 125, 79, 0.25)';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 163, 115, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Números Romanos Claras y Nítidos
  ctx.font = `bold ${Math.max(16, radius * 0.095)}px "Times New Roman", serif`;
  ctx.fillStyle = '#d4a373';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i++) {
    const angle = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * (radius * 0.85);
    const y = Math.sin(angle) * (radius * 0.85);
    ctx.fillText(romanNumerals[i], x, y);
  }

  // 4. Agujas Tradicionales de Alta Relojería

  // Aguja de Horas
  const hourAngle = (((hours % 12) + minutes / 60) * 30 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hourAngle) * (radius * 0.48), Math.sin(hourAngle) * (radius * 0.48));
  ctx.strokeStyle = '#b07d4f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Aguja de Minutos
  const minAngle = ((minutes + secProgress / 60) * 6 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(minAngle) * (radius * 0.7), Math.sin(minAngle) * (radius * 0.7));
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Aguja de Segundos (Giro Continuo en Bronce Vivo)
  const secAngle = (secProgress * 6 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(secAngle) * (radius * 0.88), Math.sin(secAngle) * (radius * 0.88));
  ctx.strokeStyle = '#e6c594';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#d4a373';
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Tapón Central del Eje
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#d4a373';
  ctx.fill();

  ctx.restore();

  requestAnimationFrame(drawLuxuryBronzeClock);
}

drawLuxuryBronzeClock();

/* --- INTERACCIÓN EN MÓVILES AL DESLIZAR --- */
const cards = document.querySelectorAll('.contact-card');

window.addEventListener('scroll', () => {
  const triggerBottom = window.innerHeight * 0.85;

  cards.forEach(card => {
    const cardTop = card.getBoundingClientRect().top;
    if (cardTop < triggerBottom && cardTop > 0) {
      card.classList.add('card-active');
    } else {
      card.classList.remove('card-active');
    }
  });
});