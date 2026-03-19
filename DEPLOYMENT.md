# 🚀 Deployment Guide - Giovanni Website

## 🌐 URLs

| Umgebung | URL | Server-Verzeichnis |
|---|---|---|
| Produktion (WordPress) | https://gardendesignundcare.de | `/` (Root) |
| Vorschau (neue Website) | http://new.gardendesignundcare.de | `/new-website/` |

> Neue Website immer nach `/new-website/` deployen — niemals ins Root-Verzeichnis!

## ✅ Was wurde eingerichtet

1. **Ordner auf Server**: `/new-website/` wurde erfolgreich angelegt
2. **Upload-Script**: `deploy.sh` für automatisches Deployment
3. **Alle Dateien hochgeladen**: HTML, PHP, CSS, JS, Bilder

## 📊 Upload-Statistik

- **3** HTML-Dateien
- **2** PHP-Dateien (Kontaktformular + Turnstile)
- **1** CSS-Datei
- **1** JavaScript-Datei
- **25** Bilder (optimierte WebP-Formate)
- **Zusätzlich**: robots.txt, sitemap.xml, .env

## 🔧 Deploy-Script verwenden

### Einmaliger Upload:
```bash
./deploy.sh
```

### Nach Änderungen:
```bash
# 1. Änderungen vornehmen
# 2. Testen lokal
# 3. Hochladen
./deploy.sh
```

## 📁 Server-Struktur

```
/new-website/
├── index.html
├── impressum.html
├── datenschutz.html
├── contact.php
├── turnstile-verify.php
├── robots.txt
├── sitemap.xml
├── .env
├── css/
│   └── style.css
├── js/
│   └── script.js
└── images/
    ├── *.webp (alle Bilder)
    └── *.svg (Icons)
```

## 🔑 Zugangsdaten

- **Server**: ssh.strato.de
- **User**: 54235949.swh.strato-hosting.eu
- **Port**: 22
- **Remote-Pfad**: /new-website/

## ⚡ Schnell-Befehle

### Nur einzelne Datei hochladen:
```bash
expect -c '
spawn sftp -P 22 54235949.swh.strato-hosting.eu@ssh.strato.de
expect "password:"
send "UnserGarten18\r"
expect "sftp>"
send "cd /new-website\r"
expect "sftp>"
send "put index.html\r"
expect "sftp>"
send "exit\r"
expect eof
'
```

### Server-Inhalt prüfen:
```bash
expect -c '
spawn sftp -P 22 54235949.swh.strato-hosting.eu@ssh.strato.de
expect "password:"
send "UnserGarten18\r"
expect "sftp>"
send "cd /new-website\r"
expect "sftp>"
send "ls -la\r"
expect "sftp>"
send "exit\r"
expect eof
'
```

## 🛠️ Script anpassen

Falls Sie das Script für andere Projekte nutzen möchten:

1. Öffnen Sie `deploy.sh`
2. Ändern Sie die Variablen am Anfang:
   - `REMOTE_DIR` = Zielordner auf Server
   - `FILES_TO_UPLOAD` = Liste der Dateien
   - `FOLDERS_TO_UPLOAD` = Liste der Ordner

## ⚠️ Wichtige Hinweise

### Turnstile aktivieren:
1. `.env` Datei auf Server bearbeiten
2. Echte Turnstile Keys eintragen
3. Site Key auch in `index.html` aktualisieren

### Domain-Weiterleitung:
Die Website ist aktuell unter `/new-website/` erreichbar.
Für die finale Domain-Konfiguration:
1. DNS auf Server zeigen lassen
2. Dateien in Root-Verzeichnis verschieben ODER
3. Domain auf `/new-website/` Unterordner konfigurieren

### PHP-Konfiguration:
- PHP muss auf dem Server aktiviert sein
- `mail()` Funktion muss verfügbar sein
- `.env` Datei mit korrekten E-Mail-Settings

## 📈 Performance

Das Script lädt alle Dateien effizient hoch:
- Batch-Upload für schnellere Übertragung
- Automatische Ordner-Erstellung
- Fehlerbehandlung integriert

## 🔄 Updates

Bei Änderungen an der Website:
1. Lokale Änderungen vornehmen
2. Testen im Browser
3. `./deploy.sh` ausführen
4. Änderungen sind sofort online

## 🎉 Status

**Die Website wurde erfolgreich hochgeladen!**

Zugriff über: `https://ihre-domain.de/new-website/`

---

*Deployment-Script erstellt mit Claude Code*