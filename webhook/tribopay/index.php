<?php
// Configurações
$logFile = 'webhook.log';

// Define que a resposta será JSON
header('Content-Type: application/json');

// Recebe o corpo da requisição (JSON)
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

// Prepara a entrada do log
$timestamp = date('Y-m-d H:i:s');
$remoteIp = $_SERVER['REMOTE_ADDR'];
$logEntry = "[$timestamp] IP: $remoteIp\n";

if ($data) {
    // Se recebeu um JSON válido
    $logEntry .= "Dados Recebidos: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    $logEntry .= "-----------------------------------\n";
    
    // Responde 200 OK para a TriboPay
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Webhook recebido com sucesso']);
} else {
    // Se não recebeu JSON
    $logEntry .= "Payload vazio ou inválido.\n";
    $logEntry .= "-----------------------------------\n";
    
    // Responde 200 também (pra não travar a TriboPay), mas avisa que foi vazio
    http_response_code(200);
    echo json_encode(['status' => 'warning', 'message' => 'Nenhum dado JSON recebido']);
}

// Salva no arquivo de log
file_put_contents($logFile, $logEntry, FILE_APPEND);
?>
