<?php
/**
 * TriboPay Webhook Receiver
 * 
 * Este arquivo recebe as notificações de pagamento do TriboPay
 * Configure a URL deste arquivo no painel TriboPay > Integrações > Webhooks
 * 
 * Exemplo de URL: https://seusite.com/webhook.php
 */

// Configurações
define('LOG_FILE', __DIR__ . '/logs/webhook_log.txt');
define('PAYMENTS_FILE', __DIR__ . '/data/payments.json');

// Headers para resposta
header('Content-Type: application/json');

// Apenas aceita requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Recebe o payload do webhook
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Se não houver dados, retorna erro
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

// Log do webhook recebido
logWebhook($data);

// Processa o webhook baseado no status
$status = $data['status'] ?? $data['payment_status'] ?? '';
$transactionId = $data['hash'] ?? $data['transaction_id'] ?? '';
$amount = $data['amount'] ?? $data['value'] ?? 0;
$customerEmail = $data['customer']['email'] ?? $data['email'] ?? '';
$customerName = $data['customer']['name'] ?? $data['name'] ?? '';
$trackingParameters = $data['trackingParameters'] ?? $data['tracking_parameters'] ?? [];

// Processa baseado no status do pagamento
switch ($status) {
    case 'paid':
    case 'approved':
        // Pagamento aprovado - libera acesso ao conteúdo
        handleApprovedPayment($transactionId, $amount, $customerEmail, $customerName, $trackingParameters);
        break;
        
    case 'refunded':
        // Reembolso - revoga acesso
        handleRefund($transactionId, $customerEmail);
        break;
        
    case 'chargedback':
        // Chargeback - revoga acesso
        handleChargeback($transactionId, $customerEmail);
        break;
        
    case 'waiting_payment':
    case 'processing':
        // Aguardando pagamento - registra como pendente
        handlePendingPayment($transactionId, $amount, $customerEmail, $customerName);
        break;
        
    case 'refused':
    case 'rejected':
        // Pagamento recusado
        handleRefusedPayment($transactionId, $customerEmail);
        break;
        
    default:
        // Status desconhecido - apenas loga
        logWebhook(['unknown_status' => $status, 'data' => $data]);
        break;
}

// Retorna sucesso (código 2xx) para o TriboPay não reenviar
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Webhook processed',
    'status' => $status
]);

// ========== FUNÇÕES ==========

function handleApprovedPayment($transactionId, $amount, $email, $name, $trackingParameters = []) {
    $payment = [
        'transaction_id' => $transactionId,
        'amount' => $amount / 100, // TriboPay envia em centavos
        'email' => $email,
        'name' => $name,
        'status' => 'approved',
        'approved_at' => date('Y-m-d H:i:s'),
        'tracking_parameters' => $trackingParameters,
        'access_until' => date('Y-m-d H:i:s', strtotime('+30 days')) // Acesso de 30 dias
    ];
    
    savePayment($payment);
    
    // Aqui você pode:
    // - Enviar email de confirmação
    // - Liberar acesso ao conteúdo
    // - Atualizar banco de dados
    
    logWebhook(['action' => 'PAYMENT_APPROVED', 'payment' => $payment]);
    sendToUtmify($transactionId, $amount, $email, $name, $trackingParameters, 'paid');
}

