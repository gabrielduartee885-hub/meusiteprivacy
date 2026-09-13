<?php
/**
 * SyncPay Webhook Receiver
 * 
 * Recebe notificações de pagamento do SyncPay (CashIn)
 * Configure esta URL no campo webhook_url ao criar cobranças
 * 
 * Formato do webhook (novo - v2):
 * - OnCreate: cashin.create (status = pending)
 * - OnUpdate: cashin.update (status = completed, failed, refunded, med)
 * 
 * Headers enviados pelo SyncPay:
 * - event: cashin.create ou cashin.update
 * - Authorization: Bearer {TOKEN}
 */

// Configurações
define('LOG_FILE', __DIR__ . '/logs/webhook_syncpay_log.txt');
define('PAYMENTS_FILE', __DIR__ . '/data/payments_syncpay.json');

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
$rawData = json_decode($payload, true);

// Se não houver dados, retorna erro
if (!$rawData) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

// Log do webhook recebido
$event = $_SERVER['HTTP_EVENT'] ?? 'unknown';
logWebhook(['event' => $event, 'raw_payload' => $rawData]);

// O SyncPay V2 envia os dados dentro de "data"
$data = $rawData['data'] ?? $rawData;

// Extrai campos do webhook SyncPay (formato novo v2)
$transactionId = $data['id'] ?? '';
$status = $data['status'] ?? ''; // pending, completed, failed, refunded, med
$amount = $data['amount'] ?? 0;
$finalAmount = $data['final_amount'] ?? 0;
$currency = $data['currency'] ?? 'BRL';
$pixCode = $data['pix_code'] ?? '';
$paymentMethod = $data['payment_method'] ?? 'PIX';
$endToEnd = $data['end_to_end'] ?? '';
$createdAt = $data['created_at'] ?? '';
$updatedAt = $data['updated_at'] ?? '';

// Dados do cliente (quem solicitou o pagamento)
$clientName = $data['client']['name'] ?? '';
$clientEmail = $data['client']['email'] ?? '';
$clientDocument = $data['client']['document'] ?? '';

// Dados do pagador (quem efetivamente pagou - disponível no OnUpdate)
$debtorName = $data['debtor_account']['name'] ?? '';
$debtorDocument = $data['debtor_account']['document'] ?? '';

// Processa baseado no status do pagamento
// Status possíveis: pending, completed, failed, refunded, med
switch ($status) {
    case 'completed':
        handleCompletedPayment($transactionId, $amount, $finalAmount, $clientName, $clientEmail, $clientDocument, $debtorName, $debtorDocument, $endToEnd);
        break;
        
    case 'pending':
        handlePendingPayment($transactionId, $amount, $clientName, $clientEmail, $clientDocument, $pixCode);
        break;
        
    case 'failed':
        handleFailedPayment($transactionId, $clientName, $clientDocument);
        break;

    case 'refunded':
        handleRefundedPayment($transactionId, $clientName, $clientDocument);
        break;
        
    case 'med':
        handleMedPayment($transactionId, $clientName, $clientDocument);
        break;
        
    default:
        logWebhook(['warning' => 'Unknown status', 'status' => $status, 'data' => $data]);
        break;
}

// Retorna sucesso (código 2xx) para o SyncPay não reenviar
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Webhook processed',
    'status' => $status
]);

// ========== FUNÇÕES ==========

function handleCompletedPayment($transactionId, $amount, $finalAmount, $clientName, $clientEmail, $clientDocument, $debtorName, $debtorDocument, $endToEnd) {
    $payment = [
        'transaction_id' => $transactionId,
        'amount' => $amount,
        'final_amount' => $finalAmount,
        'client_name' => $clientName,
        'client_email' => $clientEmail,
        'client_document' => $clientDocument,
        'debtor_name' => $debtorName,
        'debtor_document' => $debtorDocument,
        'end_to_end' => $endToEnd,
        'status' => 'completed',
        'gateway' => 'syncpay',
        'completed_at' => date('Y-m-d H:i:s'),
        'access_until' => date('Y-m-d H:i:s', strtotime('+30 days'))
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'SYNCPAY_PAYMENT_COMPLETED', 'payment' => $payment]);
}

function handlePendingPayment($transactionId, $amount, $clientName, $clientEmail, $clientDocument, $pixCode) {
    $payment = [
        'transaction_id' => $transactionId,
        'amount' => $amount,
        'client_name' => $clientName,
        'client_email' => $clientEmail,
        'client_document' => $clientDocument,
        'pix_code' => $pixCode,
        'status' => 'pending',
        'gateway' => 'syncpay',
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'SYNCPAY_PAYMENT_PENDING', 'payment' => $payment]);
}

function handleFailedPayment($transactionId, $clientName, $clientDocument) {
    $payment = [
        'transaction_id' => $transactionId,
        'client_name' => $clientName,
        'client_document' => $clientDocument,
        'status' => 'failed',
        'gateway' => 'syncpay',
        'failed_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'SYNCPAY_PAYMENT_FAILED', 'payment' => $payment]);
}

function handleRefundedPayment($transactionId, $clientName, $clientDocument) {
    $payment = [
        'transaction_id' => $transactionId,
        'client_name' => $clientName,
        'client_document' => $clientDocument,
        'status' => 'refunded',
        'gateway' => 'syncpay',
        'refunded_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'SYNCPAY_PAYMENT_REFUNDED', 'payment' => $payment]);
}

function handleMedPayment($transactionId, $clientName, $clientDocument) {
    $payment = [
        'transaction_id' => $transactionId,
        'client_name' => $clientName,
        'client_document' => $clientDocument,
        'status' => 'med',
        'gateway' => 'syncpay',
        'med_at' => date('Y-m-d H:i:s')
    ];
    
    savePayment($payment);
    logWebhook(['action' => 'SYNCPAY_PAYMENT_MED', 'payment' => $payment]);
}

function savePayment($payment) {
    $dir = dirname(PAYMENTS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $payments = [];
    if (file_exists(PAYMENTS_FILE)) {
        $payments = json_decode(file_get_contents(PAYMENTS_FILE), true) ?: [];
    }
    
    // Adiciona ou atualiza pagamento pelo transaction_id
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
    
    file_put_contents(PAYMENTS_FILE, json_encode($payments, JSON_PRETTY_PRINT));
}

function logWebhook($data) {
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
