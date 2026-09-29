// ======================
// Mood Mirror - Enhanced Version
// ======================

const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let intensity = 0;
let isHolding = false;
let muted = false;
let hintHidden = false;
let mouse = { x: null, y: null };
let lastMouse = { x: null, y: null };
let lastMoveTime = performance.now();

let width, height;
let particles = [];
//let mouse = { x: null, y: null, radius: 140 };
let currentMood = null;
let currentAudio = null;
let toneReady = false;
let tonePlayers = {};
let toneFilter = null;
let toneGain = null;
let activePlayer = null;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function pulseByIntensity() {
    gsap.to('.vignette', {
        opacity: 0.7 - intensity * 0.35,
        duration: 0.3,
        ease: 'power1.out',
        overwrite: true
    });

    gsap.to('.title', {
        textShadow: `0 0 ${20 + intensity * 40}px rgba(255,255,255,${0.15 + intensity * 0.35})`,
        scale: 1 + intensity * 0.04 + (isHolding ? 0.03 : 0),
        duration: 0.35,
        ease: 'power2.out',
        overwrite: true
    });

        if (toneReady && toneGain && toneFilter) {
        const vol = muted ? 0 : (0.35 + intensity * 0.45 + (isHolding ? 0.15 : 0));
        const freq = 700 + intensity * 1800 + (isHolding ? 600 : 0);

        toneGain.gain.rampTo(vol, 0.15);
        toneFilter.frequency.rampTo(freq, 0.2);
    }

    const barI = document.getElementById('barIntensity');
    const barD = document.getElementById('barDepth');
    if (barI) barI.style.width = Math.round(intensity * 100) + '%';
    if (barD) barD.style.width = isHolding ? '100%' : '0%';

    requestAnimationFrame(pulseByIntensity);
}

pulseByIntensity();


const moods = {
    calm: {
        color: '100, 180, 220',
        count: 55,
        speed: 0.35,
        size: 2.2,
        lineDist: 130,
        behavior: 'float'
    },
    energy: {
        color: '255, 90, 70',
        count: 85,
        speed: 1.6,
        size: 1.8,
        lineDist: 100,
        behavior: 'chaos'
    },
    sad: {
        color: '90, 100, 140',
        count: 40,
        speed: 0.18,
        size: 2.8,
        lineDist: 160,
        behavior: 'sink'
    },
    relax: {
        color: '90, 190, 150',
        count: 50,
        speed: 0.4,
        size: 2.4,
        lineDist: 140,
        behavior: 'wave'
    },
    creative: {
        color: '160, 110, 255',
        count: 70,
        speed: 0.9,
        size: 2.0,
        lineDist: 120,
        behavior: 'orbit'
    }
};

class Particle {
    constructor(mood) {
        this.reset(mood);
    }

    reset(mood) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * mood.size + 1.2;
        this.baseSize = this.size;
        this.speedX = (Math.random() - 0.5) * mood.speed;
        this.speedY = (Math.random() - 0.5) * mood.speed;
        this.color = mood.color;
        this.life = Math.random();
        this.angle = Math.random() * Math.PI * 2;
        this.orbitRadius = 30 + Math.random() * 60;
        this.centerX = this.x;
        this.centerY = this.y;
    }

    update(mood) {
        const m = moods[currentMood];

        const boost = 1 + intensity * 2.5;
        const holdBoost = isHolding ? 1.8 : 1;
        // رفتارهای مختلف
        if (m.behavior === 'orbit') {
            this.angle += 0.012;
            this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.centerY + Math.sin(this.angle) * this.orbitRadius * 0.6;
        } else if (m.behavior === 'wave') {
            this.y += Math.sin(this.x * 0.008 + Date.now() * 0.001) * 0.4;
            this.x += this.speedX;
        } else if (m.behavior === 'sink') {
            this.y += 0.15;
            this.x += this.speedX * 0.5;
        } else if (m.behavior === 'chaos') {
            this.speedX += (Math.random() - 0.5) * 0.08;
            this.speedY += (Math.random() - 0.5) * 0.08;
            this.x += this.speedX * boost * holdBoost;
            this.y += this.speedY * boost * holdBoost;
        } else {
            // float
            this.x += this.speedX * boost * holdBoost;
            this.y += this.speedY * boost * holdBoost;
        }

        // واکنش قوی به موس
        if (mouse.x !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouse.radius) {
                const force = (mouse.radius - dist) / mouse.radius;
                const angle = Math.atan2(dy, dx);

                // بعضی حال‌ها جذب، بعضی دفع
                const direction = (currentMood === 'energy' || currentMood === 'creative') ? -1 : 1;
                this.x -= Math.cos(angle) * force * 4 * direction;
                this.y -= Math.sin(angle) * force * 4 * direction;
                this.size = this.baseSize + force * 2.5;
            } else {
                this.size += (this.baseSize - this.size) * 0.08;
            }
        }

        // برگشت به صفحه
        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
        if (this.y < -50) this.y = height + 50;
        if (this.y > height + 50) this.y = -50;
    }

    draw() {
        // درخشش
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, 0.08)`;
        ctx.fill();

        // خود ذره
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, 0.85)`;
        ctx.fill();
    }
}