function sendToUtmify($transactionId, $amount, $email, $name, $trackingParameters, $status) {
    $configFile = __DIR__ . '/data/tribopay.json';
    if (!file_exists($configFile)) return;

    $config = json_decode(file_get_contents($configFile), true) ?: [];
    $token = trim($config['utmifyToken'] ?? '');
    if ($token === '' || $transactionId === '') return;

    $createdAt = date('Y-m-d H:i:s');
    $amountInCents = (int) round(((float) $amount) * 100);
    if ($amountInCents <= 0) return;

    $tracking = [
        'src' => $trackingParameters['src'] ?? null,
        'sck' => $trackingParameters['sck'] ?? null,
        'utm_source' => $trackingParameters['utm_source'] ?? null,
        'utm_campaign' => $trackingParameters['utm_campaign'] ?? null,
        'utm_medium' => $trackingParameters['utm_medium'] ?? null,
        'utm_content' => $trackingParameters['utm_content'] ?? null,
        'utm_term' => $trackingParameters['utm_term'] ?? null
    ];

    $payload = json_encode([
        'orderId' => (string) $transactionId,
        'platform' => 'Privacy',
        'paymentMethod' => 'pix',
        'status' => $status,
        'createdAt' => $createdAt,
        'approvedDate' => $createdAt,
        'refundedAt' => null,
        'customer' => [
            'name' => $name ?: 'Cliente',
            'email' => $email ?: 'cliente@exemplo.com',
            'phone' => null,
            'document' => null,
            'country' => 'BR'
        ],
        'products' => [[
            'id' => 'privacy-subscription',
            'name' => 'Assinatura Privacy',
            'planId' => null,
            'planName' => null,
            'quantity' => 1,
            'priceInCents' => $amountInCents
        ]],
        'trackingParameters' => $tracking,
        'commission' => [
            'totalPriceInCents' => $amountInCents,
            'gatewayFeeInCents' => 0,
            'userCommissionInCents' => $amountInCents
        ]
    ]);

    $ch = curl_init('https://api.utmify.com.br/api-credentials/orders');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-token: ' . $token
        ]
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    logWebhook([
        'action' => 'UTMIFY_SENT',
        'order_id' => $transactionId,
        'http_code' => $httpCode,
        'success' => $httpCode >= 200 && $httpCode < 300,
        'response' => $response ? json_decode($response, true) : null
    ]);
}

function handleRefund($transactionId, $email) {
    // Revoga acesso do usuário
    $payment = [
        'transaction_id' => $transactionId,
        'email' => $email,
        'status' => 'refunded',
        'refunded_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'PAYMENT_REFUNDED', 'payment' => $payment]);
}

function handleChargeback($transactionId, $email) {
    // Revoga acesso e marca como chargeback
    $payment = [
        'transaction_id' => $transactionId,
        'email' => $email,
        'status' => 'chargedback',
        'chargedback_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'PAYMENT_CHARGEDBACK', 'payment' => $payment]);
}

function handlePendingPayment($transactionId, $amount, $email, $name) {
    $payment = [
        'transaction_id' => $transactionId,
        'amount' => $amount / 100,
        'email' => $email,
        'name' => $name,
        'status' => 'pending',
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'PAYMENT_PENDING', 'payment' => $payment]);
}

function handleRefusedPayment($transactionId, $email) {
    $payment = [
        'transaction_id' => $transactionId,
        'email' => $email,
        'status' => 'refused',
        'refused_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'PAYMENT_REFUSED', 'payment' => $payment]);
}

function savePayment($payment) {
    // Cria diretório se não existir
    $dir = dirname(PAYMENTS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Carrega pagamentos existentes
    $payments = [];
    if (file_exists(PAYMENTS_FILE)) {
        $payments = json_decode(file_get_contents(PAYMENTS_FILE), true) ?: [];
    }
    
    // Adiciona ou atualiza pagamento
    $found = false;
    foreach ($payments as &$p) {
        if ($p['transaction_id'] === $payment['transaction_id']) {
            $p = array_merge($p, $payment);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $payments[] = $payment;
    }
    
    // Salva arquivo
    file_put_contents(PAYMENTS_FILE, json_encode($payments, JSON_PRETTY_PRINT));
}

function logWebhook($data) {
    // Cria diretório se não existir
    $dir = dirname(LOG_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $log = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'data' => $data
    ];
    
    file_put_contents(LOG_FILE, json_encode($log) . "\n", FILE_APPEND);
}
?>
