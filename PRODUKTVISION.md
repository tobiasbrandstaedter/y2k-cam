# Produktvision: Retro-Kamera-Editor (Arbeitstitel „y2k“)

Stand: 2026-11-09
Status: Entwurf, Version 0.3
Zielplattform: iPhone, Safari ab iOS 17, als PWA
Art des Projekts: privates Hobbyprojekt, nicht kommerziell. Nutzer sind ich selbst sowie Freunde und Familie, denen ich den Link gebe.

---

## 1. Vision

> Jedes Foto und jedes Video soll in wenigen Sekunden so aussehen, als wäre es mit einer Digicam, einem Camcorder oder einem Klapphandy aus den Jahren 1998 bis 2008 aufgenommen worden. Direkt im Browser des Smartphones, ohne Installation, ohne Account, ohne dass die Datei das Gerät verlassen muss.

Die App ist kein weiteres Allround-Bearbeitungsprogramm. Sie ist eine Zeitmaschine für Bilder. Basisfunktionen wie Zuschneiden und Drehen sind vorhanden, weil Nutzer sie erwarten, aber sie sind Mittel zum Zweck. Das Herzstück sind die Retro-Looks, die sich so authentisch wie möglich an echten Geräten der Zeit orientieren und nicht an generischen „Vintage“-Filtern.

### In einem Satz

y2k ist eine mobile Web-App für den privaten Gebrauch, die Fotos und Videos glaubwürdig in den Stil von Y2K-Digicams, Camcordern und Handykameras versetzt. Sie bildet konkrete Gerätegenerationen nach, inklusive Datumsstempel, Blitzcharakter, Kompressionsfehlern und Videoartefakten, und das komplett auf dem eigenen Gerät.

---

## 2. Warum ich das baue

- **Ich mag den Look, aber nicht den Aufwand.** Alte Digicams und Camcorder sind gebraucht teuer, brauchen Speicherkarten, Kabel und Akkus, und das Ergebnis muss trotzdem aufs Handy. Ich will den Look aus der Galerie heraus in Sekunden.
- **Bestehende Apps nerven.** Allround-Editoren verstecken ein paar generische „Vintage“-Presets zwischen hundert anderen Funktionen. Spezialisierte Apps wollen ein Abo, setzen Wasserzeichen oder können nur Fotos.
- **Video kommt überall zu kurz.** Camcorder-Ästhetik mit Tracking-Fehlern, REC-Einblendung und 4:3 ist ein eigener Stil, den kaum eine App ernsthaft bedient.
- **Ich will es verstehen.** Ein Teil der Motivation ist, selbst herauszufinden, was einen Digicam-Blitz oder ein VHS-Bild eigentlich ausmacht, und das nachzubauen.
- **Web statt Store.** Ein Link, den ich Freunden schicke, ohne Store-Prozess, ohne Entwicklerkonto. Zielplattform ist das iPhone ab iOS 17, als PWA auf dem Startbildschirm.

---

## 3. Für wen

**Ich selbst.** Ich bearbeite Fotos und Videos vom Handy für Chats und gelegentlich Social Media. Ich kenne die Vorbild-Geräte noch aus eigener Erfahrung und merke, wenn ein Look „nach Filter“ statt „nach Kamera“ aussieht.

**Freunde und Familie.** Bekommen den Link, haben keine Lust auf Anleitung und erwarten, dass es einfach funktioniert. Sie sind der Maßstab dafür, ob die Bedienung selbsterklärend ist.

### Nicht im Fokus

- Öffentliche Verbreitung, Marketing, App-Store-Präsenz.
- Android, Desktop und andere Browser als Safari auf iOS. Die App ist eine PWA für iPhones ab iOS 17 (siehe QA-6).
- Profifotografen mit RAW-Workflow.
- Vollwertiger Videoschnitt mit mehreren Spuren.

---

## 4. Produktprinzipien

