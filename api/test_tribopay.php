<?php
/**
 * TriboPay API Test
 * 
 * Use este arquivo para testar a conexão com a API TriboPay
 * Acesse: https://seusite.com/api/test_tribopay.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Teste API TriboPay</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: #1a1a2e; color: #fff; }
        h1 { color: #8b5cf6; }
        .result { background: #16213e; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .success { border-left: 4px solid #22c55e; }
        .error { border-left: 4px solid #ef4444; }
        .info { border-left: 4px solid #3b82f6; }
        pre { background: #0f0f23; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        form { background: #16213e; padding: 20px; border-radius: 8px; margin: 20px 0; }
        input, button { padding: 10px; margin: 5px 0; border-radius: 4px; border: none; width: 100%; box-sizing: border-box; }
        input { background: #0f0f23; color: #fff; }
        button { background: #8b5cf6; color: white; cursor: pointer; }
        button:hover { background: #7c3aed; }
    </style>
</head>
<body>
    <h1>🔧 Teste API TriboPay</h1>
    
    <form method="POST">
        <label>Token da API Pública:</label>
        <input type="text" name="token" placeholder="Cole seu token aqui..." value="<?= htmlspecialchars($_POST['token'] ?? '') ?>" required>
        
        <label>Valor (R$):</label>
        <input type="number" name="amount" step="0.01" value="<?= $_POST['amount'] ?? '1.00' ?>" required>
        
        <button type="submit">🚀 Testar Conexão</button>
    </form>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['token'])):
    $token = $_POST['token'];
    $amount = floatval($_POST['amount']) * 100; // Converter para centavos
    
    echo '<div class="result info"><strong>📋 Dados do Teste:</strong><br>';
    echo 'Token: ' . substr($token, 0, 20) . '...<br>';
    echo 'Valor: R$ ' . number_format($amount/100, 2, ',', '.') . ' (' . $amount . ' centavos)</div>';
    
    // Lista de endpoints para testar
    $endpoints = [
        'https://api.tribopay.com.br/v1/pix/qrcode' => 'API v1 - Pix QRCode',
        'https://api.tribopay.com.br/v1/pix/charge' => 'API v1 - Pix Charge',
        'https://api.tribopay.com.br/pix/create' => 'API - Pix Create',
        'https://api.tribopay.com.br/v1/charges' => 'API v1 - Charges',
        'https://public-api.tribopay.com.br/v1/pix' => 'Public API - Pix',
        'https://api.tribopay.com.br/v1/transactions/pix' => 'API v1 - Transactions Pix'
    ];
    
    echo '<h3>🔍 Testando Endpoints...</h3>';
    
    foreach ($endpoints as $url => $name):
        echo "<div class='result'>";
        echo "<strong>$name</strong><br><small>$url</small><br><br>";
        
        $payload = json_encode([
            'amount' => intval($amount),
            'value' => intval($amount),
            'description' => 'Teste de conexão',
            'expiresIn' => 900,
            'expiration' => 900
        ]);
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
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
        
        echo "HTTP Status: <strong>$httpCode</strong><br>";
        
        if ($error):
            echo "<span style='color: #ef4444;'>Erro cURL: $error</span>";
        else:
            $data = json_decode($response, true);
            echo "<pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
            
            // Verifica se conseguiu o QR Code
            if (isset($data['qr_code']) || isset($data['qrcode']) || isset($data['pixCode']) || isset($data['brcode'])):
                echo "<span style='color: #22c55e;'>✅ SUCESSO! Este endpoint funciona!</span>";
            elseif ($httpCode >= 200 && $httpCode < 300):
                echo "<span style='color: #f59e0b;'>⚠️ Resposta OK mas sem QR Code</span>";
            else:
                echo "<span style='color: #ef4444;'>❌ Endpoint não funcionou</span>";
            endif;
        endif;
        
        echo "</div>";
    endforeach;
    
    // Informações do PHP
    echo '<div class="result info">';
    echo '<strong>📊 Informações do Servidor:</strong><br>';
    echo 'PHP Version: ' . phpversion() . '<br>';
    echo 'cURL: ' . (function_exists('curl_init') ? '✅ Instalado' : '❌ Não instalado') . '<br>';
    echo 'SSL: ' . (extension_loaded('openssl') ? '✅ Instalado' : '❌ Não instalado') . '<br>';
    echo '</div>';
    
endif;
?>

    <div class="result info">
        <strong>💡 Dicas:</strong><br>
        - O token deve ser da <strong>API Pública</strong> (não Cash API)<br>
        - Verifique se o token está ativo no painel TriboPay<br>
        - A API pode exigir endpoints diferentes para criar cobranças Pix
    </div>
</body>
</html>