function createParticles(moodName) {
    particles = [];
    const mood = moods[moodName];
    for (let i = 0; i < mood.count; i++) {
        particles.push(new Particle(mood));
    }
}

function drawLines() {
    const maxDist = moods[currentMood].lineDist;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
                const opacity = 1 - dist / maxDist;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${particles[i].color}, ${opacity * 0.25})`;
                ctx.lineWidth = 0.8;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    // محو شدن نرم به جای پاک کردن کامل (ایجاد دنباله)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    drawLines();

    requestAnimationFrame(animate);
}

async function playAudio(moodName) {
    await initTone();

    if (activePlayer) {
        activePlayer.stop();
        activePlayer = null;
    }

    const player = tonePlayers[moodName];
    if (!player) return;

    if (player.loaded) {
        player.start();
    } else {
        Tone.loaded().then(() => player.start());
    }
    activePlayer = player;
}

const moodCopy = {
    calm:     { title: "آرام",  line: "نفس بکش. همه‌چیز آهسته می‌شود.", index: "SCENE 01 / 05" },
    energy:   { title: "انرژی", line: "حرکت کن. ریتم از تو شروع می‌شود.", index: "SCENE 02 / 05" },
    sad:      { title: "عمیق",  line: "این سنگینی هم بخشی از تصویر است.", index: "SCENE 03 / 05" },
    relax:    { title: "ریلکس", line: "رها کن. فضا خودش تو را نگه می‌دارد.", index: "SCENE 04 / 05" },
    creative: { title: "خلاق",  line: "یک ایده آرام، نزدیک سطح.", index: "SCENE 05 / 05" }
};

function setMood(moodName) {
    if (currentMood === moodName) return;

    currentMood = moodName;
    document.body.className = moodName;

        const copy = moodCopy[moodName];
    const titleEl = document.getElementById("moodTitle");
    const lineEl = document.getElementById("moodLine");
    const indexEl = document.getElementById("sceneIndex");
    const veil = document.getElementById("veil");

    titleEl.textContent = copy.title;
    lineEl.textContent = copy.line;
    indexEl.textContent = copy.index;

     const senseMood = document.getElementById('senseMood');
    if (senseMood && moodCopy[moodName]) {
        senseMood.textContent = moodCopy[moodName].title;
    }

    [titleEl, lineEl, indexEl].forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
    });

    veil.classList.add("on");
    setTimeout(() => veil.classList.remove("on"), 500);

    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === moodName);
    });

    createParticles(moodName);
    playAudio(moodName);
}

document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => setMood(btn.dataset.mood));
});
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        muted = !muted;
        muteBtn.classList.toggle('muted', muted);
        muteBtn.textContent = muted ? 'بی‌صدا' : 'صدا';

        if (toneReady && toneGain) {
            toneGain.gain.rampTo(muted ? 0 : (0.35 + intensity * 0.45), 0.2);
        }
    });
}
function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    const hint = document.getElementById('hint');
    if (hint) hint.classList.add('hide');
}

window.addEventListener('mousemove', hideHint, { once: true });
window.addEventListener('touchstart', hideHint, { once: true });
window.addEventListener('click', hideHint, { once: true });
window.addEventListener('touchmove', (e) => {
    if (!e.touches[0]) return;
    const t = e.touches[0];
    const now = performance.now();
    const dt = Math.max(now - lastMoveTime, 16);

    if (lastMouse.x !== null) {
        const dx = t.clientX - lastMouse.x;
        const dy = t.clientY - lastMouse.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        const target = Math.min(speed * 8, 1);
        intensity += (target - intensity) * 0.2;
    }

    mouse.x = t.clientX;
    mouse.y = t.clientY;
    lastMouse.x = t.clientX;
    lastMouse.y = t.clientY;
    lastMoveTime = now;
}, { passive: true });

window.addEventListener('touchstart', (e) => {
    if (e.target.closest('.mood-btn') || e.target.closest('.mute-btn')) return;
    if (!e.touches[0]) return;

    isHolding = true;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;

    gsap.to('#app', { scale: 1.06, duration: 0.8, ease: 'power2.out' });
    const veil = document.getElementById('veil');
    if (veil) veil.classList.add('on');
}, { passive: true });

window.addEventListener('touchend', () => {
    lastMouse.x = null;
    lastMouse.y = null;
    isHolding = false;
    const veil = document.getElementById('veil');
    if (veil) veil.classList.remove('on');
    gsap.to('#app', { scale: 1, duration: 0.5, ease: 'power2.out' });
}, { passive: true });

window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    const dt = Math.max(now - lastMoveTime, 16);

    if (lastMouse.x !== null) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        const target = Math.min(speed * 8, 1);
        intensity += (target - intensity) * 0.15;
    }

    mouse.x = e.clientX;
    mouse.y = e.clientY;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    lastMoveTime = now;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
    lastMouse.x = null;
    lastMouse.y = null;
    intensity = 0;
});

// شدت آرام به صفر برگردد وقتی موس ثابت است
setInterval(() => {
    intensity *= 0.92;
    if (intensity < 0.02) intensity = 0;
}, 50);

// شروع
setMood('calm');
animate();


function spawnRipple(x, y) {
    const layer = document.getElementById('ripple-layer');
    if (!layer) return;

    const el = document.createElement('div');
    el.className = 'ripple';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = '20px';
    el.style.height = '20px';
    layer.appendChild(el);

    gsap.to(el, {
        scale: 18,
        opacity: 0,
        duration: 1.1,
        ease: 'power2.out',
        onComplete: () => el.remove()
    });

    // نت کوتاه
    if (toneReady && window.moodSynth && currentMood) {
        const note = window.moodNotes[currentMood] || 'C4';
        const vel = 0.25 + intensity * 0.4;
        window.moodSynth.triggerAttackRelease(note, '8n', undefined, vel);
    }
}

window.addEventListener('click', (e) => {
    // اگر روی دکمه حال کلیک شد، موج نساز
    if (e.target.closest('.mood-btn')) return;
    spawnRipple(e.clientX, e.clientY);
});

window.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mood-btn')) return;
    isHolding = true;

    gsap.to('#app', {
        scale: 1.06,
        duration: 0.8,
        ease: 'power2.out'
    });

    const veil = document.getElementById('veil');
    if (veil) veil.classList.add('on');
});

window.addEventListener('mouseup', () => {
    isHolding = false;

    gsap.to('#app', {
        scale: 1,
        duration: 0.6,
        ease: 'power2.out'
    });

    const veil = document.getElementById('veil');
    if (veil) veil.classList.remove('on');
});

window.addEventListener('mouseleave', () => {
    if (!isHolding) return;
    isHolding = false;
    gsap.to('#app', { scale: 1, duration: 0.6, ease: 'power2.out' });
    const veil = document.getElementById('veil');
    if (veil) veil.classList.remove('on');
});

async function initTone() {
    if (toneReady) return;
    await Tone.start();

    toneFilter = new Tone.Filter(900, 'lowpass').toDestination();
    toneGain = new Tone.Gain(0.55).connect(toneFilter);
        window.moodSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.01,
            decay: 0.25,
            sustain: 0.0,
            release: 0.4
        }
    }).connect(toneFilter);

    window.moodNotes = {
        calm: 'C4',
        energy: 'E4',
        sad: 'A3',
        relax: 'G3',
        creative: 'D4'
    };

    const files = {
        calm: 'sounds/idoberg-ambient-pads-loop-296968.mp3',
        energy: 'sounds/freesound_community-voice-and-synth-loop-76570.mp3',
        sad: 'sounds/freesound_community-looping-horror-groaning-64518.mp3',
        relax: 'sounds/armotonic-android-forest-loop-559129.mp3',
        creative: 'sounds/dragon-studio-ambient-pads-loop-04-427396.mp3'
    };

    for (const [name, url] of Object.entries(files)) {
        tonePlayers[name] = new Tone.Player({
            url,
            loop: true,
            volume: -6
        }).connect(toneGain);
    }

    toneReady = true;
}