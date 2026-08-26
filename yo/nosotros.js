/* --- CANVAS RELOJ REGULADOR DE BRONCE DE FONDO --- */
const canvas = document.getElementById('clockCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function drawClockworkPattern() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) * 0.82;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const secProgress = seconds + milliseconds / 1000;

  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. Corona exterior con muescas dentadas (Bisel giratorio bronce)
  ctx.save();
  ctx.rotate(-secProgress * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(122, 82, 48, 0.25)';
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < 36; i++) {
    const angle = (i * 10) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (radius * 1.02), Math.sin(angle) * (radius * 1.02));
    ctx.lineTo(Math.cos(angle) * (radius * 1.08), Math.sin(angle) * (radius * 1.08));
    ctx.strokeStyle = 'rgba(176, 125, 79, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Anillo de la esfera principal
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 163, 115, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Sub-esfera Superior (Tourbillon decorativo pulsante)
  ctx.save();
  ctx.translate(0, -radius * 0.38);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(176, 125, 79, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rueda interna de volante
  ctx.rotate(secProgress * 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 163, 115, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 4. Sub-esfera Inferior (Segundero independiente de precisión)
  ctx.save();
  ctx.translate(0, radius * 0.38);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(176, 125, 79, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Aguja del segundero de la sub-esfera
  const subSecAngle = (secProgress * 6 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(subSecAngle) * (radius * 0.18), Math.sin(subSecAngle) * (radius * 0.18));
  ctx.strokeStyle = '#e6c594';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 5. Números Romanos en el anillo exterior
  ctx.font = `bold ${Math.max(15, radius * 0.088)}px "Times New Roman", serif`;
  ctx.fillStyle = '#d4a373';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i++) {
    const angle = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * (radius * 0.82);
    const y = Math.sin(angle) * (radius * 0.82);
    ctx.fillText(romanNumerals[i], x, y);
  }

  // 6. Agujas Principales del Reloj

  // Aguja de Horas
  const hourAngle = (((hours % 12) + minutes / 60) * 30 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hourAngle) * (radius * 0.45), Math.sin(hourAngle) * (radius * 0.45));
  ctx.strokeStyle = '#b07d4f';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Aguja de Minutos
  const minAngle = ((minutes + secProgress / 60) * 6 - 90) * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(minAngle) * (radius * 0.68), Math.sin(minAngle) * (radius * 0.68));
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Centro del Eje
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#d4a373';
  ctx.fill();

  ctx.restore();

  requestAnimationFrame(drawClockworkPattern);
}

drawClockworkPattern();

/* --- INTERACCIÓN AL DESLIZAR EN MÓVILES --- */
const cards = document.querySelectorAll('.info-card');

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