Diese Prinzipien entscheiden bei Zielkonflikten.

1. **Authentizität vor Beliebigkeit.** Jeder Look hat ein reales Vorbild (eine Gerätegattung und Zeitspanne) und ist daran messbar. Kein Filter heißt einfach „Vintage 3“.
2. **Drei Taps zum Ergebnis.** Datei auswählen, Look wählen, exportieren. Alles Weitere ist optional und darf den schnellen Weg nicht verlängern.
3. **Das Original bleibt unangetastet.** Jede Bearbeitung ist bis zum Export verlustfrei rückgängig zu machen. Es wird nie das Original überschrieben.
4. **Was auf dem Gerät bleibt, bleibt auf dem Gerät.** Fotos und Videos werden standardmäßig lokal verarbeitet. Kein Upload ohne ausdrückliche Zustimmung, kein Account-Zwang.
5. **Foto und Video sind gleichwertig.** Jeder Look funktioniert für beides. Ein Look, der nur für Fotos funktioniert, ist nicht fertig.
6. **Kein Wasserzeichen, kein Abo, kein Account.** Es gibt genau eine Variante der App, und die kann alles.
7. **Mobile zuerst.** Alles wird mit einer Hand im Hochformat bedienbar entworfen. Desktop funktioniert, ist aber nicht der Maßstab.

---

## 5. Was anders sein soll als bei bestehenden Apps

Das ist keine Marktpositionierung, sondern die Liste der Dinge, die mich an vorhandenen Apps stören und die y2k deshalb anders macht.

| Merkmal | y2k | Was mich anderswo stört |
|---|---|---|
| Looks nach konkreten Gerätegattungen | Ja, jeder Look hat ein benanntes Vorbild | „Vintage 3“ ohne Bezug zu einem echten Gerät |
| Video mit denselben Looks | Ja, Kernfunktion | Video fehlt oder ist Anhängsel |
| Datumsstempel, REC-Overlay, Timecode | Ja, einstellbar | Fehlt oder ist nicht anpassbar |
| Ohne Installation, per Link | Ja | Store, Account, Updates |
| Lokale Verarbeitung ohne Upload | Ja | Unklar, wo die Bilder landen |
| Wasserzeichen | Nie | In Gratisversionen üblich |
| Abo | Nein | Fast überall |

---

## 6. Funktionsumfang

Priorisierung nach MoSCoW: **Must** (MVP), **Should** (Release 2), **Could** (später), **Won't** (bewusst nicht).

### 6.1 Import und Medienverwaltung

| ID | Anforderung | Prio |
|---|---|---|
| IM-1 | Nutzer kann ein Foto oder Video aus der Galerie des Geräts auswählen. | Must |
| IM-2 | Nutzer kann direkt aus der App heraus mit der Gerätekamera ein Foto oder Video aufnehmen. | Must |
| IM-3 | Gängige Fotoformate (JPEG, PNG, HEIC) und Videoformate (MP4, MOV) werden akzeptiert. Nicht unterstützte Formate erhalten eine verständliche Fehlermeldung mit Hinweis, was stattdessen geht. | Must |
| IM-4 | Mehrere Dateien auf einmal auswählen und denselben Look auf alle anwenden (Stapelverarbeitung). | Should |
| IM-5 | Zuletzt bearbeitete Projekte bleiben auf dem Gerät gespeichert und lassen sich wieder öffnen. | Should |
| IM-6 | Live-Vorschau des Looks im Kamerasucher, bevor ausgelöst wird („Retro-Kamera-Modus“). | Could |

### 6.2 Basisbearbeitung

Diese Funktionen sind Standard und sollen sich so verhalten, wie Nutzer es aus anderen Apps kennen. Keine Experimente in der Bedienung.

