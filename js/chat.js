import { auth, onAuthStateChanged } from './firebase-config.js';

const CHAT_API = "https://khytt-chat.mannycuckington.workers.dev/";

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatSubmit = document.getElementById('chatSubmit');

    let currentUser = null;
    let currentUserRole = "user";
    let autoScroll = true;

    if (chatMessages && chatForm) {
        // Detect manual scrolling so we don't force them down if they are reading history
        chatMessages.addEventListener('scroll', () => {
            const isBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
            autoScroll = isBottom;
        });

        // Track authentication via Firebase
        onAuthStateChanged(auth, async (user) => { // Made async to allow await for role fetch
            if (user) {
                currentUser = user;
                chatInput.disabled = false;
                chatSubmit.disabled = false;
                chatInput.placeholder = "Type a message...";

                // Fetch current user's role
                try {
                    const res = await fetch(`${CHAT_API}profile?uid=${user.uid}`);
                    if (res.ok) {
                        const data = await res.json();
                        currentUserRole = data.role;
                    } else {
                        console.warn("Failed to fetch user role:", res.status);
                        currentUserRole = "user"; // Default to user if fetch fails
                    }
                } catch (e) {
                    console.error("Could not fetch role:", e);
                    currentUserRole = "user"; // Default to user on network error
                }
            } else {
                currentUser = null;
                currentUserRole = "user"; // Reset role when logged out
                chatInput.disabled = true;
                chatSubmit.disabled = true;
                chatInput.placeholder = "Type a message... (Must be Logged In)"; // Updated placeholder
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

                    const text = document.createElement('span');
                    text.className = 'chat-text';
                    text.textContent = msg.text;

                    const time = document.createElement('span');
                    time.style.fontSize = '0.7em';
                    time.style.color = '#888';
                    time.style.marginLeft = '10px';

                    // Convert Cloudflare server epoch time into the user's localized time
                    // Create Flex Container for everything except time
                    const headerRow = document.createElement('div');
                    headerRow.style.display = 'flex';
                    headerRow.style.alignItems = 'center';
                    headerRow.style.gap = '8px';

                    // Profile Picture
                    const pfp = document.createElement('img');
                    pfp.className = 'chat-pfp';
                    pfp.src = msg.pfpUrl || 'https://i.imgur.com/6YGWwS9.png'; // Fallback
                    pfp.onerror = () => { pfp.src = 'https://i.imgur.com/6YGWwS9.png'; }; // Handle broken links
                    headerRow.appendChild(pfp);

                    // Name as a clickable link
                    const authorLink = document.createElement('a');
                    authorLink.href = `profile.html?uid=${msg.uid}`;
                    authorLink.className = 'chat-author-link';

                    const author = document.createElement('span');
                    author.className = 'chat-author';
                    author.textContent = msg.displayName ? msg.displayName : (msg.email ? msg.email.split('@')[0] : 'Anonymous');
                    authorLink.appendChild(author);

                    const isTargetKhytt = msg.displayName && msg.displayName.toLowerCase() === 'khytt';

                    const isViewerAdminOrMod = currentUser && (currentUserRole === 'admin' || currentUserRole === 'mod');
                    const isViewerAdminOnly = currentUser && (currentUserRole === 'admin');

                    // Don't show mod tools on khytt's messages, UNLESS the viewer is actually khytt (the admin)
                    if (isViewerAdminOrMod && (!isTargetKhytt || isViewerAdminOnly)) {
                        const deleteBtn = document.createElement('span');
                        deleteBtn.className = 'chat-delete-btn';
                        deleteBtn.innerHTML = ' &times; ';
                        deleteBtn.style.color = '#ef4444';
                        deleteBtn.style.cursor = 'pointer';
                        deleteBtn.style.fontWeight = 'bold';
                        deleteBtn.title = 'Delete Message';
                        deleteBtn.onclick = async () => {
                            if (confirm("Delete this message?")) {
                                try {
                                    await fetch(CHAT_API + 'mod/delete', {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            requesterUid: currentUser.uid,
                                            requesterName: currentUser.displayName,
                                            messageId: msg.id
                                        })
                                    });
                                    syncMessages();
                                } catch (e) { alert("Failed to delete"); }
                            }
                        };
                        headerRow.appendChild(deleteBtn);

                        const modActionsBtn = document.createElement('span');
                        modActionsBtn.className = 'chat-mod-actions-btn';
                        modActionsBtn.innerHTML = ' ⚙️';
                        modActionsBtn.style.cursor = 'pointer';
                        modActionsBtn.style.filter = 'grayscale(100%)';
                        modActionsBtn.title = 'Mod Actions';
                        modActionsBtn.onclick = (e) => {
                            if (window.showModContextMenu) {
                                window.showModContextMenu(e, msg.uid, msg.displayName || (msg.email ? msg.email.split('@')[0] : 'Anonymous'), isViewerAdminOnly);
                            }
                        };
                        headerRow.appendChild(modActionsBtn);
                    }

                    if (msg.isAdmin || (msg.displayName && msg.displayName.toLowerCase() === 'khytt')) {
                        const adminBadge = document.createElement('span');
                        adminBadge.className = 'chat-admin-badge';
                        adminBadge.textContent = '[Founder] ';
                        headerRow.appendChild(adminBadge);
                    } else if (msg.isMod) {
                        const modBadge = document.createElement('span');
                        modBadge.className = 'chat-mod-badge';
                        modBadge.textContent = '[Mod] ';
                        headerRow.appendChild(modBadge);
                    }

                    headerRow.appendChild(authorLink);

                    const colon = document.createElement('span');
                    colon.textContent = ': ';
                    headerRow.appendChild(colon);

                    div.appendChild(headerRow);

                    // Message Text block
                    const textContent = document.createElement('div');
                    textContent.style.marginTop = '4px';
                    textContent.appendChild(text);
                    textContent.appendChild(time);

                    div.appendChild(textContent);

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

        // --- Mod Actions Modals & Context Menus ---
        let currentContextMenu = null;
        let currentModTarget = null;

        const muteModal = document.getElementById('muteModal');
        const closeMuteModal = document.getElementById('closeMuteModal');
        const muteForm = document.getElementById('muteForm');

        const banModal = document.getElementById('banModal');
        const closeBanModal = document.getElementById('closeBanModal');
        const submitBanBtn = document.getElementById('submitBanBtn');

        if (closeMuteModal) closeMuteModal.onclick = () => muteModal.classList.remove('active');
        if (closeBanModal) closeBanModal.onclick = () => banModal.classList.remove('active');

        if (muteForm) {
            muteForm.onsubmit = async (e) => {
                e.preventDefault();
                if (!currentUser) return;
                const duration = document.getElementById('muteDuration').value;
                const submitMuteBtn = document.getElementById('submitMuteBtn');
                submitMuteBtn.disabled = true;
                try {
                    await fetch(CHAT_API + 'mod/mute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requesterUid: currentUser.uid,
                            requesterName: currentUser.displayName,
                            targetUid: currentModTarget.uid,
                            durationMinutes: parseInt(duration)
                        })
                    });
                    muteModal.classList.remove('active');
                    alert(`Muted ${currentModTarget.name} for ${duration} minutes.`);
                } catch (e) { alert("Failed to mute"); }
                submitMuteBtn.disabled = false;
            };
        }

        if (submitBanBtn) {
            submitBanBtn.onclick = async () => {
                if (!currentUser) return;
                submitBanBtn.disabled = true;
                try {
                    await fetch(CHAT_API + 'mod/ban', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requesterUid: currentUser.uid,
                            requesterName: currentUser.displayName,
                            targetUid: currentModTarget.uid,
                            ban: true
                        })
                    });
                    banModal.classList.remove('active');
                    alert(`Banned ${currentModTarget.name}.`);
                } catch (e) { alert("Failed to ban"); }
                submitBanBtn.disabled = false;
            };
        }

        window.showModContextMenu = function (e, targetUid, targetName, canBan) {
            if (currentContextMenu) currentContextMenu.remove();

            const menu = document.createElement('div');
            menu.className = 'mod-context-menu glass';
            menu.style.position = 'absolute';
            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            menu.style.zIndex = '1000';
            menu.style.padding = '10px';
            menu.style.display = 'flex';
            menu.style.flexDirection = 'column';
            menu.style.gap = '5px';

            const muteBtn = document.createElement('button');
            muteBtn.className = 'btn-outline';
            muteBtn.style.fontSize = '0.8rem';
            muteBtn.style.padding = '5px 10px';
            muteBtn.textContent = 'Mute User';
            muteBtn.onclick = () => {
                menu.remove();
                currentModTarget = { uid: targetUid, name: targetName };
                document.getElementById('muteModalTitle').textContent = `Mute ${targetName}`;
                muteModal.classList.add('active');
            };
            menu.appendChild(muteBtn);

            if (canBan) {
                const banBtn = document.createElement('button');
                banBtn.className = 'btn-outline';
                banBtn.style.fontSize = '0.8rem';
                banBtn.style.padding = '5px 10px';
                banBtn.style.borderColor = 'var(--error)';
                banBtn.style.color = 'var(--error)';
                banBtn.textContent = 'Ban User';
                banBtn.onclick = () => {
                    menu.remove();
                    currentModTarget = { uid: targetUid, name: targetName };
                    document.getElementById('banModalTitle').textContent = `Ban ${targetName}`;
                    banModal.classList.add('active');
                };
                menu.appendChild(banBtn);
            }

            document.body.appendChild(menu);
            currentContextMenu = menu;

            setTimeout(() => {
                const removeMenu = (evt) => {
                    if (!menu.contains(evt.target)) {
                        menu.remove();
                        document.removeEventListener('click', removeMenu);
                    }
                };
                document.addEventListener('click', removeMenu);
            }, 10);
        };
    }
});
