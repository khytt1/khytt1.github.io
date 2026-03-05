import { auth, onAuthStateChanged } from './firebase-config.js';

const CHAT_API = "https://khytt-chat.mannycuckington.workers.dev/";

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUid = urlParams.get('uid');

    const loader = document.getElementById('profileLoader');
    const content = document.getElementById('profileContent');
    const errorMsg = document.getElementById('errorMsg');

    const pfpImg = document.getElementById('pfpImg');
    const pName = document.getElementById('pName');
    const pRole = document.getElementById('pRole');
    const pMsgCount = document.getElementById('pMsgCount');
    const profileStatus = document.getElementById('profileStatus');

    const editBtn = document.getElementById('editBtn');
    const editModal = document.getElementById('editModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editPfpInput = document.getElementById('editPfpInput');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    let currentUser = null;

    // Track authentication to load profile if no UID is specified and to enable editing
    onAuthStateChanged(auth, (user) => {
        currentUser = user;

        // If no targetUid was provided in the URL
        if (!targetUid) {
            if (user) {
                targetUid = user.uid;
                loadProfile(targetUid);
            } else {
                loader.classList.add('hidden');
                errorMsg.innerHTML = "You must be logged in to view your profile.<br><br><a href='login.html' style='color:var(--primary); text-decoration:none;'>Click here to Log In</a>";
                errorMsg.classList.remove('hidden');
            }
        }

        // If the viewer owns this profile, let them edit it
        if (user && targetUid === user.uid) {
            editBtn.style.display = 'inline-block';
        }
    });

    if (targetUid) {
        // Load Profile Data immediately if we got it from the URL
        loadProfile(targetUid);
    }

    async function loadProfile(uid) {
        try {
            const response = await fetch(`${CHAT_API}profile?uid=${uid}`);
            if (!response.ok) throw new Error("User not found");

            const data = await response.json();

            pName.textContent = data.displayName || "Anonymous";
            pfpImg.src = data.pfpUrl || "https://i.imgur.com/6YGWwS9.png";
            pfpImg.onerror = () => { pfpImg.src = "https://i.imgur.com/6YGWwS9.png"; };
            pMsgCount.textContent = data.messageCount;

            pRole.textContent = data.role === 'admin' ? 'Founder' : (data.role === 'mod' ? 'Moderator' : 'User');
            pRole.className = `profile-role role-${data.role}`;

            if (data.isBanned) {
                profileStatus.textContent = 'Banned';
                profileStatus.className = 'status-badge banned';
                profileStatus.classList.remove('hidden');
            } else if (data.isMuted) {
                profileStatus.textContent = 'Muted';
                profileStatus.className = 'status-badge muted';
                profileStatus.classList.remove('hidden');
            }

            loader.classList.add('hidden');
            content.classList.remove('hidden');

        } catch (error) {
            loader.classList.add('hidden');
            errorMsg.classList.remove('hidden');
        }
    }

    // Modal Events
    editBtn.addEventListener('click', () => {
        editPfpInput.value = pfpImg.src;
        editModal.classList.add('active');
    });

    closeEditModal.addEventListener('click', () => {
        editModal.classList.remove('active');
    });

    // Save Profile
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const newPfp = editPfpInput.value.trim();
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving...";

        try {
            const response = await fetch(`${CHAT_API}profile/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: currentUser.uid,
                    pfpUrl: newPfp,
                    displayName: currentUser.displayName // Keep current name for now
                })
            });

            const res = await response.json();

            if (res.error) {
                alert("Error: " + res.error);
            } else {
                pfpImg.src = newPfp;
                editModal.classList.remove('active');
            }
        } catch (e) {
            alert("Network error while saving.");
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Save Changes";
        }
    });
});
