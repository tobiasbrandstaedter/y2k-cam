# Spezifikation: Retro-Foto-Editor

Stand: 2026-11-10. Vom Nutzer als Master Prompt vorgegeben. Gilt für die Fotobearbeitung und hat bei Widersprüchen Vorrang vor `PRODUKTVISION.md`. Video, Zuschneiden und Drehen sind hier nicht beschrieben und bleiben bei der Produktvision.

Abweichungen von der Produktvision, die diese Spezifikation bewusst mitbringt:

- Läuft auf Desktop und Mobilgeräten. Desktop mit dreispaltigem Layout, Mobil mit unten angedocktem Bedienfeld. iOS Safari bleibt Zielplattform.
- 15 benannte Presets statt vier Look-Familien mit je drei Varianten. Die Presets entsprechen den Looks der Produktvision, vom Nutzer gespeicherte Kombinationen bleiben Presets im Sinne der Vision.
- Upload auch als WebP, Export als JPEG, PNG und WebP.

Umsetzungsentscheidungen stehen in `docs/decisions/ADR-002-photo-pipeline.md`.

---

## 1. Projektziel

Moderne, hochwertige Fotobearbeitung, die digitale Fotos in authentisch wirkende Retro-Fotografien verwandelt. Vorbilder: Filmkameras der 1990er, Digitalkameras der 2000er, alte Sony-, Canon- und Panasonic-Camcorder, VHS und MiniDV, analoger 35-mm-Film, alte Urlaubs- und Strandfotos, Vintage-Digicam-Fotografie.

Visuelle Referenz ist das Nutzerbild in `docs/looks/references/`. Keine simplen Instagram-Filter: Die Effekte müssen wie echte Eigenschaften alter Aufnahmegeräte wirken.

## 2. Grundfunktionen

1. Upload von JPG, JPEG, PNG und WebP.
2. Anzeige des Originalbildes.
3. Echtzeit-Vorschau aller Filter.
4. Mindestens 15 eigenständige Retro-Presets.
5. Individuelle Anpassung aller wichtigen Filterparameter.
6. Kombination mehrerer Effekte.
7. Vorher-Nachher-Vergleich.
8. Zurücksetzen einzelner Effekte.
9. Undo und Redo.
10. Export in hoher Auflösung ohne unnötigen Qualitätsverlust.

Intuitive Oberfläche, Desktop und Mobil.

## 3. Filtersystem

Modulare Pipeline. Jeder Effekt einzeln aktivierbar, deaktivierbar und in der Intensität regelbar.

**A. Color Grading.** Exposure -2 bis +2 EV; Brightness, Contrast, Saturation, Temperature, Tint, Highlights, Shadows, Whites, Blacks, Vibrance je -100 bis +100; Fade 0 bis 100. Zusätzlich Split Toning für Lichter und Schatten, RGB-Kurven, Tonwertverteilung, angehobene Schwarzwerte, weich auslaufende Lichter. Ziel: leicht verblasst, weich, warm, nostalgisch statt klinisch.

**B. Vintage Color Cast.** Warm Yellow, Faded Green, Muted Brown, Warm Pink, Cool Blue, Olive Film, Sepia Light. Je Intensität, Farbtemperatur, Farbton, Mischmodus, getrennte Intensität für Lichter und Schatten. Organisch, Hauttöne möglichst natürlich.

**C. Film Grain.** Amount, Size, Roughness, Contrast je 0 bis 100; Farbe monochrom oder farbig; Verteilung fein, mittel, grob. Zufällig, nicht wie digitales Rauschen, bei mehr Intensität unterschiedliche Korngrößen, optional farbig, über das ganze Bild, mit gleichem Seed reproduzierbar. Mehrskalige Rauschtextur.

**D. VHS und Camcorder**, jede Komponente einzeln regelbar:
1. Scanlines: Dichte, Deckkraft, Linienbreite, leichte Helligkeitsunterschiede zwischen Linien.
2. Analog Noise: dezentes Rauschen, horizontale Störmuster, leichtes Flimmern, Intensität.
3. Chromatic Aberration: Kanalverschiebung, Intensität, radial oder horizontal.
4. VHS Distortion: horizontale Verschiebung, dezente Verzerrung, subtile Signalfehler, optionale Tracking-Linien.
5. Soft Focus: leichte optische Unschärfe, weniger digitale Schärfe, weiche Übergänge an Kontrastkanten.
6. Color Bleeding: auslaufende Farben besonders an Kontrasten, horizontale Farbverschiebung.

**E. Light Leaks und Lens Effects.** Orange, Red, Yellow, Soft Pink Light Leak, White Flash, Lens Haze, Halation, Bloom, Subtle Lens Flare. Organisch integriert, keine aufgesetzten Lichtflächen.

**F. Vignette und Optik.** Vignette, Soft Edge Darkening, Lens Blur, Gaussian Blur, Subtle Motion Blur, Vintage Lens Softness, Edge Distortion. Jeweils getrennt regelbar.

