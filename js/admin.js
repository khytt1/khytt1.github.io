import { auth, onAuthStateChanged } from './firebase-config.js';

const CHAT_API = "https://khytt-chat.mannycuckington.workers.dev/";

document.addEventListener('DOMContentLoaded', () => {
    const authCheck = document.getElementById('authCheck');
    const adminDashboard = document.getElementById('adminDashboard');
    const usersTableBody = document.getElementById('usersTableBody');
    let currentUser = null;
    let isDashboardAdmin = false;

    // Verify Auth & Admin Status
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        if (!user) {
            authCheck.innerHTML = '<h2 class="error-msg">You must be logged in to view this page.</h2>';
            return;
        }

        // Simplistic Admin check for frontend - The actual security is on the Cloudflare Worker
        if (user.displayName && user.displayName.toLowerCase() === 'khytt') {
            isDashboardAdmin = true;
            authCheck.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            loadUsers();
        } else {
            authCheck.innerHTML = '<h2 class="error-msg">Access Denied. You are not an administrator.</h2>';
        }
    });

    async function loadUsers() {
        try {
            const response = await fetch(CHAT_API + 'admin/users');
            if (!response.ok) throw new Error("Failed to fetch users");

            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error("Dashboard Error:", error);
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Failed to load user data.</td></tr>';
        }
    }

    function renderUsers(users) {
        usersTableBody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');

            // Name
            const tdName = document.createElement('td');
            tdName.textContent = u.displayName || u.email || 'Unknown';
            tdName.style.fontWeight = 'bold';

            // UID
            const tdUid = document.createElement('td');
            tdUid.textContent = u.uid.substring(0, 8) + '...';
            tdUid.title = u.uid;
            tdUid.style.color = 'var(--text-muted)';

            // Role
            const tdRole = document.createElement('td');
            tdRole.innerHTML = `<span class="role-badge role-${u.role}">${u.role}</span>`;

            // Status
            const tdStatus = document.createElement('td');
            if (u.isBanned) {
                tdStatus.innerHTML = '<span class="status-banned">Banned</span>';
            } else if (u.isMuted) {
                tdStatus.innerHTML = '<span class="status-muted">Muted</span>';
            } else {
                tdStatus.textContent = 'Active';
                tdStatus.style.color = 'var(--success)';
            }

            // Actions
            const tdActions = document.createElement('td');

            // Don't allow modifying khytt
            if (u.displayName && u.displayName.toLowerCase() !== 'khytt') {

                // Mute Action
                const muteBtn = document.createElement('button');
                muteBtn.className = 'action-btn ' + (u.isMuted ? '' : 'danger');
                muteBtn.textContent = u.isMuted ? 'Unmute' : 'Mute';
                muteBtn.onclick = () => {
                    const durationStr = prompt("Enter mute duration in minutes (0 to unmute):", u.isMuted ? "0" : "60");
                    if (durationStr === null) return;

                    const durationMins = parseInt(durationStr);
                    if (isNaN(durationMins) || durationMins < 0) {
                        alert("Invalid duration");
                        return;
                    }

                    handleAction('mod/mute', {
                        targetUid: u.uid,
                        durationMinutes: durationMins
                    }, false); // don't confirm again since we prompted
                };
                tdActions.appendChild(muteBtn);

                // Ban Action
                const banBtn = document.createElement('button');
                banBtn.className = 'action-btn danger';
                banBtn.textContent = u.isBanned ? 'Unban' : 'Ban';
                banBtn.onclick = () => handleAction('mod/ban', {
                    targetUid: u.uid,
                    ban: !u.isBanned
                });
                tdActions.appendChild(banBtn);

                // Role Action (Toggle Mod)
                const roleBtn = document.createElement('button');
                roleBtn.className = 'action-btn';
                roleBtn.textContent = u.role === 'mod' ? 'Revoke Mod' : 'Make Mod';
                roleBtn.onclick = () => handleAction('admin/role', {
                    targetUid: u.uid,
                    targetRole: u.role === 'mod' ? 'user' : 'mod'
                });
                tdActions.appendChild(roleBtn);
            }

            tr.appendChild(tdName);
            tr.appendChild(tdUid);
            tr.appendChild(tdRole);
            tr.appendChild(tdStatus);
            tr.appendChild(tdActions);

            usersTableBody.appendChild(tr);
        });
    }

    async function handleAction(endpoint, payload, skipConfirm = false) {
        if (!skipConfirm && !confirm("Are you sure you want to perform this action?")) return;

        try {
            const body = {
                requesterUid: currentUser.uid,
                requesterName: currentUser.displayName,
                ...payload
            };

            const req = await fetch(CHAT_API + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const res = await req.json();

            if (res.error) {
                alert("Error: " + res.error);
            } else {
                // Reload dashboard to reflect changes
                loadUsers();
            }
        } catch (e) {
            alert("Network error failed to execute action.");
        }
    }
});
