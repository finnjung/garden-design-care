<?php
// Sicherheitseinstellungen
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// CORS für lokale Entwicklung (kann für Produktion angepasst werden)
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = ['http://localhost', 'https://gardendesignundcare.de'];
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    }
}

// Nur POST-Anfragen erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Nur POST-Anfragen erlaubt.']);
    exit;
}

// Eingabedaten validieren und bereinigen
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validatePhone($phone) {
    // Deutsche Telefonnummern-Validierung
    $phone = preg_replace('/[^0-9+\-\s()]/', '', $phone);
    return !empty($phone) && strlen($phone) >= 10;
}

// Eingabedaten erfassen
$name = isset($_POST['name']) ? sanitizeInput($_POST['name']) : '';
$email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : '';
$phone = isset($_POST['phone']) ? sanitizeInput($_POST['phone']) : '';
$service = isset($_POST['service']) ? sanitizeInput($_POST['service']) : '';
$message = isset($_POST['message']) ? sanitizeInput($_POST['message']) : '';

// Validierung
$errors = [];

if (empty($name) || strlen($name) < 2) {
    $errors[] = 'Bitte geben Sie einen gültigen Namen ein.';
}

if (empty($email) || !validateEmail($email)) {
    $errors[] = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
}

if (!empty($phone) && !validatePhone($phone)) {
    $errors[] = 'Bitte geben Sie eine gültige Telefonnummer ein.';
}

if (empty($service)) {
    $errors[] = 'Bitte wählen Sie eine gewünschte Leistung aus.';
}

if (empty($message) || strlen($message) < 10) {
    $errors[] = 'Bitte geben Sie eine Nachricht mit mindestens 10 Zeichen ein.';
}

// Spam-Schutz: Honeypot-Feld prüfen
if (!empty($_POST['website'])) {
    $errors[] = 'Spam erkannt.';
}

// Rate Limiting (einfache Session-basierte Implementierung)
session_start();
$current_time = time();
if (isset($_SESSION['last_form_submission'])) {
    $time_diff = $current_time - $_SESSION['last_form_submission'];
    if ($time_diff < 60) { // Mindestens 60 Sekunden zwischen Nachrichten
        $errors[] = 'Bitte warten Sie mindestens eine Minute zwischen den Nachrichten.';
    }
}

// Bei Fehlern: JSON-Antwort senden
if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Bitte korrigieren Sie folgende Fehler:',
        'errors' => $errors
    ]);
    exit;
}

// Service-Namen für bessere Lesbarkeit
$service_names = [
    'beratung' => 'Kostenlose Beratung',
    'planung' => 'Gartenplanung',
    'anlage' => 'Gartenanlage',
    'pflege' => 'Gartenpflege',
    'terrassen' => 'Terrassen & Wege',
    'pools' => 'Pools & Wasserlandschaften',
    'sonstiges' => 'Sonstiges'
];

$service_display = isset($service_names[$service]) ? $service_names[$service] : $service;

// E-Mail-Konfiguration
$to_email = 'info@gardendesignundcare.de';
$subject = 'Neue Kontaktanfrage über Website - ' . $service_display;

// E-Mail-Inhalt erstellen
$email_body = "Neue Kontaktanfrage über die Website\n\n";
$email_body .= "=================================\n\n";
$email_body .= "Name: " . $name . "\n";
$email_body .= "E-Mail: " . $email . "\n";
$email_body .= "Telefon: " . ($phone ? $phone : 'Nicht angegeben') . "\n";
$email_body .= "Gewünschte Leistung: " . $service_display . "\n\n";
$email_body .= "Nachricht:\n" . $message . "\n\n";
$email_body .= "=================================\n";
$email_body .= "Gesendet am: " . date('d.m.Y H:i:s') . "\n";
$email_body .= "IP-Adresse: " . $_SERVER['REMOTE_ADDR'] . "\n";

// E-Mail-Header
$headers = [];
$headers[] = 'From: Website Kontaktformular <noreply@gardendesignundcare.de>';
$headers[] = 'Reply-To: ' . $name . ' <' . $email . '>';
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';

// E-Mail senden
$mail_sent = mail($to_email, $subject, $email_body, implode("\r\n", $headers));

if ($mail_sent) {
    // Erfolg: Session-Zeit aktualisieren
    $_SESSION['last_form_submission'] = $current_time;
    
    // Erfolgsantwort senden
    echo json_encode([
        'success' => true,
        'message' => 'Vielen Dank für Ihre Nachricht! Wir melden uns schnellstmöglich bei Ihnen.'
    ]);
    
    // Optional: Log für erfolgreiche Sendungen
    error_log("Kontaktformular: E-Mail erfolgreich gesendet an $to_email von $name ($email)");
    
} else {
    // Fehler beim Senden
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Entschuldigung, beim Senden der Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.'
    ]);
    
    // Fehler loggen
    error_log("Kontaktformular: Fehler beim Senden der E-Mail von $name ($email)");
}
?>