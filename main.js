import { auth } from './js/firebase-config.js';

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

    // Review Modal Logic
    const reviewModal = document.getElementById('reviewModal');
    const writeReviewBtn = document.getElementById('writeReviewBtn');
    const closeReviewModal = document.getElementById('closeReviewModal');
    const reviewForm = document.getElementById('reviewForm');
    const submitReviewBtn = document.getElementById('submitReviewBtn');
    const reviewStatus = document.getElementById('reviewStatus');

    if (reviewModal && writeReviewBtn && closeReviewModal) {
        writeReviewBtn.addEventListener('click', () => {
            // Check if user is logged in
            if (!auth.currentUser) {
                alert("You must be logged in to write a review!");
                window.location.href = 'login.html';
                return;
            }
            reviewModal.classList.add('active');
        });

        closeReviewModal.addEventListener('click', () => {
            reviewModal.classList.remove('active');
            reviewStatus.style.display = 'none';
        });

        reviewModal.addEventListener('click', (e) => {
            if (e.target === reviewModal) {
                reviewModal.classList.remove('active');
                reviewStatus.style.display = 'none';
            }
        });

        // Handle Review Submission
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!auth.currentUser) {
                alert("Session expired. Please log in again.");
                return;
            }

            submitReviewBtn.disabled = true;
            submitReviewBtn.textContent = 'Submitting...';

            const product = document.getElementById('reviewProduct').value;
            const stars = document.getElementById('reviewStars').value;
            const text = document.getElementById('reviewText').value;

            const payload = {
                product: product,
                stars: stars,
                text: text,
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                timestamp: Date.now()
            };

            try {
                // Post to the Cloudflare Reviews API
                const response = await fetch("https://khytt-reviews.mannycuckington.workers.dev/", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    reviewStatus.textContent = 'Review submitted! Thank you!';
                    reviewStatus.className = 'form-status success';
                    reviewForm.reset();
                    // Auto-close after 3 seconds
                    setTimeout(() => {
                        reviewModal.classList.remove('active');
                        reviewStatus.style.display = 'none';
                    }, 3000);
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                reviewStatus.textContent = 'Failed to submit review. Server might be offline.';
                reviewStatus.className = 'form-status error';
            } finally {
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = 'Submit Review';
            }
        });
    }

    // Dynamic Stats Logic
    const initDynamicStats = async () => {
        // 1. Automatically calculate Days Undetected
        const daysEl = document.getElementById('daysUndetectedCounter');
        if (daysEl) {
            const releaseDate = new Date("2026-02-17").getTime();
            const now = new Date().getTime();
            const daysDiff = Math.max(0, Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24)));
            daysEl.setAttribute('data-target', daysDiff);
        }

        // 2. Fetch Live Active Users from Cloudflare
        const activeUsersEl = document.getElementById('activeUsersCounter');
        if (activeUsersEl) {
            try {
                // Generate or retrieve a temporary session ID for this visitor
                let sessionId = sessionStorage.getItem('khytt_session_id');
                if (!sessionId) {
                    sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    sessionStorage.setItem('khytt_session_id', sessionId);
                }

                // POST our presence to the genuine tracker and fetch the live count
                const res = await fetch(`https://khytt-analytics.mannycuckington.workers.dev/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sid: sessionId })
                });

                if (res.ok) {
                    const data = await res.json();
                    activeUsersEl.setAttribute('data-target', data.activeUsers || 0);
                }
            } catch (e) {
                console.error("Analytics fetch failed:", e);
            }
        }

        // 3. Fetch Live Community Reviews from Cloudflare
        const carouselTrack = document.querySelector('.carousel-track');
        if (carouselTrack) {
            try {
                const res = await fetch(`https://khytt-reviews.mannycuckington.workers.dev/?t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.reviews && data.reviews.length > 0) {

                        // We need the original HTML to clone for the seamless loop
                        const originalCardsHtml = `
                            <div class="review-card glass">
                                <div class="review-header">
                                    <div class="reviewer-profile">
                                        <img src="cs2-icon.png" class="review-icon" alt="CS2">
                                        <span class="reviewer">myg1283</span>
                                    </div>
                                    <span class="stars">★★★★½</span>
                                </div>
                                <p>"It works very good. Thank you for your effort"</p>
                            </div>
                            <div class="review-card glass">
                                <div class="review-header">
                                    <div class="reviewer-profile">
                                        <img src="cs2-icon.png" class="review-icon" alt="CS2">
                                        <span class="reviewer">Sun2Bro</span>
                                    </div>
                                    <span class="stars">★★★★★</span>
                                </div>
                                <p>"Dude, I love you! Thanks to you, I got rid of other cheaters in CS by using this"</p>
                            </div>
                            <div class="review-card glass">
                                <div class="review-header">
                                    <div class="reviewer-profile">
                                        <img src="cs2-icon.png" class="review-icon" alt="CS2">
                                        <span class="reviewer">YoRyok</span>
                                    </div>
                                    <span class="stars">★★★★★</span>
                                </div>
                                <p>"You sir are a godsend, may your pillows always be warm and your toes never stubbed!"</p>
                            </div>
                            <div class="review-card glass">
                                <div class="review-header">
                                    <div class="reviewer-profile">
                                        <img src="cs2-icon.png" class="review-icon" alt="CS2">
                                        <span class="reviewer">vkraina</span>
                                    </div>
                                    <span class="stars">★★★★☆</span>
                                </div>
                                <p>"Ive been using it for the past 3 days i wanna say, smooth on 3, esp, and trigger bot for snipers, no problems. Im not playing obvious but no ones said anything so far!"</p>
                            </div>
                        `;

                        // Generate HTML for the dynamically submitted reviews
                        let dynamicCardsHtml = '';
                        data.reviews.forEach(review => {
                            // Map numeric start value to UI stars
                            let starStr = '★'.repeat(parseInt(review.stars)) + '☆'.repeat(5 - parseInt(review.stars));
                            // Map generic star fallback
                            if (review.stars == 4.5) starStr = '★★★★½';

                            const iconSrc = review.product === 'CS2' ? 'cs2-icon.png' : 'icon.png';

                            dynamicCardsHtml += `
                            <div class="review-card glass">
                                <div class="review-header">
                                    <div class="reviewer-profile">
                                        <img src="${iconSrc}" class="review-icon" alt="${review.product}">
                                        <span class="reviewer">${review.displayName}</span>
                                    </div>
                                    <span class="stars">${starStr}</span>
                                </div>
                                <p>"${review.text}"</p>
                            </div>
                            `;
                        });

                        // Rebuild the track: Original + Dynamic, then cloned again for seamless scroll
                        const fullSet = originalCardsHtml + dynamicCardsHtml;
                        carouselTrack.innerHTML = fullSet + fullSet;
                    }
                }
            } catch (e) {
                console.error("Reviews fetch failed:", e);
            }
        }

        // 4. Run the Number Counter Animations based on the newly injected data
        const counters = document.querySelectorAll('.stat-number');
        const animateCounters = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = +entry.target.getAttribute('data-target');
                    let count = 0;
                    // Fix increment for numbers smaller than 100 so it doesn't infinite loop at zero
                    const increment = target / 100 > 0 ? target / 100 : 1;

                    const updateCount = () => {
                        count += increment;
                        if (count < target) {
                            entry.target.innerText = Math.ceil(count).toLocaleString();
                            requestAnimationFrame(updateCount);
                        } else {
                            entry.target.innerText = target.toLocaleString() + (target >= 500 ? '+' : '');
                        }
                    };

                    if (target > 0) {
                        updateCount();
                    } else {
                        entry.target.innerText = "0";
                    }

                    observer.unobserve(entry.target);
                }
            });
        };

        if (counters.length > 0) {
            const counterObserver = new IntersectionObserver(animateCounters, { threshold: 0.5 });
            counters.forEach(counter => counterObserver.observe(counter));
        }
    };

    initDynamicStats();

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