| ID | Anforderung | Prio |
|---|---|---|
| BB-1 | Zuschneiden, frei und mit festen Seitenverhältnissen (1:1, 4:3, 3:4, 16:9, 9:16, 4:5). | Must |
| BB-2 | Drehen in 90-Grad-Schritten sowie Spiegeln horizontal und vertikal. | Must |
| BB-3 | Begradigen in feinen Schritten (schiefer Horizont). | Should |
| BB-4 | Helligkeit, Kontrast, Sättigung, Wärme als einfache Regler. | Must |
| BB-5 | Video: Anfang und Ende trimmen. | Must |
| BB-6 | Video: Ton stummschalten oder Lautstärke anpassen. | Must |
| BB-7 | Video: Geschwindigkeit ändern (Zeitlupe, Zeitraffer). | Should |
| BB-8 | Video: Clip in mehrere Abschnitte teilen und Abschnitte entfernen. | Could |
| BB-9 | Vorher/Nachher-Vergleich durch Gedrückthalten auf dem Bild. | Must |
| BB-10 | Rückgängig und Wiederholen über die gesamte Bearbeitungssitzung. | Must |
| BB-11 | Alle Bearbeitungen auf einmal zurücksetzen. | Must |

### 6.3 Retro-Looks (Kernfunktion)

Ein **Look** ist ein benanntes Bündel aus mehreren Bausteinen (siehe 6.4), das eine Gerätegattung und Epoche nachbildet. Jeder Look wird mit einem Referenztext beschrieben, der festhält, welches Gerät und welcher Zeitraum nachgeahmt werden und welche sichtbaren Merkmale dafür typisch sind. Dieser Text ist der Maßstab, an dem Design und Implementierung gemessen werden.

#### Look-Familien im MVP

| ID | Look-Familie | Vorbild | Prägende Merkmale |
|---|---|---|---|
| LK-1 | **Digicam 2000er** | Kompakte Digitalkameras mit kleinem CCD-Sensor, ca. 2001 bis 2008 | Harter, frontaler Blitz mit ausgefressenen Gesichtern und dunklem Hintergrund; kühle, leicht cyan-stichige Schatten; kräftige, etwas übersättigte Farben; sichtbare Kompressionsblöcke; leichtes Farbrauschen in dunklen Bereichen; orange oder gelber Datumsstempel unten rechts im Format `'04 7 15` oder `2004.07.15`; moderate Auflösung (2 bis 5 Megapixel wirkend); leichte Weichheit; chromatische Farbsäume an Kanten |
| LK-2 | **Camcorder** | Analoge und frühe digitale Camcorder (VHS-C, Hi8, MiniDV), ca. 1995 bis 2005 | Seitenverhältnis 4:3; Zeilenstruktur (Interlacing-Kämme bei Bewegung); Farbausbluten, besonders bei Rot; weiche, leicht verwaschene Details; horizontales Tracking-Zittern am unteren Rand; Bildrauschen in Form von feinem Schnee; Einblendungen wie `REC`, roter Aufnahmepunkt, Datum und Uhrzeit, Batteriesymbol, Zoom-Balken; typische weiße Pixelschrift; bei Fotos ein eingefrorenes Videobild mit denselben Artefakten |
| LK-3 | **Handykamera** | Kamerahandys und Klapphandys, ca. 2003 bis 2008 | Sehr niedrige Auflösung (0,3 bis 2 Megapixel wirkend, sichtbar hochskaliert); starke Kompression mit Blockbildung; flaue, leicht grünliche oder magentastichige Farben; starkes Rauschen bei wenig Licht; weiche Kanten; Vignettierung durch die winzige Linse; ggf. kleiner Zeitstempel und Rahmen des Handy-Displays als optionale Einfassung |
| LK-4 | **Einwegkamera** | Analoge Einwegkameras mit Blitz, ca. 1995 bis 2005 | Filmkorn; warme, leicht grünstichige Farbwiedergabe; kräftiger Blitz mit weichem Abfall zum Rand; deutliche Vignette; gelegentliche Lichtlecks am Rand; orange leuchtender Datumsstempel in Sieben-Segment-Optik; leichte Unschärfe im Randbereich; Staub und feine Kratzer optional |