## 4. Overlays alter Geräte

Datum, Uhrzeit, REC-Symbol, Aufnahmeindikator, CAM 01, PLAY, Timer, Batteriestatus, Aufnahmemodus, REC-Timestamp. Monospace, klein, weiß oder hellgrau, leichter Glow oder Schatten, pixelig, optional transparent. Position frei wählbar, Größe und Deckkraft einstellbar. Beispiel: `03/20/23 PM 3:20`, `CAMERA1`, `PLAY`, `00:07:28`, `REC ●`. Datum und Uhrzeit automatisch oder vom Nutzer eingegeben.

## 5. Presets

Mindestens 15, jedes mit eigener Kombination aus Farbkorrektur, Korn, Unschärfe, Kontrast, Farbverschiebung und weiteren Effekten. Pflicht:

1. 2000s Digital Camera: warm, leicht verblasst, weicher Kontrast, dezentes Korn, leicht überbelichtet.
2. Vintage Camcorder: Scanlines, leichte Farbverschiebung, analoge Störungen, weiche Schärfe, optional Datum und REC.
3. Beach Memories: warme gelbliche Lichter, entsättigte Blautöne, leicht grünliche Schatten, Soft Focus, leichte Filmtextur.
4. Faded Film: angehobene Schwarztöne, reduzierter Kontrast, entsättigt, feines Korn.
5. Old Sony Camera: frühe Digitalfotografie, etwas härtere Lichter, leicht kühl, dezentes digitales Rauschen.
6. MiniDV: Camcorder-Textur, leichte horizontale Störungen, reduzierte Schärfe, digitaler Timestamp.
7. 90s Summer: warm, leicht ausgewaschene Lichter, weiche Kontraste, analoges Korn.
8. Expired Film: unregelmäßige Farbverschiebungen, ausgewaschen, leichte Lichtlecks, organisches Korn.
9. Disposable Camera: stärkerer Blitz, helle Lichter, dunklere Ecken, körnig.
10. VHS Tape: Scanlines, horizontale Störungen, Chromatic Aberration, analoges Rauschen.
11. Warm Nostalgia: gelblich-orange, matte Schwarztöne, weich.
12. Cool Vintage: bläuliche Schatten, entsättigt, dezente Körnung.
13. Pink Film: leichter Rosastich, helle Lichter, weiche Kontraste.
14. Old Family Video: Camcorder-Ästhetik, Timestamp, dezentes Rauschen, leichte Unschärfe.
15. Analog Summer 2003: warme Sommerfarben, leicht überbelichtet, weiches Korn, leicht verblasste Kontraste.

Presets unterscheiden sich in echten Parametern, nicht nur im Namen.

## 6. Oberfläche

Desktop: links Upload, Presets, Effektkategorien; Mitte großes Bild mit Live-Vorschau, Vorher-Nachher-Slider, Zoom, Vollbild; rechts Effektparameter, Farbkorrektur, Grain, VHS, Timestamp, Export.

Minimalistisch, dunkel, dezente graue Flächen, abgerundete Bedienelemente, hochwertige Typografie, klare Icons, keine überladenen Menüs. Die Vorschau nimmt den größten Teil ein.

Regler: sofortige Vorschau, numerischer Wert, Reset per Doppelklick, flüssig. Außerdem Undo, Redo, Reset All, Preset speichern, duplizieren, löschen, Favoriten.

## 7. Technik

Modular und wartbar, passend zur Projektstruktur. TypeScript, WebGL mit GLSL-Shadern, Canvas für Vorschau, Web Workers wo sinnvoll. Bild nicht bei jeder Änderung neu laden. Nicht destruktiv: Original unverändert, Effekte als Parameter, feste Reihenfolge, unabhängig änderbar, finales Bild erst beim Export voll gerendert.

## 8. Export

JPEG, PNG, WebP. Originalauflösung oder benutzerdefiniert, JPEG-Qualität, Dateigröße optimieren, Metadaten optional erhalten, Vorher-Nachher-Vergleich exportieren. Ausgabe entspricht der Vorschau möglichst exakt, kein mehrfaches Komprimieren.

## 9. Qualität

Natürliche Hauttöne, keine unnatürlichen Farbflächen, keine übertriebenen Scanlines, kein künstliches Korn, keine übermäßige Unschärfe, keine zerstörten Details, keine abgeschnittenen Overlays, keine Rendering-Artefakte. Alles in der Intensität regelbar.

## 10. Phasen

1. Struktur und Architektur. 2. Upload und Vorschau. 3. Pipeline und Color Grading. 4. Grain, VHS, Camcorder, Light Leaks. 5. 15 Presets. 6. Oberfläche und Bedienelemente. 7. Export, Undo/Redo, Performance. 8. Tests mit unterschiedlichen Fototypen.

Keine Design-Demo, keine funktionslosen Buttons. Jeder sichtbare Regler wirkt auf das Bild. Visuelle Qualität der Filter vor Zusatzfunktionen.
