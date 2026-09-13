/**
 * TriboPay API Integration
 * Handles communicating with the TriboPay public API.
 */

class TriboPayAPI {
    constructor(config) {
        this.apiToken = config.apiToken;
        this.baseUrl = 'https://api.tribopay.com.br/api/public/v1/transactions';
    }

    /**
     * Creates a payment transaction.
     * @param {Object} paymentData - The payment details.
     * @param {number} paymentData.amount - Amount in cents (e.g. 1000 for R$ 10,00).
     * @param {string} paymentData.offerHash - The product offer hash.
     * @param {string} paymentData.paymentMethod - 'pix' or 'credit_card'.
     * @param {Object} paymentData.customer - Customer details { name, email, phone_number, document }.
     * @param {string} [paymentData.webhookUrl] - Optional postback URL.
     * @param {Object} [paymentData.card] - Card details (required if method is credit_card) { number, holder_name, exp_month, exp_year, cvv }.
     */
    async createTransaction(paymentData) {
        if (!this.apiToken) {
            throw new Error("TriboPay API Token is missing.");
        }

        const payload = {
            amount: paymentData.amount,
            offer_hash: paymentData.offerHash,
            payment_method: paymentData.paymentMethod === 'check' ? 'pix' : paymentData.paymentMethod,
            expire_in_days: 1,
            customer: paymentData.customer,
            cart: [
                {
                    product_hash: paymentData.offerHash, // Using offer hash as product hash
                    title: paymentData.productTitle || 'Product',
                    price: paymentData.amount,
                    quantity: 1,
                    operation_type: 1,
                    tangible: false
                }
            ],
            transaction_origin: "api"
        };

        if (paymentData.webhookUrl) {
            payload.postback_url = paymentData.webhookUrl;
        }

        if (paymentData.paymentMethod === 'credit_card' && paymentData.card) {
            payload.card = paymentData.card;
        }

        const url = `${this.baseUrl}?api_token=${this.apiToken}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error("TriboPay API Error:", error);
            throw error;
        }
    }

    /**
     * Helper to extract Pix Code from the response.
     * @param {Object} responseData - The JSON response from createTransaction.
     * @returns {string|null} The Pix copy-paste code or null.
     */
    static getPixCode(responseData) {
        if (!responseData) return null;

        const candidates = [
            responseData.pix_code,
            responseData.pixCode,
            responseData.qrcode,
            responseData.qr_code,
            responseData.copy_paste,
            responseData.copyPaste,
            responseData.brcode,
            responseData.emv,
            responseData.pix?.pix_qr_code,
            responseData.pix?.pix_code,
            responseData.pix?.qrcode,
            responseData.pix?.qr_code,
            responseData.data?.pix_code,
            responseData.data?.pixCode,
            responseData.data?.qrcode,
            responseData.data?.qr_code,
            responseData.data?.copy_paste,
            responseData.data?.brcode,
            responseData.data?.emv
        ];

        const pixCode = candidates.find(value => typeof value === 'string' && value.trim());
        if (pixCode) return pixCode;
        return null;
    }
}

// Example Usage:
// const triboPay = new TriboPayAPI({ apiToken: 'YOUR_TOKEN' });
// triboPay.createTransaction({
//     amount: 1000,
//     offerHash: 'YOUR_HASH',
//     paymentMethod: 'pix',
//     customer: { ... }
// }).then(response => { ... });