#### Look-Familien für spätere Releases

| ID | Look-Familie | Vorbild | Prio |
|---|---|---|---|
| LK-5 | **Webcam** | Frühe USB-Webcams, ca. 2000 bis 2006: Banding, niedrige Bildrate, grobes Rauschen, kühle Farben, ruckelige Bewegung bei Video | Should |
| LK-6 | **Sofortbild** | Sofortbildkameras: weißer Rahmen mit breitem unterem Rand, pastellige Farben, leicht verwaschene Tiefen, Platz für handschriftliche Notiz | Should |
| LK-7 | **Pixelkamera** | Spielzeugkameras und Handheld-Konsolen mit Kamera, Ende der 90er: wenige Graustufen oder Farben, Dithering, extrem niedrige Auflösung | Could |
| LK-8 | **Nachtsicht** | Camcorder mit Infrarot-Nachtmodus: grünes Monochrom, starkes Rauschen, leuchtende Augen, REC-Einblendung | Could |
| LK-9 | **Überwachungskamera** | CCTV-Ästhetik: Schwarzweiß oder entsättigt, Zeitstempel mit Kameranummer, Fischaugen-Verzerrung | Could |

Jede Look-Familie enthält mindestens **drei Varianten** (z. B. bei Digicam: „Blitz an“, „Tageslicht“, „Innenraum ohne Blitz“), damit Nutzer schnell ein passendes Ergebnis finden, ohne an Reglern zu drehen.

#### Anforderungen an Looks

| ID | Anforderung | Prio |
|---|---|---|
| LA-1 | Looks werden als Galerie mit Vorschaubildern angezeigt, die das aktuell geladene Foto bzw. ein Standbild des Videos zeigen. | Must |
| LA-2 | Antippen eines Looks wendet ihn sofort auf die Vorschau an. | Must |
| LA-3 | Ein globaler Intensitätsregler blendet zwischen Original und vollem Look. | Must |
| LA-4 | Jeder Look funktioniert identisch auf Fotos und Videos. Bewegungsabhängige Effekte (Tracking-Zittern, Interlacing, Bildrauschen) sind bei Video animiert und wirken nicht wie ein statisches Overlay. | Must |
| LA-5 | Nutzer kann den Look als Favorit markieren; Favoriten erscheinen zuerst. | Should |
| LA-6 | Zufalls-Button („Überrasch mich“), der einen Look mit zufälliger Variante anwendet. | Could |
| LA-7 | Angepasste Looks lassen sich unter eigenem Namen als Preset speichern und wiederverwenden. | Should |
| LA-8 | Presets lassen sich als Code oder Link teilen, damit Freunde denselben Look verwenden können. | Could |

### 6.4 Bausteine eines Looks (Feinjustierung)

Wer tiefer einsteigen will, kann die Bausteine eines Looks einzeln ein- und ausschalten und justieren. Jeder Baustein hat höchstens zwei Regler. Die Feinjustierung ist hinter einem „Anpassen“-Schritt verborgen und stört den schnellen Weg nicht.

