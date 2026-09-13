<?php
/**
 * TriboPay Pix Generator
 * 
 * Este arquivo faz a chamada para a API do TriboPay para gerar um QR Code Pix
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

// Recebe os dados
$input = json_decode(file_get_contents('php://input'), true);

$token = $input['token'] ?? '';
$amount = $input['amount'] ?? 0;
$description = $input['description'] ?? 'Assinatura Privacy';
$trackingParameters = $input['trackingParameters'] ?? [];

if (empty($token) || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Token e valor são obrigatórios']);
    exit;
}

// Tenta chamar a API do TriboPay
$result = createTriboPayPix($token, $amount, $description, $trackingParameters);

if ($result['success']) {
    echo json_encode($result);
} else {
    // Se falhar, gera QR Code estático como fallback
    $fallbackPix = generateFallbackPix($input['pixKey'] ?? '', $amount);
    echo json_encode($fallbackPix);
}

function createTriboPayPix($token, $amount, $description, $trackingParameters = []) {
    // Endpoints possíveis do TriboPay
    $endpoints = [
        'https://api.tribopay.com.br/v1/pix/qrcode',
        'https://api.tribopay.com.br/pix/create',
        'https://api.tribopay.com.br/v1/charges',
        'https://public-api.tribopay.com.br/pix/create'
    ];
    
    $amountInCents = intval($amount * 100);
    
    $payload = json_encode([
        'amount' => $amountInCents,
        'value' => $amountInCents,
        'description' => $description,
        'trackingParameters' => $trackingParameters,
        'expiresIn' => 900, // 15 minutos
        'expiration' => 900
    ]);
    
    foreach ($endpoints as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
                'Accept: application/json'
            ],
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        // Log para debug
        error_log("TriboPay API Call: $url - HTTP $httpCode");
        
        if ($httpCode >= 200 && $httpCode < 300 && $response) {
            $data = json_decode($response, true);
            
            if ($data) {
                // Tenta extrair o QR Code e código Pix de diferentes formatos de resposta
                $qrCode = $data['qr_code_image'] ?? $data['qrCodeImage'] ?? $data['qrcode'] ?? $data['image'] ?? null;
                $pixCode = $data['pix_code'] ?? $data['pixCode'] ?? $data['copy_paste'] ?? $data['brcode'] ?? $data['emv'] ?? null;
                
                if ($qrCode || $pixCode) {
                    return [
                        'success' => true,
                        'qrCode' => $qrCode,
                        'pixCode' => $pixCode,
                        'transactionId' => $data['id'] ?? $data['transaction_id'] ?? null
                    ];
                }
            }
        }
    }
    
    return ['success' => false, 'error' => 'API não respondeu'];
}

function generateFallbackPix($pixKey, $amount) {
    if (empty($pixKey)) {
        return [
            'success' => false,
            'error' => 'Configure sua Chave Pix no admin para usar o fallback',
            'isDemo' => true,
            'qrCode' => 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CONFIGURE_PIX_KEY',
            'pixCode' => 'Configure sua Chave Pix no painel admin'
        ];
    }
    
    // Gera código Pix EMV básico
    $pixCode = generatePixEMV($pixKey, $amount);
    $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($pixCode);
    
    return [
        'success' => true,
        'qrCode' => $qrCodeUrl,
        'pixCode' => $pixCode,
        'isFallback' => true
    ];
}

function generatePixEMV($pixKey, $amount) {
    // Formato EMV simplificado para Pix
    $merchantAccountInfo = "0014BR.GOV.BCB.PIX01" . sprintf("%02d", strlen($pixKey)) . $pixKey;
    $merchantAccountInfoLen = sprintf("%02d", strlen($merchantAccountInfo));
    
    $transactionAmount = number_format($amount, 2, '.', '');
    $transactionAmountLen = sprintf("%02d", strlen($transactionAmount));
    
    // Monta o payload EMV
    $payload = "000201";
    $payload .= "26" . $merchantAccountInfoLen . $merchantAccountInfo;
    $payload .= "52040000";
    $payload .= "5303986";
    $payload .= "54" . $transactionAmountLen . $transactionAmount;
    $payload .= "5802BR";
    $payload .= "5913PRIVACY";
    $payload .= "6008SAOPAULO";
    $payload .= "62070503***";
    $payload .= "6304";
    
    // Calcula CRC16
    $payload .= calculateCRC16($payload);
    
    return $payload;
}

function calculateCRC16($payload) {
    $polynomial = 0x1021;
    $crc = 0xFFFF;
    
    $bytes = str_split($payload);
    foreach ($bytes as $byte) {
        $crc ^= (ord($byte) << 8);
        for ($i = 0; $i < 8; $i++) {
            if ($crc & 0x8000) {
                $crc = ($crc << 1) ^ $polynomial;
            } else {
                $crc <<= 1;
            }
            $crc &= 0xFFFF;
        }
    }
    
    return strtoupper(sprintf("%04X", $crc));
}
?>
