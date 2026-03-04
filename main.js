document.addEventListener('DOMContentLoaded', () => {
    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Initial reveal for hero content
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('active'));
    }, 100);

    // Smooth hover effect for status cards
    const statusCards = document.querySelectorAll('.status-card');
    statusCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // Support Modal Logic
    const supportBtn = document.getElementById('supportBtn');
    const supportModal = document.getElementById('supportModal');
    const closeModal = document.getElementById('closeModal');
    const supportForm = document.getElementById('supportForm');
    const submitSupportBtn = document.getElementById('submitSupportBtn');
    const supportStatus = document.getElementById('supportStatus');

    // Attach listener to all elements that might have id="supportBtn" if there are multiple,
    // but ID should be unique. Alternatively query selector all.
    const supportBtns = document.querySelectorAll('#supportBtn');

    if (supportModal && closeModal) {
        // Ensure all support buttons are active, including dynamically added ones if any
        document.body.addEventListener('click', (e) => {
            if (e.target.id === 'supportBtn') {
                e.preventDefault();
                supportModal.classList.add('active');
            }
        });

        closeModal.addEventListener('click', () => {
            supportModal.classList.remove('active');
            if (supportStatus) {
                supportStatus.className = 'form-status';
                supportStatus.style.display = 'none';
            }
        });

        supportModal.addEventListener('click', (e) => {
            if (e.target === supportModal) {
                supportModal.classList.remove('active');
                if (supportStatus) {
                    supportStatus.className = 'form-status';
                    supportStatus.style.display = 'none';
                }
            }
        });
    }

    if (supportForm) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('supportName').value;
            const message = document.getElementById('supportMessage').value;

            submitSupportBtn.disabled = true;
            submitSupportBtn.textContent = 'Sending...';
            supportStatus.className = 'form-status';
            supportStatus.style.display = 'none';

            const webhookUrl = 'https://khytt-docs.mannycuckington.workers.dev/';

            const payload = {
                username: "Website Support",
                embeds: [{
                    title: "New Support Request",
                    color: 9133286,
                    fields: [
                        { name: "From", value: name, inline: true },
                        { name: "Message", value: message }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    supportStatus.textContent = 'Message sent! We will back to you soon.';
                    supportStatus.className = 'form-status success';
                    supportForm.reset();
                    // Auto-close after 3 seconds
                    setTimeout(() => {
                        supportModal.classList.remove('active');
                        supportStatus.style.display = 'none';
                    }, 3000);
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                supportStatus.textContent = 'Failed to send message. Please join our Discord directly.';
                supportStatus.className = 'form-status error';
            } finally {
                submitSupportBtn.disabled = false;
                submitSupportBtn.textContent = 'Send Message';
            }
        });
    }

    // Number Counter Animation
    const counters = document.querySelectorAll('.stat-number');
    const animateCounters = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = +entry.target.getAttribute('data-target');
                let count = 0;
                const increment = target / 100;

                const updateCount = () => {
                    count += increment;
                    if (count < target) {
                        entry.target.innerText = Math.ceil(count).toLocaleString();
                        requestAnimationFrame(updateCount);
                    } else {
                        entry.target.innerText = target.toLocaleString() + (target > 500 ? '+' : '');
                    }
                };
                updateCount();
                observer.unobserve(entry.target);
            }
        });
    };

    if (counters.length > 0) {
        const counterObserver = new IntersectionObserver(animateCounters, { threshold: 0.5 });
        counters.forEach(counter => counterObserver.observe(counter));
    }

    // Particle Background Integration
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particlesArray = [];
        const numberOfParticles = window.innerWidth < 768 ? 40 : 80;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 0.8 - 0.4;
                this.speedY = Math.random() * 0.8 - 0.4;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particlesArray = [];
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function handleParticles() {
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
                for (let j = i; j < particlesArray.length; j++) {
                    const dx = particlesArray[i].x - particlesArray[j].x;
                    const dy = particlesArray[i].y - particlesArray[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(139, 92, 246, ${1 - distance / 120})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            handleParticles();
            requestAnimationFrame(animateFrame);
        }

        initParticles();
        animateFrame();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });
    }
});