| ID | Baustein | Einstellbar | Prio |
|---|---|---|---|
| BS-1 | **Datumsstempel** | An/aus; Datum und Uhrzeit frei wählbar (Standard: Aufnahmedatum der Datei, sonst heute); Format (`'04 7 15`, `2004.07.15`, `15.07.2004`, `JUL 15 2004`); Farbe (orange, gelb, weiß, rot); Position (vier Ecken); Schriftstil passend zur Look-Familie | Must |
| BS-2 | **Blitzcharakter** | Stärke; Abfall zum Rand | Must |
| BS-3 | **Farbcharakter** | Stärke des Farbstichs; Sättigung | Must |
| BS-4 | **Auflösung und Weichheit** | Wirkende Auflösung; Schärfe | Must |
| BS-5 | **Kompressionsartefakte** | Stärke der Blockbildung | Must |
| BS-6 | **Rauschen und Korn** | Stärke; Körnung (fein bis grob) | Must |
| BS-7 | **Vignette** | Stärke; Weichheit | Must |
| BS-8 | **Farbsäume** | Stärke | Should |
| BS-9 | **Zeilenstruktur und Interlacing** | Stärke; Zeilenabstand | Must (für Camcorder) |
| BS-10 | **Tracking-Störung** | Stärke; Häufigkeit (bei Video) | Must (für Camcorder) |
| BS-11 | **Camcorder-Einblendungen** | REC-Anzeige an/aus; Uhrzeit an/aus; Batterie an/aus; Zoom-Balken an/aus; Einblendungs-Set passend zur Camcorder-Generation (VHS / Hi8 / MiniDV) | Must (für Camcorder) |
| BS-12 | **Lichtlecks** | Stärke; Position | Should |
| BS-13 | **Staub und Kratzer** | Stärke | Could |
| BS-14 | **Rahmen** | Sofortbild-Rahmen, Handy-Display-Rahmen, Sucher-Rahmen mit Fokusmarkierungen, schwarze Balken für 4:3 | Should |
| BS-15 | **Ton (nur Video)** | Bandrauschen, dumpfes Mikrofon, leichtes Brummen; jeweils Stärke | Should |

### 6.5 Export und Teilen

| ID | Anforderung | Prio |
|---|---|---|
| EX-1 | Foto als JPEG in wählbarer Qualität exportieren und in die Galerie speichern. | Must |
| EX-2 | Video als MP4 exportieren und in die Galerie speichern. Ton bleibt erhalten, sofern nicht stummgeschaltet. | Must |
| EX-3 | Ausgabegröße wählbar: Original, Social-optimiert (z. B. 1080 px lange Kante), Klein (zum schnellen Teilen). | Must |
| EX-4 | Hinweis auf Dauer und Ergebnisgröße vor einem Videoexport, mit Fortschrittsanzeige und Abbruchmöglichkeit während des Exports. | Must |
| EX-5 | Direktes Teilen über den Teilen-Dialog des Betriebssystems (Messenger, Social Media). | Must |
| EX-6 | Kein Wasserzeichen, kein Branding im exportierten Bild oder Video. | Must |
| EX-7 | Der Datumsstempel wird im Export eingebrannt. Die Export-Datei erhält auf Wunsch das gewählte Stempeldatum auch als Aufnahmedatum in den Metadaten („Zeitreise-Modus“). | Should |
| EX-8 | Optionale Seitenverhältnis-Anpassung beim Export für Hochformat-Plattformen, mit Wahl zwischen Beschnitt und schwarzen bzw. unscharfen Balken. | Should |
| EX-9 | Export als GIF oder kurze Schleife für Video-Ausschnitte bis wenige Sekunden. | Could |

### 6.6 Nicht-Ziele (Won't, mindestens für das erste Jahr)

- Mehrspuriger Videoschnitt, Übergänge, Titelanimationen.
- Soziales Netzwerk, Feed, Kommentare, Follower.
- KI-gestützte Inhaltsänderungen (Objekte entfernen, Hintergründe tauschen, Gesichter retuschieren).
- Cloud-Speicher für Nutzermedien.
- Native App-Store-Versionen (die Web-App soll sich aber zum Startbildschirm hinzufügen lassen).
- Druckservice oder Bestellfunktionen.

---

## 7. Nutzererlebnis

### 7.1 Kernablauf („Happy Path“)

