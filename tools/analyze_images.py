#!/usr/bin/env python3
"""
Bildanalyse-Script für monikas-bilder
Analysiert alle Bilder mit Qwen2.5-VL via Ollama,
erkennt Duplikate und kategorisiert die Bilder.
"""

import os
import json
import base64
import requests
import imagehash
from PIL import Image
from pathlib import Path
from datetime import datetime

# Konfiguration
IMAGE_DIR = Path.home() / "Downloads" / "monikas-bilder"
OUTPUT_DIR = Path.home() / "Documents" / "garden-design-care" / "tools"
OUTPUT_JSON = OUTPUT_DIR / "image_analysis.json"
OUTPUT_HTML = OUTPUT_DIR / "image_review.html"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5vl:7b"
DUPLICATE_THRESHOLD = 10  # Hamming-Distanz für Ähnlichkeit (0=identisch, <10=sehr ähnlich)

# Kategorien für einen Gartenpflegebetrieb
CATEGORIES = [
    "Garten & Rasen",
    "Pflanzen & Blumen",
    "Terrasse & Außenbereich",
    "Gartengestaltung & Design",
    "Vorher / Nachher",
    "Bäume & Hecken",
    "Werkzeug & Arbeit",
    "Sonstiges"
]

PROMPT = f"""Analysiere dieses Bild von einem Garten- und Landschaftspflegebetrieb.

Antworte NUR mit einem JSON-Objekt in genau diesem Format (kein Markdown, kein Text davor/danach):
{{
  "beschreibung": "Kurze, präzise Beschreibung was zu sehen ist (1-2 Sätze auf Deutsch)",
  "kategorie": "Eine der Kategorien: {' | '.join(CATEGORIES)}",
  "qualitaet": "gut | mittel | schlecht",
  "webseitengeeignet": true oder false,
  "besonderheiten": "Besondere Merkmale oder leer string"
}}

Bewerte 'webseitengeeignet' als true wenn: gute Bildqualität, ansprechendes Motiv, professionell wirkend.
Bewerte als false wenn: unscharf, schlecht belichtet, kein klares Motiv, zu privat."""


def encode_image(image_path: Path) -> str:
    """Bild verkleinern und als Base64 kodieren (max 800px für schnellere Analyse)."""
    import io
    img = Image.open(str(image_path))
    img.thumbnail((800, 800), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def analyze_image(image_path: Path) -> dict:
    """Bild mit Qwen2.5-VL analysieren."""
    image_b64 = encode_image(image_path)

    payload = {
        "model": MODEL,
        "prompt": PROMPT,
        "images": [image_b64],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 300
        }
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=300)
        response.raise_for_status()
        result_text = response.json().get("response", "").strip()

        # JSON aus Antwort extrahieren
        if "{" in result_text and "}" in result_text:
            start = result_text.index("{")
            end = result_text.rindex("}") + 1
            json_str = result_text[start:end]
            return json.loads(json_str)
        else:
            return {
                "beschreibung": "Analyse fehlgeschlagen",
                "kategorie": "Sonstiges",
                "qualitaet": "unbekannt",
                "webseitengeeignet": False,
                "besonderheiten": result_text[:100]
            }
    except json.JSONDecodeError as e:
        return {
            "beschreibung": f"JSON-Fehler: {str(e)}",
            "kategorie": "Sonstiges",
            "qualitaet": "unbekannt",
            "webseitengeeignet": False,
            "besonderheiten": ""
        }
    except Exception as e:
        return {
            "beschreibung": f"Fehler: {str(e)}",
            "kategorie": "Sonstiges",
            "qualitaet": "unbekannt",
            "webseitengeeignet": False,
            "besonderheiten": ""
        }


def compute_hash(image_path: Path) -> str:
    """Perceptual Hash für Duplikaterkennung berechnen."""
    try:
        img = Image.open(image_path)
        return str(imagehash.phash(img))
    except Exception:
        return ""


def find_duplicates(images: list) -> dict:
    """Ähnliche/doppelte Bilder finden."""
    duplicates = {}  # filename -> list of similar filenames
    hashes = {img["dateiname"]: img.get("hash", "") for img in images if img.get("hash")}

    names = list(hashes.keys())
    for i, name1 in enumerate(names):
        h1_str = hashes[name1]
        if not h1_str:
            continue
        try:
            h1 = imagehash.hex_to_hash(h1_str)
        except Exception:
            continue

        similar = []
        for j, name2 in enumerate(names):
            if i >= j:
                continue
            h2_str = hashes[name2]
            if not h2_str:
                continue
            try:
                h2 = imagehash.hex_to_hash(h2_str)
                dist = h1 - h2
                if dist <= DUPLICATE_THRESHOLD:
                    similar.append({"datei": name2, "distanz": dist})
            except Exception:
                continue

        if similar:
            duplicates[name1] = similar

    return duplicates


