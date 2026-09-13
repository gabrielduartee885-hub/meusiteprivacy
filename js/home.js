// ===== Data Storage =====
let accounts = [];
const API_URL = window.location.hostname.endsWith('.netlify.app')
    ? '/.netlify/functions/settings'
    : 'api/settings.php';

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load settings and accounts in parallel
        const [fetchedSettings, fetchedAccounts] = await Promise.all([
            fetch(`${API_URL}?type=siteSettings`).then(res => res.json()),
            fetch(`${API_URL}?type=accounts`).then(res => res.json())
        ]);

        // Apply Settings
        if (fetchedSettings && fetchedSettings.favicon) {
            const favicon = document.getElementById('favicon');
            if (favicon) favicon.href = fetchedSettings.favicon;
        }

        // Apply Accounts
        accounts = Array.isArray(fetchedAccounts) ? fetchedAccounts : [];

        // The site settings also describe the main profile. Show it when no
        // separate account has been created in the admin panel yet.
        if (accounts.length === 0 && fetchedSettings && fetchedSettings.name) {
            accounts = [{
                id: 'site-profile',
                name: fetchedSettings.name,
                username: fetchedSettings.username,
                bio: fetchedSettings.bio,
                avatar: fetchedSettings.avatar,
                status: 'active',
                plan: 'free'
            }];
        }

        renderOffers();
        renderTopCreators();
        renderFreeProfiles();
    } catch (error) {
        console.error('Error loading data:', error);
    }
});

// ===== Render Offers Section =====
function renderOffers() {
    const container = document.getElementById('offers-list');

    // Filter accounts with active subscriptions
    const offerAccounts = accounts.filter(acc => acc.status === 'active');

    if (offerAccounts.length === 0) {
        container.innerHTML = renderEmptyCards(6);
        return;
    }

    container.innerHTML = offerAccounts.map(account => renderCreatorCard(account)).join('');
}

// ===== Render Top Creators Section =====
function renderTopCreators() {
    const container = document.getElementById('top-creators-list');

    // Sort by some criteria (e.g., created date, or just take first 6)
    const topAccounts = accounts.slice(0, 6);

    if (topAccounts.length === 0) {
        container.innerHTML = renderEmptyCards(6);
        return;
    }

    container.innerHTML = topAccounts.map((account, index) =>
        renderCreatorCard(account, index + 1)
    ).join('');
}

// ===== Render Free Profiles Section =====
function renderFreeProfiles() {
    const container = document.getElementById('free-profiles-list');

    // Filter accounts marked as free
    const freeAccounts = accounts.filter(acc => acc.plan === 'free' || acc.status === 'pending');

    if (freeAccounts.length === 0) {
        container.innerHTML = renderEmptyCards(6);
        return;
    }

    container.innerHTML = freeAccounts.map(account => renderCreatorCard(account)).join('');
}

// ===== Creator Card Template =====
function renderCreatorCard(account, rank = null) {
    const avatar = account.avatar || 'img/avatar.jpg';
    const rankBadge = rank ? getRankBadge(rank) : '';

    return `
        <a href="profile.html?id=${account.id}" class="creator-card">
            <img src="${avatar}" alt="${account.name}" onerror="this.src='img/avatar.jpg'">
            ${rankBadge}
            <div class="creator-info">
                <div class="creator-name">
                    ${account.name}
                    ${account.verified ? '<i class="fas fa-check-circle verified"></i>' : ''}
                </div>
                <div class="creator-username">@${account.username || account.email?.split('@')[0] || 'user'}</div>
            </div>
        </a>
    `;
}

// ===== Rank Badge =====
function getRankBadge(rank) {
    let badgeClass = '';
    if (rank === 1) badgeClass = '';
    else if (rank === 2) badgeClass = 'silver';
    else if (rank === 3) badgeClass = 'bronze';
    else return `<div class="rank-badge" style="background: var(--bg-card);">${rank}º</div>`;

    return `<div class="rank-badge ${badgeClass}">${rank}º</div>`;
}

// ===== Empty Cards =====
function renderEmptyCards(count) {
    let cards = '';
    for (let i = 0; i < count; i++) {
        cards += `
            <div class="creator-card placeholder">
                <i class="fas fa-user"></i>
            </div>
        `;
    }
    return cards;
}