1. Nutzer öffnet den Link, sieht sofort einen großen Bereich „Foto oder Video auswählen“ und daneben „Aufnehmen“. Kein Login, kein Onboarding-Karussell, das man wegklicken muss.
2. Nach der Auswahl erscheint das Medium bildschirmfüllend, darunter die Look-Galerie mit Live-Vorschaubildern.
3. Antippen eines Looks ändert die Vorschau sofort. Wischen durch die Varianten.
4. Optional: Intensitätsregler, Zuschnitt, Datum ändern, Feinjustierung.
5. „Speichern“ oder „Teilen“. Fertig.

Zielzeit vom Öffnen bis zum gespeicherten Foto: **unter 30 Sekunden** für jemanden, der die App zum ersten Mal öffnet und keine Anleitung bekommen hat.

### 7.2 Gestaltungsanforderungen

| ID | Anforderung |
|---|---|
| UX-1 | Hochformat ist der Standardfall. Alle Bedienelemente liegen in der unteren Bildschirmhälfte und sind mit dem Daumen erreichbar. |
| UX-2 | Die Vorschau ist immer das größte Element auf dem Bildschirm. Werkzeugleisten überlagern das Bild nicht dauerhaft. |
| UX-3 | Jede Änderung ist sofort in der Vorschau sichtbar. Gibt es eine spürbare Wartezeit (z. B. bei Video), zeigt die App eine ehrliche Fortschrittsanzeige statt eines endlosen Spinners. |
| UX-4 | Die Oberfläche darf die Y2K-Ästhetik zitieren (Pixelschrift bei Einblendungen, Sucher-Elemente), bleibt aber in der Bedienung klar und modern. Die App ist kein Retro-Spielzeug, sondern ein Werkzeug mit Retro-Ergebnis. |
| UX-5 | Jeder Look zeigt beim längeren Antippen eine Kurzbeschreibung: Gerätegattung, Zeitraum, was ihn ausmacht. |
| UX-6 | Fehlermeldungen sagen, was zu tun ist („Dieses Video ist länger als 3 Minuten. Kürze es im Trimmen-Schritt oder wähle ein kürzeres.“). |
| UX-7 | Die App funktioniert ohne Internetverbindung, nachdem sie einmal geladen wurde. |
| UX-8 | Die App lässt sich zum Startbildschirm hinzufügen und startet dann wie eine native App ohne Browserleiste. |
| UX-9 | Bedienelemente haben ausreichende Größe für Touch, Kontraste erfüllen gängige Barrierefreiheitsstandards, Regler sind auch per Tastatur bzw. Screenreader bedienbar. |
| UX-10 | Sprache: Deutsch. Englisch nur, wenn es nebenbei abfällt. |

---

## 8. Qualitätsanforderungen

Messbare Ziele, an denen die Umsetzung gemessen wird. Alle Werte gelten für ein Mittelklasse-Smartphone, das zum Zeitpunkt der Veröffentlichung etwa drei Jahre alt ist.