def main():
    # Bilder laden
    images_paths = sorted(IMAGE_DIR.glob("*.jpeg")) + sorted(IMAGE_DIR.glob("*.jpg")) + sorted(IMAGE_DIR.glob("*.png"))
    total = len(images_paths)
    print(f"Gefundene Bilder: {total}")

    # Bestehende Analyse laden (für Fortsetzung nach Unterbrechung)
    existing_data = {}
    if OUTPUT_JSON.exists():
        with open(OUTPUT_JSON) as f:
            existing = json.load(f)
            existing_data = {img["dateiname"]: img for img in existing.get("bilder", [])}
        print(f"Bereits analysiert: {len(existing_data)} Bilder — wird fortgesetzt")

    results = []

    for i, img_path in enumerate(images_paths):
        filename = img_path.name

        # Bereits analysiert? Überspringen
        if filename in existing_data:
            results.append(existing_data[filename])
            print(f"[{i+1}/{total}] ✓ (cached) {filename}")
            continue

        print(f"[{i+1}/{total}] Analysiere: {filename} ...", end=" ", flush=True)

        # Hash berechnen
        try:
            img_hash = compute_hash(img_path)
        except Exception:
            img_hash = ""

        # KI-Analyse
        try:
            analysis = analyze_image(img_path)
        except PermissionError:
            print(f"ÜBERSPRUNGEN (Berechtigung verweigert)")
            continue
        except Exception as e:
            analysis = {"beschreibung": f"Fehler: {e}", "kategorie": "Sonstiges",
                        "qualitaet": "unbekannt", "webseitengeeignet": False, "besonderheiten": ""}

        result = {
            "dateiname": filename,
            "pfad": str(img_path),
            "hash": img_hash,
            "analyse": analysis,
            "ausgewaehlt": analysis.get("webseitengeeignet", False),
            "doppelt_von": None
        }

        results.append(result)
        print(f"→ {analysis.get('kategorie', '?')} | {analysis.get('qualitaet', '?')}")

        # Zwischenspeichern nach jedem Bild
        save_json(results, {})

    # Duplikate finden
    print("\nSuche nach Duplikaten...")
    duplicates = find_duplicates(results)

    # Duplikate markieren
    for result in results:
        fname = result["dateiname"]
        if fname in duplicates:
            similar_list = duplicates[fname]
            result["aehnliche_bilder"] = similar_list
            # Wenn sehr ähnlich (Distanz < 5), als Duplikat markieren
            exact_dups = [s for s in similar_list if s["distanz"] < 5]
            if exact_dups:
                result["doppelt_von"] = exact_dups[0]["datei"]
                result["ausgewaehlt"] = False  # Duplikate nicht auswählen

    # Endgültig speichern
    save_json(results, duplicates)

    # Statistiken
    total_selected = sum(1 for r in results if r["ausgewaehlt"])
    total_duplicates = sum(1 for r in results if r.get("doppelt_von"))

    print(f"\n{'='*50}")
    print(f"Analyse abgeschlossen!")
    print(f"  Gesamt:     {total} Bilder")
    print(f"  Geeignet:   {total_selected} Bilder")
    print(f"  Duplikate:  {total_duplicates} Bilder")
    print(f"  Nicht geeignet: {total - total_selected - total_duplicates}")
    print(f"\nKategorien:")

    cat_counts = {}
    for r in results:
        if r["ausgewaehlt"]:
            cat = r["analyse"].get("kategorie", "Sonstiges")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    # HTML Review generieren
    generate_html(results)
    print(f"\nHTML-Review: {OUTPUT_HTML}")
    print(f"JSON-Daten:  {OUTPUT_JSON}")


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'item'):  # numpy scalar
            return obj.item()
        return super().default(obj)

def save_json(results: list, duplicates: dict):
    """Analyse atomar als JSON speichern (temp-Datei → rename verhindert Korruption)."""
    data = {
        "erstellt": datetime.now().isoformat(),
        "gesamt": len(results),
        "ausgewaehlt": sum(1 for r in results if r["ausgewaehlt"]),
        "bilder": results
    }
    tmp = OUTPUT_JSON.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
    tmp.replace(OUTPUT_JSON)  # atomar: verhindert beschädigte Datei bei Abbruch


