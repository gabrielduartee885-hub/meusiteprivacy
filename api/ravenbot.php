<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$configFile = __DIR__ . '/../data/ravenbot.json';
$config = file_exists($configFile) ? (json_decode(file_get_contents($configFile), true) ?: []) : [];
$apiKey = trim($config['apiKey'] ?? '');
$amount = (float) ($input['amount'] ?? 0);

if ($apiKey === '' || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Configure a API key RavenBot e informe um valor válido']);
    exit;
}

$externalId = trim($input['external_id'] ?? ('privacy-' . uniqid()));
$payload = [
    'amount' => $amount,
    'description' => $input['description'] ?? 'Assinatura Privacy',
    'external_id' => $externalId,
    'webhook_url' => $input['webhook_url'] ?? ''
];

$ch = curl_init('https://wallet.ravenbot.com.br/api/pix/create');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'x-api-key: ' . $apiKey
    ],
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$data = json_decode($response ?: '', true) ?: [];
if ($curlError || $httpCode < 200 || $httpCode >= 300) {
    http_response_code($httpCode >= 400 ? $httpCode : 502);
    echo json_encode(['error' => $data['message'] ?? $data['error'] ?? $curlError ?? 'Falha ao criar cobrança RavenBot']);
    exit;
}

$pixCode = $data['pix_code'] ?? $data['pixCode'] ?? $data['brcode'] ?? $data['copy_paste'] ?? $data['data']['pix_code'] ?? $data['data']['pixCode'] ?? '';
$qrCode = $data['qr_code'] ?? $data['qrCode'] ?? $data['qr_code_image'] ?? $data['data']['qr_code'] ?? $data['data']['qrCode'] ?? '';
$transactionId = $data['id'] ?? $data['transaction_id'] ?? $data['data']['id'] ?? $externalId;

if ($pixCode === '') {
    http_response_code(502);
    echo json_encode(['error' => 'A RavenBot não retornou um código Pix', 'response' => $data]);
    exit;
}

echo json_encode([
    'success' => true,
    'pixCode' => $pixCode,
    'qrCode' => $qrCode,
    'transactionId' => $transactionId,
    'externalId' => $externalId,
    'gateway' => 'ravenbot'
]);
?>