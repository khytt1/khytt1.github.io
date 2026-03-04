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

            const webhookUrl = 'https://discord.com/api/webhooks/1478575783630078127/yeYwWOEBIgzHSit3-u2XkYDdkkWXruDSmjR81loa3euXmshKoCcYkapdeq1mWyJbxcmb';

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
});