def generate_html(results: list):
    """Interaktives HTML-Review-Tool generieren."""

    categories = sorted(set(r["analyse"].get("kategorie", "Sonstiges") for r in results))

    # Bilder-Karten HTML
    cards_html = ""
    for r in results:
        a = r["analyse"]
        selected = "selected" if r["ausgewaehlt"] else ""
        duplicate = "duplicate" if r.get("doppelt_von") else ""
        cat = a.get("kategorie", "Sonstiges").replace(" ", "-").replace("/", "-").replace("&", "")
        qualitaet_class = a.get("qualitaet", "unbekannt")

        dup_info = ""
        if r.get("doppelt_von"):
            dup_info = f'<div class="dup-badge">Duplikat von: {r["doppelt_von"][:30]}...</div>'

        similar_info = ""
        if r.get("aehnliche_bilder"):
            similar_info = f'<div class="similar-info">Ähnlich zu {len(r["aehnliche_bilder"])} anderen Bildern</div>'

        cards_html += f"""
        <div class="card {selected} {duplicate} cat-{cat} q-{qualitaet_class}"
             data-filename="{r['dateiname']}"
             data-category="{a.get('kategorie', '')}"
             onclick="toggleSelect(this)">
            <img src="file://{r['pfad']}" alt="{r['dateiname']}" loading="lazy">
            <div class="card-info">
                <div class="card-name">{r['dateiname'][:35]}</div>
                <div class="card-desc">{a.get('beschreibung', '')}</div>
                <div class="card-meta">
                    <span class="badge cat">{a.get('kategorie', 'Sonstiges')}</span>
                    <span class="badge q-{qualitaet_class}">{a.get('qualitaet', '?')}</span>
                </div>
                {dup_info}
                {similar_info}
                {f'<div class="special">{a.get("besonderheiten", "")}</div>' if a.get("besonderheiten") else ""}
            </div>
            <div class="select-overlay">✓</div>
        </div>"""

    cat_filter_html = '<button class="filter-btn active" onclick="filterCat(\'all\', this)">Alle</button>\n'
    cat_filter_html += '<button class="filter-btn" onclick="filterCat(\'selected\', this)">Ausgewählt</button>\n'
    cat_filter_html += '<button class="filter-btn" onclick="filterCat(\'duplicate\', this)">Duplikate</button>\n'
    for cat in categories:
        cat_class = cat.replace(" ", "-").replace("/", "-").replace("&", "")
        cat_filter_html += f'<button class="filter-btn" onclick="filterCat(\'cat-{cat_class}\', this)">{cat}</button>\n'

    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bildanalyse — Monikas Bilder</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1a1a1a; color: #eee; }}

  header {{ background: #2a2a2a; padding: 20px 30px; border-bottom: 1px solid #444; position: sticky; top: 0; z-index: 100; }}
  h1 {{ font-size: 1.4rem; margin-bottom: 12px; color: #fff; }}

  .stats {{ display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap; }}
  .stat {{ background: #333; padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; }}
  .stat span {{ color: #7ec8a0; font-weight: bold; font-size: 1.1rem; }}

  .filters {{ display: flex; gap: 8px; flex-wrap: wrap; }}
  .filter-btn {{ background: #333; border: 1px solid #555; color: #ccc; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }}
  .filter-btn:hover {{ background: #444; }}
  .filter-btn.active {{ background: #7ec8a0; color: #000; border-color: #7ec8a0; }}

  .toolbar {{ padding: 15px 30px; background: #222; border-bottom: 1px solid #333; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }}
  .btn {{ padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; }}
  .btn-green {{ background: #7ec8a0; color: #000; }}
  .btn-red {{ background: #e07070; color: #000; }}
  .btn-blue {{ background: #70a8e0; color: #000; }}
  .btn:hover {{ opacity: 0.85; transform: translateY(-1px); }}
  #export-info {{ color: #aaa; font-size: 0.85rem; }}

  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; padding: 20px 30px; }}

  .card {{ background: #2a2a2a; border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; position: relative; border: 2px solid transparent; }}
  .card:hover {{ transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }}
  .card.selected {{ border-color: #7ec8a0; }}
  .card.duplicate {{ opacity: 0.5; border-color: #e07070; }}
  .card.hidden {{ display: none; }}

  .card img {{ width: 100%; height: 180px; object-fit: cover; display: block; }}
  .card-info {{ padding: 10px 12px; }}
  .card-name {{ font-size: 0.75rem; color: #888; margin-bottom: 4px; word-break: break-all; }}
  .card-desc {{ font-size: 0.85rem; color: #ddd; margin-bottom: 8px; line-height: 1.4; }}
  .card-meta {{ display: flex; gap: 6px; flex-wrap: wrap; }}

  .badge {{ padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }}
  .badge.cat {{ background: #2d4a6b; color: #7ab8e8; }}
  .badge.q-gut {{ background: #1e4a2e; color: #7ec8a0; }}
  .badge.q-mittel {{ background: #4a3a1e; color: #e0b870; }}
  .badge.q-schlecht {{ background: #4a1e1e; color: #e07070; }}
  .badge.q-unbekannt {{ background: #333; color: #888; }}

  .dup-badge {{ margin-top: 6px; font-size: 0.75rem; color: #e07070; background: #3a1e1e; padding: 3px 8px; border-radius: 6px; }}
  .similar-info {{ margin-top: 4px; font-size: 0.75rem; color: #e0b870; }}
  .special {{ margin-top: 4px; font-size: 0.75rem; color: #aaa; font-style: italic; }}

  .select-overlay {{ position: absolute; top: 8px; right: 8px; background: #7ec8a0; color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; opacity: 0; transition: opacity 0.2s; }}
  .card.selected .select-overlay {{ opacity: 1; }}
</style>
</head>
<body>

<header>
  <h1>Bildanalyse — Monikas Bilder ({len(results)} Bilder)</h1>
  <div class="stats">
    <div class="stat">Gesamt: <span>{len(results)}</span></div>
    <div class="stat">Ausgewählt: <span id="count-selected">{sum(1 for r in results if r["ausgewaehlt"])}</span></div>
    <div class="stat">Duplikate: <span style="color:#e07070">{sum(1 for r in results if r.get("doppelt_von"))}</span></div>
    <div class="stat">Sichtbar: <span id="count-visible">{len(results)}</span></div>
  </div>
  <div class="filters">
    {cat_filter_html}
  </div>
</header>

<div class="toolbar">
  <button class="btn btn-green" onclick="selectAll()">Alle auswählen</button>
  <button class="btn btn-red" onclick="deselectAll()">Alle abwählen</button>
  <button class="btn btn-blue" onclick="exportSelected()">Export JSON</button>
  <span id="export-info">Klick auf ein Bild = auswählen/abwählen</span>
</div>

<div class="grid" id="grid">
{cards_html}
</div>

<script>
let selections = {{}};
// Initialisierung aus vorhandenen Selektionen
document.querySelectorAll('.card.selected').forEach(c => {{
  selections[c.dataset.filename] = true;
}});

function toggleSelect(card) {{
  const fn = card.dataset.filename;
  if (selections[fn]) {{
    delete selections[fn];
    card.classList.remove('selected');
  }} else {{
    selections[fn] = true;
    card.classList.add('selected');
  }}
  updateCount();
}}

function updateCount() {{
  document.getElementById('count-selected').textContent = Object.keys(selections).length;
  const visible = document.querySelectorAll('.card:not(.hidden)').length;
  document.getElementById('count-visible').textContent = visible;
}}

function selectAll() {{
  document.querySelectorAll('.card:not(.hidden)').forEach(c => {{
    selections[c.dataset.filename] = true;
    c.classList.add('selected');
  }});
  updateCount();
}}

function deselectAll() {{
  document.querySelectorAll('.card:not(.hidden)').forEach(c => {{
    delete selections[c.dataset.filename];
    c.classList.remove('selected');
  }});
  updateCount();
}}

function filterCat(cat, btn) {{
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.card').forEach(c => {{
    if (cat === 'all') {{
      c.classList.remove('hidden');
    }} else if (cat === 'selected') {{
      c.classList.toggle('hidden', !c.classList.contains('selected'));
    }} else if (cat === 'duplicate') {{
      c.classList.toggle('hidden', !c.classList.contains('duplicate'));
    }} else {{
      c.classList.toggle('hidden', !c.classList.contains(cat));
    }}
  }});
  updateCount();
}}

function exportSelected() {{
  const selected = Object.keys(selections);
  const data = JSON.stringify({{ ausgewaehlt: selected, anzahl: selected.length }}, null, 2);
  const blob = new Blob([data], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ausgewaehlte_bilder.json';
  a.click();
  document.getElementById('export-info').textContent = `${{selected.length}} Bilder exportiert!`;
}}
</script>
</body>
</html>"""

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)


if __name__ == "__main__":
    main()
