<?php
define('LOG_FILE', __DIR__ . '/logs/webhook_ravenbot_log.txt');
define('PAYMENTS_FILE', __DIR__ . '/data/payments_ravenbot.json');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$rawPayload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$configFile = __DIR__ . '/data/ravenbot.json';
$config = file_exists($configFile) ? (json_decode(file_get_contents($configFile), true) ?: []) : [];
$secret = trim($config['webhookSecret'] ?? '');

if ($secret !== '' && !isValidSignature($signature, $rawPayload, $secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid webhook signature']);
    exit;
}

$data = json_decode($rawPayload, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$event = $data['event'] ?? $data['type'] ?? '';
$payment = $data['data'] ?? $data;
$status = $payment['status'] ?? ($event === 'payment.confirmed' ? 'confirmed' : '');
$transactionId = (string) ($payment['id'] ?? $payment['transaction_id'] ?? $payment['external_id'] ?? '');

savePayment([
    'transaction_id' => $transactionId,
    'external_id' => $payment['external_id'] ?? null,
    'amount' => $payment['amount'] ?? $payment['value'] ?? 0,
    'status' => $status,
    'event' => $event,
    'received_at' => date('c')
]);
logWebhook(['event' => $event, 'payload' => $data]);

http_response_code(200);
echo json_encode(['success' => true]);

function isValidSignature($header, $payload, $secret) {
    $fields = [];
    foreach (explode(',', $header) as $part) {
        $pair = explode('=', trim($part), 2);
        if (count($pair) === 2) $fields[$pair[0]] = $pair[1];
    }
    if (empty($fields['t']) || empty($fields['v1']) || abs(time() - (int) $fields['t']) > 300) return false;
    $expected = hash_hmac('sha256', $fields['t'] . '.' . $payload, $secret);
    return hash_equals($expected, $fields['v1']);
}

function savePayment($payment) {
    $payments = file_exists(PAYMENTS_FILE) ? (json_decode(file_get_contents(PAYMENTS_FILE), true) ?: []) : [];
    $updated = false;
    foreach ($payments as &$item) {
        if ($item['transaction_id'] === $payment['transaction_id'] && $payment['transaction_id'] !== '') {
            $item = array_merge($item, $payment);
            $updated = true;
            break;
        }
    }
    if (!$updated) $payments[] = $payment;
    if (!is_dir(dirname(PAYMENTS_FILE))) mkdir(dirname(PAYMENTS_FILE), 0755, true);
    file_put_contents(PAYMENTS_FILE, json_encode($payments, JSON_PRETTY_PRINT));
}

function logWebhook($data) {
    if (!is_dir(dirname(LOG_FILE))) mkdir(dirname(LOG_FILE), 0755, true);
    file_put_contents(LOG_FILE, json_encode(['timestamp' => date('c'), 'data' => $data]) . PHP_EOL, FILE_APPEND);
}
?>