| ID | Qualitätsmerkmal | Ziel |
|---|---|---|
| QA-1 | Erster Start | App ist in unter 3 Sekunden bedienbar (bei mobiler Verbindung). Folgestarts in unter 1 Sekunde. |
| QA-2 | Look-Vorschau Foto | Antippen eines Looks zeigt das Ergebnis in unter 0,5 Sekunden bei einem 12-Megapixel-Foto. |
| QA-3 | Look-Vorschau Video | Vorschau läuft bei Clips bis 1080p flüssig genug, dass der Look beurteilt werden kann (mindestens 15 Bilder pro Sekunde in der Vorschau; der Export darf länger dauern). |
| QA-4 | Videoexport | Ein 30-Sekunden-Clip in 1080p ist in höchstens der doppelten Clip-Länge exportiert. |
| QA-5 | Unterstützte Medien | Fotos bis 50 Megapixel, Videos bis 3 Minuten Länge und 1080p. Größere Dateien werden mit Hinweis abgelehnt oder mit Zustimmung verkleinert. |
| QA-6 | Plattform | Ausschließlich Safari auf iOS ab Version 17, als zum Startbildschirm hinzugefügte PWA. Andere Browser und Betriebssysteme werden weder getestet noch berücksichtigt. |
| QA-7 | Datenschutz | Medien verlassen das Gerät nicht. Kein Tracking, keine Nutzungsstatistik, keine Drittanbieter-Dienste im Hintergrund. Das gilt auch, wenn Freunde die App nutzen. |
| QA-8 | Stabilität | Ein Absturz oder Neuladen während der Bearbeitung darf nicht zum Verlust des Originals führen. Die laufende Bearbeitung wird nach Möglichkeit wiederhergestellt. |
| QA-9 | Authentizität | Jeder Look im MVP besteht einen informellen Vergleichstest: Ich mische echte Aufnahmen des Vorbild-Geräts mit y2k-Ergebnissen und lasse ein paar Freunde raten. Liegen sie spürbar oft daneben, ist der Look gut genug. Erkennen sie die Fälschungen auf Anhieb, wird nachgebessert. |
| QA-10 | Akku und Wärme | Eine zehnminütige Bearbeitungssitzung darf das Gerät nicht spürbar aufheizen oder mehr als 5 % Akku verbrauchen. |

---

## 9. Release-Planung

### MVP (Release 1): „Digicam und Camcorder“

Ziel: Der Kernnutzen ist vollständig erlebbar. Ein Nutzer kann ein Foto oder Video laden, einen von vier Looks anwenden, Datum anpassen, zuschneiden und ohne Wasserzeichen exportieren.

Enthält alle Anforderungen mit Prio **Must**:
- Import aus Galerie und Kamera (IM-1 bis IM-3)
- Basisbearbeitung Foto und Video (BB-1, BB-2, BB-4, BB-5, BB-6, BB-9 bis BB-11)
- Vier Look-Familien mit je drei Varianten (LK-1 bis LK-4)
- Intensitätsregler und Bausteine BS-1 bis BS-7 sowie BS-9 bis BS-11
- Export Foto und Video, Teilen-Dialog (EX-1 bis EX-6)
- Offline-Fähigkeit und Startbildschirm (UX-7, UX-8)

### Release 2: „Mein Look“

- Eigene Presets speichern (LA-7), Favoriten (LA-5)
- Stapelverarbeitung (IM-4), Projekte wieder öffnen (IM-5)
- Look-Familien Webcam und Sofortbild (LK-5, LK-6)
- Begradigen, Geschwindigkeit (BB-3, BB-7)
- Bausteine Farbsäume, Lichtlecks, Rahmen, Ton (BS-8, BS-12, BS-14, BS-15)
- Zeitreise-Modus für Metadaten und Hochformat-Export (EX-7, EX-8)

### Release 3: „Retro-Kamera“

- Live-Vorschau im Sucher (IM-6)
- Presets teilen (LA-8), Zufalls-Look (LA-6)
- Weitere Look-Familien (LK-7 bis LK-9)
- Clip teilen (BB-8), GIF-Export (EX-9), Staub und Kratzer (BS-13)

---

## 10. Woran ich merke, dass es gelungen ist

Es gibt keine Nutzungsstatistik (siehe QA-7), also auch keine Kennzahlen. Stattdessen:

- **Ich benutze es selbst.** Wenn ich ein Foto in Retro-Optik will, greife ich zu y2k und nicht zu einer anderen App. Das ist das wichtigste Kriterium.
- **Freunde kommen ohne Erklärung klar.** Jemand bekommt den Link, und das erste bearbeitete Bild kommt zurück, ohne dass ich etwas erklären musste.
- **Der Vergleichstest ist bestanden** (QA-9) für alle vier MVP-Looks.
- **Rückmeldungen nennen Geräte, nicht Filter.** „Sieht aus wie mit der alten Kamera meiner Eltern“ ist gut. „Netter Filter“ ist ein Warnsignal.
- **Video wird tatsächlich benutzt.** Wenn Freunde nur Fotos bearbeiten, stimmt am Video-Ablauf etwas nicht.
- **Es läuft noch in einem Jahr.** Die App funktioniert ohne Wartung weiter, weil sie keine Server und keine externen Dienste braucht.

