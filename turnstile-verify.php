<?php
/**
 * Cloudflare Turnstile Server-Side Verification
 * Diese Funktion validiert das Turnstile-Token serverseitig
 */

function verifyTurnstile($token, $remoteIp = null) {
    // Lade Umgebungsvariablen (falls .env Datei verwendet wird)
    if (file_exists('.env')) {
        $env = parse_ini_file('.env');
        $secretKey = $env['TURNSTILE_SECRET_KEY'] ?? null;
        $verifyUrl = $env['TURNSTILE_VERIFY_URL'] ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    } else {
        // Fallback: Direkte Konfiguration
        $secretKey = 'YOUR_TURNSTILE_SECRET_KEY_HERE';
        $verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    }

    // Prüfe ob Secret Key gesetzt ist
    if (empty($secretKey) || $secretKey === 'YOUR_TURNSTILE_SECRET_KEY_HERE') {
        error_log('Turnstile: Secret Key nicht konfiguriert');
        return false;
    }

    // Prüfe ob Token vorhanden ist
    if (empty($token)) {
        error_log('Turnstile: Kein Token empfangen');
        return false;
    }

    // Erstelle POST-Daten für Turnstile API
    $postData = [
        'secret' => $secretKey,
        'response' => $token
    ];

    // Füge IP-Adresse hinzu falls vorhanden
    if ($remoteIp) {
        $postData['remoteip'] = $remoteIp;
    }

    // cURL für API-Aufruf konfigurieren
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $verifyUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);

    // API-Aufruf ausführen
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_error($ch)) {
        error_log('Turnstile cURL Error: ' . curl_error($ch));
        curl_close($ch);
        return false;
    }
    
    curl_close($ch);

    // HTTP-Status prüfen
    if ($httpCode !== 200) {
        error_log("Turnstile API HTTP Error: $httpCode");
        return false;
    }

    // JSON Response parsen
    $result = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('Turnstile: JSON Decode Error - ' . json_last_error_msg());
        return false;
    }

    // Ergebnis loggen für Debugging
    error_log('Turnstile Response: ' . print_r($result, true));

    // Validierung erfolgreich?
    return isset($result['success']) && $result['success'] === true;
}

/**
 * Hilfsfunktion: Client IP-Adresse ermitteln
 */
function getClientIp() {
    $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            $ip = $_SERVER[$key];
            if (strpos($ip, ',') !== false) {
                $ip = explode(',', $ip)[0];
            }
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

/**
 * Beispiel-Verwendung in Ihrem Kontaktformular:
 * 
 * if ($_POST) {
 *     $turnstileToken = $_POST['cf-turnstile-response'] ?? '';
 *     $clientIp = getClientIp();
 *     
 *     if (!verifyTurnstile($turnstileToken, $clientIp)) {
 *         die('Spam-Schutz Validierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
 *     }
 *     
 *     // Hier folgt Ihre normale Formularverarbeitung...
 * }
 */
?>