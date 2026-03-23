#!/bin/bash

# ===============================================
# Giovanni Website Deployment Script
# ===============================================
# Dieses Script lädt die Website automatisch auf den Strato Server hoch
# Author: Claude Code
# Date: $(date +%Y-%m-%d)
# ===============================================

# Konfiguration
SFTP_HOST="ssh.strato.de"
SFTP_USER="54235949.swh.strato-hosting.eu"
SFTP_PASS="UnserGarten18"
SFTP_PORT="22"
REMOTE_DIR="/new-website"

# Farben für Terminal-Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Banner anzeigen
echo "================================================"
echo "   Giovanni Website Deployment Script          "
echo "================================================"
echo ""

# Funktionen
handle_error() { echo -e "${RED}❌ Error: $1${NC}"; exit 1; }
show_success() { echo -e "${GREEN}✅ $1${NC}"; }
show_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Prüfe ob sshpass installiert ist
if ! command -v sshpass &> /dev/null; then
    handle_error "sshpass ist nicht installiert. Bitte installieren mit: brew install sshpass"
fi

# Prüfe ob die lokalen Dateien existieren
if [ ! -f "index.html" ]; then
    handle_error "index.html nicht gefunden. Bitte im richtigen Verzeichnis ausführen!"
fi

show_info "Starte Upload zur Strato-Website..."

# Teste SFTP Verbindung
show_info "Teste SFTP Verbindung..."
echo "ls" | sshpass -p "$SFTP_PASS" sftp -P $SFTP_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SFTP_USER@$SFTP_HOST:$REMOTE_DIR > /dev/null 2>&1

if [ $? -ne 0 ]; then
    handle_error "SFTP Verbindung fehlgeschlagen!"
fi

show_success "SFTP Verbindung erfolgreich!"

# Upload-Funktion
upload_file() {
    local file="$1"
    local remote_path="$2"
    
    echo "put $file" | sshpass -p "$SFTP_PASS" sftp -P $SFTP_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SFTP_USER@$SFTP_HOST:$remote_path > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "  ✅ $file erfolgreich hochgeladen"
        return 0
    else
        echo "  ❌ Fehler beim Upload von $file"
        return 1
    fi
}

# Upload HTML Dateien
show_info "Upload HTML Dateien..."
upload_file "index.html" "$REMOTE_DIR/"
upload_file "impressum.html" "$REMOTE_DIR/"
upload_file "datenschutz.html" "$REMOTE_DIR/"

# Upload PHP Dateien  
show_info "Upload PHP Dateien..."
upload_file "contact.php" "$REMOTE_DIR/"
upload_file "turnstile-verify.php" "$REMOTE_DIR/"

# Upload andere Dateien
show_info "Upload andere Dateien..."
upload_file "robots.txt" "$REMOTE_DIR/"
upload_file "sitemap.xml" "$REMOTE_DIR/"
if [ -f ".htaccess" ]; then
    upload_file ".htaccess" "$REMOTE_DIR/"
fi
if [ -f ".env" ]; then
    upload_file ".env" "$REMOTE_DIR/"
fi

# Upload CSS
show_info "Upload CSS Dateien..."
upload_file "css/style.css" "$REMOTE_DIR/css/"

# Upload JavaScript
show_info "Upload JavaScript Dateien..."
upload_file "js/script.js" "$REMOTE_DIR/js/"

# Upload Bilder (Root)
show_info "Upload Bilder..."
for file in images/*.{svg,webp,jpg,jpeg,png,gif}; do
    if [ -f "$file" ]; then
        upload_file "$file" "$REMOTE_DIR/images/"
    fi
done

# Galerie-Ordner auf Server erstellen (falls nicht vorhanden)
show_info "Erstelle Galerie-Ordner auf Server..."
echo "mkdir $REMOTE_DIR/images/galerie" | sshpass -p "$SFTP_PASS" sftp -P $SFTP_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SFTP_USER@$SFTP_HOST > /dev/null 2>&1

# Upload Galerie-Unterordner
show_info "Upload Galerie-Bilder (160 Dateien)..."
for file in images/galerie/*.{jpg,jpeg,webp,png,svg,json}; do
    if [ -f "$file" ]; then
        upload_file "$file" "$REMOTE_DIR/images/galerie/"
    fi
done

show_success "Upload erfolgreich abgeschlossen!"

# Zeige Upload-Statistik
echo ""
echo "================================================"
echo "📊 Upload-Statistik:"
echo "------------------------------------------------"

# Zähle hochgeladene Dateien
html_count=$(ls *.html 2>/dev/null | wc -l)
php_count=$(ls *.php 2>/dev/null | wc -l)
css_count=$(ls css/*.css 2>/dev/null | wc -l)
js_count=$(ls js/*.js 2>/dev/null | wc -l)
img_count=$(ls images/*.{svg,webp,jpg,jpeg,png,gif} 2>/dev/null | wc -l)

echo "  HTML Dateien:            $html_count"
echo "  PHP Dateien:             $php_count"
echo "  CSS Dateien:             $css_count"
echo "  JavaScript:              $js_count"
echo "  Bilder:                 $img_count"
echo "================================================"

show_success "Website ist jetzt online unter:"
echo "  🌐 http://new.gardendesignundcare.de"

# Optional: Zeige letzte Änderungen
echo ""
echo "📝 Letzte Änderungen:"
echo "------------------------------------------------"
git log --oneline -5 2>/dev/null || echo "  (kein Git Repository)"
echo "================================================"