---

## 11. Annahmen und offene Fragen

### Annahmen

- Freunde akzeptieren eine Web-App im Browser, wenn sie sich zum Startbildschirm hinzufügen lässt und offline funktioniert.
- Vier gut gemachte Look-Familien sind für den Start wertvoller als zwanzig oberflächliche.
- Lokale Verarbeitung ist auf aktuellen Smartphones für Fotos und kurze Videos in 1080p realistisch. Diese Annahme ist früh durch einen technischen Durchstich zu prüfen (siehe offene Fragen).
- Die App wird auf einer eigenen Adresse gehostet, die nur im Freundeskreis bekannt ist. Es gibt keinen Betrieb im eigentlichen Sinn: keine Server-Logik, keine Datenbank, nichts, was gewartet werden muss.
- Kosten sollen bei null oder nahe null liegen (statisches Hosting).

### Offene Fragen

1. **Technischer Durchstich Video:** Lässt sich ein 30-Sekunden-Clip in 1080p mit Camcorder-Look auf einem drei Jahre alten Mittelklassegerät im Browser in akzeptabler Zeit exportieren? Falls nein, welche Grenze (Auflösung, Länge) ist für das MVP vertretbar?
2. **Referenzmaterial:** Welche Vorbild-Geräte habe ich noch oder bekomme ich günstig, um eigene Vergleichsaufnahmen zu machen? Eigene Aufnahmen sind als Vorlage besser als Bilder aus dem Netz.
3. **Datumsstempel-Schriften:** Welche frei verwendbaren Schriften kommen den originalen Sieben-Segment- und Pixel-Schriften nahe? Auch bei privater Nutzung lieber freie Lizenzen, damit die App bedenkenlos per Link weitergegeben werden kann.
4. **HEIC und MOV von iPhones:** Sind diese Formate im Browser zuverlässig lesbar oder braucht es eine Konvertierung mit Nutzerhinweis?
5. **Hosting:** Wo liegt die App? Reicht ein statischer Hoster mit eigener Domain oder Unterdomain?

---

## 12. Glossar

| Begriff | Bedeutung |
|---|---|
| **Look** | Benanntes Bündel aus Bausteinen, das eine Gerätegattung und Epoche nachbildet. |
| **Look-Familie** | Gruppe von Looks mit demselben Vorbild (z. B. Digicam 2000er) in mehreren Varianten. |
| **Variante** | Konkreter Look innerhalb einer Familie, z. B. „Digicam, Blitz an“. |
| **Baustein** | Einzelner, abschaltbarer Bestandteil eines Looks, z. B. Datumsstempel oder Vignette. |
| **Preset** | Vom Nutzer gespeicherte Kombination aus Look und angepassten Bausteinen. |
| **Datumsstempel** | Eingebranntes Datum, wie es Kameras der Zeit auf das Bild schrieben. |
| **Interlacing** | Zeilenweise Bildaufzeichnung alter Videogeräte, erzeugt bei Bewegung sichtbare Kämme. |
| **Tracking-Störung** | Horizontales Zittern oder Verschieben von Bildzeilen, typisch für Videobänder. |
| **Farbausbluten** | Farben laufen über Kanten hinaus, typisch für analoge Videosignale. |
| **Farbsäume** | Farbige Ränder an kontrastreichen Kanten, verursacht durch einfache Objektive. |
| **Lichtleck** | Heller, meist roter oder oranger Schleier am Bildrand durch Licht, das ins Kameragehäuse eindringt. |
| **Zeitreise-Modus** | Export-Option, die das gewählte Stempeldatum auch in die Datei-Metadaten schreibt. |
