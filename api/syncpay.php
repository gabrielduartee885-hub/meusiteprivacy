<?php
/**
 * SyncPay Pix Generator
 * 
 * Este arquivo faz a autenticação e chamada para a API do SyncPay
 * para gerar uma cobrança Pix (CashIn)
 * A chamada precisa ser feita pelo backend devido a restrições CORS
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Apenas aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Recebe os dados do frontend
$input = json_decode(file_get_contents('php://input'), true);

$baseUrl = $input['base_url'] ?? '';
$clientId = $input['client_id'] ?? '';
$clientSecret = $input['client_secret'] ?? '';
$amount = $input['amount'] ?? 0;
$description = $input['description'] ?? 'Assinatura Privacy';
$webhookUrl = $input['webhook_url'] ?? '';

// Dados opcionais do cliente (pagador)
$clientData = $input['client'] ?? null;

// Validações
if (empty($baseUrl) || empty($clientId) || empty($clientSecret) || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Base URL, Client ID, Client Secret e valor são obrigatórios']);
    exit;
}

// Log para debug
error_log("SyncPay: Iniciando pagamento - Valor: R$ " . number_format($amount, 2, ',', '.'));

// === PASSO 1: Obter Bearer Token ===
$tokenResult = getSyncPayToken($baseUrl, $clientId, $clientSecret);

if (!$tokenResult['success']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Falha na autenticação SyncPay: ' . ($tokenResult['error'] ?? 'Erro desconhecido')
    ]);
    exit;
}

$accessToken = $tokenResult['access_token'];

// === PASSO 2: Criar Cobrança Pix (CashIn) ===
$pixResult = createSyncPayCashIn($baseUrl, $accessToken, $amount, $description, $webhookUrl, $clientData);

if ($pixResult['success']) {
    // Gera QR Code a partir do pix_code
    $pixCode = $pixResult['pix_code'];
    $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' . urlencode($pixCode);
    
    echo json_encode([
        'success' => true,
        'pixCode' => $pixCode,
        'qrCode' => $qrCodeUrl,
        'identifier' => $pixResult['identifier'],
        'gateway' => 'syncpay'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Falha ao gerar Pix: ' . ($pixResult['error'] ?? 'Erro desconhecido'),
        'gateway' => 'syncpay'
    ]);
}

// ========== FUNÇÕES ==========

/**
 * Obtém Bearer Token da API SyncPay
 */
function getSyncPayToken($baseUrl, $clientId, $clientSecret) {
    $url = rtrim($baseUrl, '/') . '/api/partner/v1/auth-token';
    
    $payload = json_encode([
        'client_id' => $clientId,
        'client_secret' => $clientSecret
    ]);
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    error_log("SyncPay Auth: HTTP $httpCode - URL: $url");
    
    if ($error) {
        return ['success' => false, 'error' => "cURL Error: $error"];
    }
    
    if ($httpCode >= 200 && $httpCode < 300 && $response) {
        $data = json_decode($response, true);
        if (isset($data['access_token'])) {
            return [
                'success' => true,
                'access_token' => $data['access_token'],
                'expires_in' => $data['expires_in'] ?? 3600
            ];
        }
    }
    
    $data = json_decode($response, true);
    return [
        'success' => false, 
        'error' => $data['message'] ?? "HTTP $httpCode - Falha na autenticação"
    ];
}

/**
 * Cria cobrança Pix (CashIn) na API SyncPay
 */
function createSyncPayCashIn($baseUrl, $token, $amount, $description, $webhookUrl, $clientData = null) {
    $url = rtrim($baseUrl, '/') . '/api/partner/v1/cash-in';
    
    $payload = [
        'amount' => floatval($amount),
        'description' => $description
    ];
    
    // Adiciona webhook_url se configurada
    if (!empty($webhookUrl)) {
        $payload['webhook_url'] = $webhookUrl;
    }
    
    // Adiciona dados do cliente se fornecidos
    if ($clientData && !empty($clientData['name']) && !empty($clientData['cpf'])) {
        $payload['client'] = [
            'name' => $clientData['name'],
            'cpf' => preg_replace('/[^0-9]/', '', $clientData['cpf']),
            'email' => $clientData['email'] ?? '',
            'phone' => preg_replace('/[^0-9]/', '', $clientData['phone'] ?? '')
        ];
    }
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $token
        ],
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    error_log("SyncPay CashIn: HTTP $httpCode - URL: $url");
    
    if ($error) {
        return ['success' => false, 'error' => "cURL Error: $error"];
    }
    
    if ($httpCode >= 200 && $httpCode < 300 && $response) {
        $data = json_decode($response, true);
        
        if (isset($data['pix_code'])) {
            return [
                'success' => true,
                'pix_code' => $data['pix_code'],
                'identifier' => $data['identifier'] ?? null,
                'message' => $data['message'] ?? 'OK'
            ];
        }
    }
    
    $data = json_decode($response, true);
    return [
        'success' => false, 
        'error' => $data['message'] ?? "HTTP $httpCode - Falha ao criar cobrança"
    ];
}
?>
