import { auth, onAuthStateChanged } from './firebase-config.js';

const CHAT_API = "https://khytt-chat.mannycuckington.workers.dev/";

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatSubmit = document.getElementById('chatSubmit');

    let currentUser = null;
    let autoScroll = true;

    if (chatMessages && chatForm) {
        // Detect manual scrolling so we don't force them down if they are reading history
        chatMessages.addEventListener('scroll', () => {
            const isBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
            autoScroll = isBottom;
        });

        // Track authentication via Firebase
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                chatInput.disabled = false;
                chatSubmit.disabled = false;
                chatInput.placeholder = "Type a message...";
            } else {
                chatInput.disabled = true;
                chatSubmit.disabled = true;
                chatInput.placeholder = "Please log in to chat.";
            }
        });

        // Function to actually fetch and render the messages from Cloudflare
        const syncMessages = async () => {
            try {
                // Cloudflare caches GET requests very aggressively. 
                // We add a random timestamp to the URL to force it to grab fresh data every time.
                const response = await fetch(`${CHAT_API}?t=${Date.now()}`);
                if (!response.ok) throw new Error("API Offline");

                const msgs = await response.json();

                // Cloudflare returns them oldest-to-newest based on how we appended them,
                // so we just render them exactly as they arrive.
                chatMessages.innerHTML = '';

                msgs.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'chat-message';

                    const author = document.createElement('span');
                    author.className = 'chat-author';
                    author.textContent = msg.displayName ? msg.displayName : (msg.email ? msg.email.split('@')[0] : 'Anonymous');

                    const text = document.createElement('span');
                    text.className = 'chat-text';
                    text.textContent = msg.text;

                    const time = document.createElement('span');
                    time.style.fontSize = '0.7em';
                    time.style.color = '#888';
                    time.style.marginLeft = '10px';

                    // Convert Cloudflare server epoch time into the user's localized time
                    const localTime = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    time.textContent = localTime;

                    div.appendChild(author);
                    div.appendChild(document.createTextNode(': '));
                    div.appendChild(text);
                    div.appendChild(time);

                    chatMessages.appendChild(div);
                });

                if (autoScroll) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } catch (error) {
                console.error("Cloudflare Chat Error: ", error);
            }
        };

        // Poll the server every 2 seconds for new messages
        syncMessages();
        setInterval(syncMessages, 2000);

        // Send new message to Cloudflare
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();

            if (text && currentUser) {
                chatInput.value = ''; // Instantly clear UI input

                try {
                    await fetch(CHAT_API, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: text,
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName || null
                        })
                    });

                    // Force an instant re-sync so they see their own message right away
                    syncMessages();
                    autoScroll = true;

                } catch (error) {
                    console.error("Failed to post message:", error);
                    alert("Network error: Could not reach chat server.");
                }
            }
        });
    }
});
