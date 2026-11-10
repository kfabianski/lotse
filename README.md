# Lotse – das Intranet für Mitarbeiter

Lotse ist ein schlankes Intranet für alle Mitarbeiter – im Büro, im Lager und unterwegs: Neuigkeiten und Wissen,
Veranstaltungen mit Zusagen, Dokumente mit Versionshistorie, Schulungen mit Lesebestätigung,
Mitarbeiterverzeichnis mit interaktivem Lageplan, Kleinanzeigen, Ideenbox und Schnellzugriff auf die
Firmenprogramme – zweisprachig (Deutsch/Englisch), mit hellem und dunklem Design.

Lotse braucht keinen Datenbankserver und keinen Webserver davor: **ein einziger Python-Prozess** liefert
API, Uploads und Oberfläche aus. Anmeldung lokal oder über **LDAP/Active Directory (LDAPS/STARTTLS)**.

![Startseite](docs/screenshots/01-startseite.png)

## Auf einen Blick

| | |
|---|---|
| ![Veranstaltungen](docs/screenshots/03-veranstaltungen.png) | ![Kalender](docs/screenshots/04-kalender.png) |
| **Veranstaltungen** – kommende Termine mit „Ich bin dabei“, Kalender und Rückblick | **Kalender** – Monatsansicht, abonnierbar in Outlook |
| ![Mitarbeitende](docs/screenshots/05-mitarbeitende.png) | ![Lageplan](docs/screenshots/06-lageplan.png) |
| **Mitarbeitende** – nach Abteilungen gegliedert, mit E-Mail und Durchwahl | **Lageplan** – interaktiv: Räume, Suche über alle Etagen, Zoom zur Person, Besprechungsräume |
| ![Meine Schulungen](docs/screenshots/15-meine-schulungen.png) | ![Schulungen verwalten](docs/screenshots/16-schulungen-verwaltung.png) |
| **Meine Schulungen** – nur die eigenen, mit Fälligkeit und Bestätigung | **Schulungen verwalten** – Zuweisung, Fortschritt, Auswertung |
| ![Schulung bearbeiten](docs/screenshots/17-schulung-bearbeiten.png) | ![Schnellzugriff](docs/screenshots/18-schnellzugriff-verwaltung.png) |
| **Schulung bearbeiten** – Texteditor, Zuweisung an Personen, Abteilungen, Gruppen, Unterlagen | **Schnellzugriff** – Kacheln für Programme, Sammel-Postfächer und Telefonnummern |
| ![Ideen](docs/screenshots/07-ideen.png) | ![Kleinanzeigen](docs/screenshots/08-kleinanzeigen.png) |
| **Ideenbox** – Vorschläge, Sternebewertung, Status und Antwort, auch anonym | **Kleinanzeigen** – Biete, Suche, Zu verschenken, Fahrgemeinschaften |
| ![Umfragen](docs/screenshots/21-umfragen.png) | ![Organigramm](docs/screenshots/22-organigramm.png) |
| **Umfragen** – anonym abstimmen, Ergebnisbalken, Mehrfachauswahl, Enddatum | **Organigramm** – aus LDAP oder von Hand, mit Zoom |
| ![Startseite gestalten](docs/screenshots/23-startseite-gestalten.png) | |
| **Startseite gestalten** – Blöcke ziehen, ein-/ausblenden, Vorlagen | |
| ![Dokumente](docs/screenshots/13-dokumente.png) | ![Dokument im Portal](docs/screenshots/09-dokument-viewer.png) |
| **Dokumentenbibliothek** – ISO-Dokumente, Richtlinien, Suche | **Dokumente** – PDFs öffnen sich direkt im Portal |
| ![Raum-Editor](docs/screenshots/14-raum-editor.png) | ![Fotogalerie](docs/screenshots/10-galerie.png) |
| **Raum-Editor** – Räume aufziehen, verschieben, Größe ändern | **Fotos** von Veranstaltungen als Galerie |
| ![Dunkles Design](docs/screenshots/02-startseite-dunkel.png) | ![LDAP-Einstellungen](docs/screenshots/11-verwaltung-ldap.png) |
| **Dunkles Design** – umschaltbar oben rechts | **Verwaltung** – LDAP-Server, Abteilungen, Benutzer, Etagen |
| ![Suche beim Tippen](docs/screenshots/20-suche-live.png) | ![Suche](docs/screenshots/19-suche.png) |
| **Suche beim Tippen** – Treffer erscheinen sofort, Pfeiltasten + Enter | **Alle Treffer** – gruppiert nach Bereichen |
| ![Anmeldung](docs/screenshots/12-anmeldung.png) | |
| **Anmeldung** – Lesen ohne Login, Anmelden nur zum Schreiben | |

Alle Funktionen im Detail: **[docs/FUNKTIONEN.md](docs/FUNKTIONEN.md)** · Bildnachweise: [docs/CREDITS.md](docs/CREDITS.md)

## Funktionen

### Für alle Mitarbeitenden

- **Startseite**: **persönliche Begrüßung** („Guten Morgen, Mehmet“) mit heutigen Terminen, offenen Schulungen
  (rot bei Überfälligkeit) und Neuem zu den eigenen Ideen, großer **Slider** mit den
  wichtigsten Beiträgen, **Schnellzugriff**-Kacheln, nächste **Termine** mit Monatskalender, **Fotos** aus dem
  Firmenleben, **Neuigkeiten**, **Neu im Team**, zuletzt veröffentlichte Artikel und neue Anzeigen.
- **Schnellzugriff**: Kacheln zu Zeiterfassung, ERP, Outlook, Helpdesk usw., zu Sammel-Postfächern
  (Buchhaltung, Eingangsrechnungen, IT-Support – Adresse per Knopf kopieren) und wichtigen Telefonnummern.
- **Aktuelles** und **Wissen & Regeln**: Neuigkeiten, Veranstaltungen, neue Kolleg:innen, neue Produkte,
  Regeln & Richtlinien, Arbeitssicherheit, IT-Sicherheit, Know-how – jeder Artikel auf Deutsch und Englisch,
  mit Bildern, Fotogalerie und PDF-Anhängen. Beispiele: ISO-Dokumente, Datenschutz, KI-Richtlinie,
  Besprechungsraum buchen, IT-Probleme melden.
- **Versionshistorie**: Bei jedem Artikel ist sichtbar, wer was wann geändert hat (mit Änderungsgrund) –
  inklusive Vergleich mit der Vorversion und hinzugefügten/entfernten Dokumenten. Öffentlich wie der Artikel.
- **Veranstaltungen**: Demnächst, Monatskalender, Rückblick mit Fotos; **„Ich bin dabei“** mit
  Teilnehmerliste; Kalender-Abo (`.ics`) für Outlook, Google und Apple.
- **Feiertage** im Kalender und auf der Startseite: gesetzliche Feiertage für **Deutschland, Österreich und die
  Schweiz** bis zehn Jahre im Voraus, mit Länderkürzeln; optional inklusive Bundesland bzw. Kanton.
- **Dokumente**: Bibliothek aller PDFs mit Suche; PDFs und Fotos öffnen sich im **eingebauten Betrachter**.
- **Schulungen** (nach Anmeldung): **Pflichtschulungen** für die eigene Person (Reiter *Offen*, mit Fälligkeit),
  **freiwillige Schulungen für alle** (z. B. Anleitungen, Reiter *Freiwillig*) und *Erledigt*; Unterlagen (PDF,
  **Video**, Bild, Link) und die Bestätigung **„durchgearbeitet und verstanden“**. Fachschulungen sehen nur die
  Zugewiesenen.
- **Mitarbeitende**: Verzeichnis nach Abteilungen mit Suche (Name, Abteilung, Position, Durchwahl, E-Mail).
- **Lageplan**: Gebäudeansicht (Etagen übereinander, Lagerhallen daneben), Räume als echte Flächen in den
  Abteilungsfarben, Besprechungsräume mit Plätzen, Ausstattung und Raum-E-Mail, Hover-Karte mit Foto und
  Durchwahl, weiches Zoomen zur Person, Suche über alle Etagen, Minikarte, Abteilungsfilter.
- **Organigramm** (Mitarbeitende → Organigramm): wer wem unterstellt ist – aus LDAP (`manager`) oder in der
  Verwaltung eingetragen; Äste ein-/ausklappen, an Breite anpassen, Zoom, Suche und Abteilungsfilter heben Personen hervor.
- **Startseite gestalten** (Redaktion/Admin): Blöcke per Ziehen anordnen, ein-/ausblenden, *breit* oder *halb*;
  fertige Vorlagen (*Standard*, *Nachrichten zuerst*, *Bilder & Termine*, *Kompakt*) mit Live-Vorschau.
- **Farbschema** (Admin): acht Farbwelten zur Wahl (*Hafen*, *Signal*, *Meer*, *Indigo*, *Nordsee*, *Fjord*, *Azur*, *Marine*), je mit hellem und dunklem Modus; Vorschau sofort, gilt nach dem Speichern für alle. Jede Person kann im **Profil → Meine Farben** ein eigenes Schema wählen.
- **Oben anheften**: wichtige Beiträge (optional bis zu einem Datum) stehen ganz oben in *Aktuelles* und in *Was gibt’s Neues* – z. B. Jahresplanung, Inventur.
- **Niederlassungen**: Artikel und Termine nur für bestimmte Standorte; Personen gehören zu einer Niederlassung
  (von Hand oder aus LDAP), Schulungen lassen sich einer Niederlassung zuweisen.
- **Benachrichtigungen** per **E-Mail** (neue Artikel und Termine, Antworten auf eigene Ideen, **zugewiesene Pflichtschulungen**) und als Karte in
  einem **Teams-Kanal**; jede Person kann sie im Profil abschalten. Betreff und Text der Mails gestaltet der Admin
  selbst (**Mail anpassen**: Editor mit Platzhaltern wie `{article}`, Vorschau, Test-Mail).
- **Social Media**: Facebook-, LinkedIn- und Instagram-Seite der Firma als Links auf der Startseite und in der Fußzeile.
- **Kleinanzeigen**: Biete, Suche, Zu verschenken, Fahrgemeinschaften – mit Foto, Preis und Kontakt; verschwinden nach 90 Tagen automatisch.
- **Ideenbox**: Ideen einreichen (auf Wunsch **wirklich anonym** – der Name wird dann gar nicht gespeichert),
  mit **1–5 Sternen** bewerten, Sortierung *Beste Bewertung* oder *Neueste*, Status von *Neu* bis *Umgesetzt*
  mit Antwort der Redaktion.
- **Umfragen**: kurze Abstimmungen (z. B. Termin der Firmenfeier, Zufriedenheit) – eine oder mehrere Antworten,
  Enddatum, Ergebnis sofort / nach der eigenen Stimme / erst nach dem Ende; **anonym** (gezählt wird nur die
  Anzahl je Antwort). Für alle oder nur für gewählte Abteilungen und Niederlassungen. Die neueste laufende Umfrage steht auf der Startseite.
- **Profil**: Foto, Durchwahl, Sprache und Passwort (bei lokalen Konten).
- **Glocke** oben rechts: offene Schulungen, neue Umfragen, Antworten auf eigene Ideen, Termine von heute. **Suche** als kleines Fenster (Lupe oder Strg + K); Menü links einklappbar; Fußzeile mit eigenem Text.
- **Rolle Personal (HR)**: Mitarbeitenden-Karten und Schulungen; Schulungen lassen sich **neuen Kolleg:innen** (erste 90 Tage) zuweisen. LDAP-Konten werden über die objectGUID zugeordnet, nie über den Namen.
- **Sprache**: die Umschaltung übersetzt die Oberfläche; Inhalte bleiben in der Sprache, in der sie geschrieben wurden (Übersetzung optional).
- **Suche über alles Öffentliche** (Strg + K), **Treffer erscheinen schon beim Tippen**: Personen, Artikel, Veranstaltungen, Dokumente, Räume, Kleinanzeigen,
  Ideen, Umfragen, Schnellzugriff – angemeldet zusätzlich die eigenen Schulungen; Umlaute egal (*schroeder* findet *Schröder*), **Deutsch/Englisch** und **hell/dunkel** umschaltbar,
  **Lesen ohne Anmeldung** (abschaltbar).

### Für die Redaktion

- Artikel in allen Bereichen schreiben (Markdown mit Vorschau), Titelbild, Fotos und PDFs anhängen,
  **Entwurf** oder **geplante Veröffentlichung** zu Datum und Uhrzeit, Beiträge für den Slider auswählen.
- **Änderungsgrund** beim Speichern für die Versionshistorie; alte Versionen **wiederherstellen**.
- Status und Antwort bei Ideen setzen, fremde Anzeigen entfernen.

### Für die Verwaltung (Administrator)

- **Benutzer**: anlegen, bearbeiten, Rollen, Abteilung, Position, Durchwahl, Platz, Foto, aktiv/sichtbar.
- **Abteilungen**: Name, Farbe, Reihenfolge; Umbenennen nimmt Personen, Räume und Schulungszuweisungen mit;
  optional automatisch aus LDAP.
- **Etagen & Lager**: Etagen und Hallen anlegen, Grundriss hochladen; **Plätze** setzen, zuweisen und per
  Ziehen verschieben; **Raum-Editor** zum Zeichnen der Räume (Art, Name DE/EN, Abteilung,
  Besprechungsraum-Daten) mit Raster und Grundriss als Vorlage.
- **Schulungen**: anlegen mit **Texteditor** (Überschriften H1–H4, fett, kursiv, unterstrichen, Farben,
  Listen, Links), Unterlagen hochladen (PDF bis 25 MB, Video MP4/WebM bis 500 MB, Bilder) oder verlinken,
  Fälligkeit; **für alle freiwillig** und/oder **Pflicht** für alle, Abteilungen, **Gruppen** (z. B.
  Geschäftsführung, Ersthelfer), **Funktionen/Positionen** (z. B. Staplerfahrer, auch aus LDAP) oder einzelne Personen; **Auswertung** (wer hat wann bestätigt, wer ist offen),
  **CSV-Export** als Audit-Nachweis, **neue Runde** (alle bestätigen erneut, z. B. jährlich).
  Schnellzugang über *Meine Schulungen* und das Benutzermenü.
- **Schnellzugriff**: Kacheln der Startseite anlegen, sortieren, ausblenden – Link, E-Mail oder Telefon,
  Symbol und Farbe, mit Vorschau.
- **Rollen & Rechte**: Rollen (Mitarbeitende, Autor:in, Moderator:in, Redaktion, Administrator) und einzelne
  Zusatzrechte pro Person; Systemeinstellungen bleiben immer den Administratoren vorbehalten.
- **LDAP-Abgleich mit Vorschau**: zeigt neue, zu verknüpfende, geänderte und nicht mehr vorhandene Personen
  sowie neue und überzählige Abteilungen – übernommen wird nur, was abgehakt ist. **LDAP ist führend**;
  Personen werden über Benutzername und **E-Mail-Adresse** erkannt, so entstehen keine Doppelkonten.
- **Einstellungen**: Firmenname, Anmeldebild, *Lesen ohne Anmeldung*, **Feiertage** (Länder, Bundesland/Kanton),
  **LDAP/Active Directory** mit Verbindungstest, **Windows-Anmeldung (SSO)**.

### Rollen und Rechte

Der Administrator vergibt unter **Verwaltung → Rollen & Rechte** an Personen, die schon im System sind, eine
Rolle und bei Bedarf **zusätzliche Rechte** (z. B. *Etagen, Räume & Plätze* oder *Personen & Abteilungen*).

| Rolle | Darf |
|---|---|
| Besucher (nicht angemeldet) | lesen – nur wenn *Lesen ohne Anmeldung* eingeschaltet ist (keine Schulungen) |
| Mitarbeitende | zusätzlich Anzeigen, Ideen, Sternebewertung, Zusagen, eigene Schulungen bestätigen, Profil |
| Autor:in | zusätzlich **eigene** Artikel und Veranstaltungen |
| Personal (HR) | wie Autor:in, dazu Mitarbeitenden-Karten, Schulungen verwalten und **E-Mail-Texte** anpassen (ohne Postfach-Zugangsdaten) |
| Moderator:in | wie Autor:in, dazu Schulungen verwalten, Ideen & Kleinanzeigen moderieren, Schnellzugriff, Umfragen |
| Redaktion | wie Moderator:in, dazu **alle** Artikel, Entwürfe, Slider, Versionen wiederherstellen |
| Administrator | alles – nur Administratoren ändern **Einstellungen, LDAP, Windows-Anmeldung, Rollen & Rechte** und starten den **LDAP-Abgleich** |

## Technik

| Teil | Technik |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, **SQLite** (eine Datei, kein Datenbankserver), `holidays` (Feiertage, offline) |
| Frontend | React 19, Vite, Tailwind CSS 4, TipTap (Texteditor), Schrift Geist, Icons Lucide |
| Anmeldung | lokal (bcrypt + JWT) oder LDAP/AD über LDAPS bzw. STARTTLS (ldap3); Windows-Anmeldung per Kerberos (pyspnego) |
| Betrieb | ein Prozess (uvicorn) liefert API, Uploads und die gebaute Oberfläche aus |

Neue Datenbankfelder und Tabellen werden beim Start automatisch ergänzt (`backend/app/migrate.py`);
bestehende Daten bleiben erhalten.

## Schnellstart (Windows)

Voraussetzungen: Python 3.11 oder neuer, Node.js 20 oder neuer.

```powershell
git clone <repository-url> lotse
cd lotse
.\start.ps1
```

`start.ps1` legt eine virtuelle Python-Umgebung an, baut die Oberfläche, erzeugt beim allerersten Start
Demodaten und startet Lotse auf **http://localhost:8000**.

Die Demodaten enthalten Beispielkonten. Ihre Passwörter werden bei jedem Anlegen **zufällig erzeugt** und nur
einmal in der Konsole angezeigt – im Repository stehen keine Passwörter. Feste Passwörter für eine Vorführung
lassen sich mit `LOTSE_DEMO_ADMIN_PASSWORD` und `LOTSE_DEMO_PASSWORD` vorgeben.

> Für den echten Betrieb `seed.py` **nicht** ausführen, sondern eigene Konten anlegen bzw. LDAP verwenden.

> Nach einem Update (`git pull`) die Abhängigkeiten neu installieren und die Oberfläche neu bauen:
> `backend\.venv\Scripts\pip install -r backend\requirements.txt` und `cd frontend; npm install; npm run build`.

### Linux / manuell

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python seed.py                      # optional: Demodaten
cd ../frontend && npm install && npm run build && cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Entwicklung

```bash
cd backend && uvicorn app.main:app --reload          # API auf :8000
cd frontend && npm run dev                           # Oberfläche auf :5173 mit Proxy zur API
```

### Demodaten

| Befehl | Wirkung |
|---|---|
| `python seed.py` | legt alle Demodaten in einer **leeren** Datenbank an |
| `python seed.py --reset` | löscht alles und legt die Demodaten neu an |
| `python seed.py --iso` | ergänzt Beispiel-Dokumente (ISO, Datenschutz, Aktenvernichtung, Mülltrennung, KI-Richtlinie, Anleitungen Raumbuchung und IT-Support) |
| `python seed.py --photos` | ergänzt echte Fotos: Profilfotos aller Demo-Personen, Titelbilder, Fotogalerien und Bilder bei Kleinanzeigen – nur dort, wo noch nichts gesetzt ist |
| `python seed.py --rooms` | ergänzt die Demo-Räume für Etagen, die noch keine Räume haben |
| `python seed.py --trainings` | ergänzt Schnellzugriff-Kacheln und Beispiel-Schulungen mit Gruppen, wenn noch keine vorhanden sind |

## Konfiguration

Fast alles lässt sich in der Oberfläche unter **Verwaltung → Einstellungen** einstellen:

- **Allgemein**: Firmenname, Anmeldebild, *Lesen ohne Anmeldung* an/aus.
- **Feiertage im Kalender**: Deutschland, Österreich, Schweiz – je Land aus, landesweit oder mit Bundesland/Kanton.
- **LDAP / Active Directory**: Server (**IP-Adresse oder Hostname**), Port, Verschlüsselung
  (LDAPS = Port 636 oder STARTTLS = Port 389), Zertifikatsprüfung, CA-Zertifikat der Firma,
  Dienstkonto (Bind-DN + Passwort), Suchbasis, Gruppen für Administratoren und Redaktion,
  Abteilungen aus LDAP übernehmen, Attribut-Zuordnung. **„Speichern & testen“** prüft die Verbindung sofort.

Die Werte liegen in der Datenbank und haben Vorrang vor `backend/.env`. Alternativ (z. B. für automatisierte
Installationen) `backend/.env.example` nach `backend/.env` kopieren und anpassen.

| Variable | Bedeutung |
|---|---|
| `LOTSE_COMPANY_NAME` | Firmenname im Portal |
| `LOTSE_PUBLIC_READ` | `true`: Lesen ohne Anmeldung |
| `LOTSE_SECRET_KEY` | Schlüssel für Anmelde-Tokens und signierte Schulungs-Links; leer = wird einmalig zufällig erzeugt |
| `LOTSE_DATABASE_URL` | Standard: SQLite-Datei `backend/data/lotse.db` |
| `LOTSE_MAX_UPLOAD_MB` / `LOTSE_MAX_PDF_MB` / `LOTSE_MAX_VIDEO_MB` | Größenlimits für Bilder (8), PDFs (25) und Schulungsvideos (500) |
| `LOTSE_LDAP_*` | LDAP-Einstellungen (siehe `.env.example`) |

Lotse läuft als **ein Prozess** (Standard bei `start.ps1`). Mehrere Worker würden Änderungen aus den
Einstellungen erst nach einem Neustart sehen.

**Daten sichern:** Der Ordner `backend/data/` enthält Datenbank, Uploads, Schulungsunterlagen
(`trainings/`) und den Token-Schlüssel – diesen Ordner regelmäßig sichern.

## Sicherheit

- Passwörter mit bcrypt, Anmeldung per signiertem Token (JWT, HS256) im `Authorization`-Header – keine
  Cookies, daher kein CSRF. **Rolle und Rechte werden bei jeder Anfrage aus der Datenbank gelesen**, nicht aus
  dem Token: Ein veränderter oder selbst signierter Token bringt keine Rechte; Rechteentzug und Deaktivierung
  wirken sofort. Geprüft mit gefälschten Tokens (`alg=none`, geänderte Nutzlast, falscher Schlüssel,
  abgelaufen) und einem Durchlauf über alle API-Endpunkte als Besucher und als Mitarbeiter:in.
- **Schutz vor Passwort-Raten**: 5 Fehlversuche je Benutzername → 30 Sekunden Wartezeit; 20 Fehlversuche je
  Rechner → ebenfalls 30 Sekunden.
- **Windows-Anmeldung** nur über den eingetragenen Webserver (IP-Prüfung); nur für LDAP-Konten.
- Das öffentliche Verzeichnis zeigt keine Benutzernamen, Rollen oder Kontoarten; jede E-Mail-Adresse gibt es
  nur einmal.
- LDAP nur verschlüsselt (LDAPS/STARTTLS) mit Zertifikatsprüfung; Suchfilter werden maskiert; das Passwort
  des Dienstkontos wird nie an den Browser zurückgegeben.
- Uploads: Dateityp wird am Inhalt geprüft; SVGs mit CSP-Sandbox; PDFs nur innerhalb des Portals einbettbar;
  Artikeltexte werden vor der Anzeige bereinigt (DOMPurify).
- **Schulungen** sind nur für zugewiesene Personen sichtbar; ihre Dateien liegen außerhalb des öffentlichen
  Upload-Ordners und werden nur über **signierte, zeitlich begrenzte Links** (2 Stunden) ausgeliefert.
- **Anonyme Ideen** werden ohne Autor gespeichert. Kacheln im Schnellzugriff erlauben nur Web-, Mail-,
  Telefon- und Portal-Adressen.
- Verzeichnis, Lageplan und Versionshistorie sind bei *Lesen ohne Anmeldung* für alle im Netz sichtbar –
  **Lotse gehört ins Firmennetz, nicht ins offene Internet.** Für den Betrieb wird HTTPS empfohlen
  (z. B. über einen Reverse Proxy wie IIS oder Caddy), damit Passwörter nicht unverschlüsselt übertragen werden.

## Windows-Anmeldung (SSO) einrichten

Mitarbeitende, die am Firmen-PC angemeldet sind, werden ohne Passwort erkannt. Zwei Wege, umschaltbar unter
**Verwaltung → Einstellungen → Windows-Anmeldung**:

| Art | Wann | Anleitung |
|---|---|---|
| **Kerberos direkt** (Standard) | Lotse prüft das Windows-Ticket selbst – kein IIS, ein Prozess. Windows-Server in der Domäne oder Linux mit Keytab. | [`deploy/kerberos/`](deploy/kerberos/README.md) |
| **Über einen Webserver** | Es gibt schon einen IIS (oder anderen Webserver mit Windows-Authentifizierung), der den Benutzer im Header weitergibt. | unten |

### Variante: hinter IIS

Lotse läuft hinter **IIS** mit Windows-Authentifizierung (Kerberos):

1. Lotse wie gewohnt starten, aber nur lokal erreichbar: in `start.ps1` `--host 0.0.0.0` durch `--host 127.0.0.1` ersetzen.
2. Auf dem Server IIS mit **Windows-Authentifizierung**, **URL Rewrite** und **Application Request Routing**
   installieren; eine Website `intranet.firma.local` anlegen, *Windows-Authentifizierung* an, *Anonym* aus.
3. Reverse-Proxy-Regel auf `http://127.0.0.1:8000/{R:1}` und den Server-Variable-Header setzen:
   `HTTP_X_REMOTE_USER` = `{LOGON_USER}` (unter *Zulässige Servervariablen* freigeben).
4. Für Kerberos den SPN `HTTP/intranet.firma.local` auf das Konto des Servers bzw. App-Pools eintragen und
   die Adresse per Gruppenrichtlinie zur **Lokales Intranet**-Zone hinzufügen (Edge/Chrome melden dann
   automatisch an).
5. In Lotse unter **Verwaltung → Einstellungen → Windows-Anmeldung** einschalten, Art *Über einen Webserver*; Header `X-Remote-User`,
   vertrauenswürdige Webserver `127.0.0.1`.

Lotse akzeptiert den Header nur von den eingetragenen Adressen und nur für LDAP-Konten. Lokale Konten (z. B. ein
Notfall-Administrator) melden sich weiter mit Passwort an.

**Bei jedem Öffnen der Seite** fragt Lotse den Webserver, wer am PC angemeldet ist, sucht die Person im LDAP/AD und
meldet sie ohne Passwort an. Ist im Browser noch die Sitzung einer anderen Person gespeichert (gemeinsam genutzter
PC), wird sie ersetzt. Ausnahmen: nach *Abmelden* bleibt man in diesem Tab abgemeldet, und wer sich mit einem
lokalen Konto per Passwort angemeldet hat, bleibt angemeldet. Klappt die Windows-Anmeldung nicht (z. B. privates
Gerät), bleibt die Anmeldung mit Benutzername und Passwort.

Damit die Browser das Windows-Konto ohne Rückfrage weitergeben (sonst erscheint ein Anmeldefenster):

| Browser | Einstellung (per Gruppenrichtlinie verteilen) |
|---|---|
| Edge, Chrome | Adresse in der Zone **Lokales Intranet** (Schritt 4) – oder Richtlinie `AuthServerAllowlist` = `intranet.firma.local` |
| Firefox | Richtlinie *Authentication → SPNEGO* = `intranet.firma.local` (Firefox-ADMX bzw. `policies.json`); von Hand: `about:config` → `network.negotiate-auth.trusted-uris` |
| Safari (macOS) | Mac in der Domäne oder Kerberos-SSO-Erweiterung (MDM); dann meldet Safari automatisch an, sonst fragt es nach dem Passwort |

## Screenshots aktualisieren

```bash
pip install websocket-client
# Server mit Demodaten muss laufen; nutzt den lokalen Chrome.
python docs/make_screenshots.py --password <admin-passwort> --staff-password <passwort-der-demokonten>
```

Die Passwörter zeigt `seed.py` beim Anlegen an (alternativ `LOTSE_DEMO_ADMIN_PASSWORD` / `LOTSE_DEMO_PASSWORD`).
Ohne `--staff-password` entfällt das Bild *Meine Schulungen*. Die Bilder landen in
[`docs/screenshots/`](docs/screenshots/).

## Projektstruktur

```
backend/
  app/              FastAPI-Anwendung
    routers/        Artikel, Versionen, Schulungen, Schnellzugriff, Lageplan, Ideen, Kalender, Verwaltung …
    models.py       Datenbankmodelle      migrate.py  automatische Schema-Ergänzungen
    ldap_auth.py    LDAP/AD               uploads.py  Prüfung und Ablage von Dateien
  seed.py           Demodaten inkl. generierter Grundrisse, Räume, Fotos, PDFs und Schulungen
  data/             Datenbank, Uploads, Schulungsunterlagen, Schlüssel (nicht im Repository)
frontend/
  src/pages/        Seiten (Startseite, Artikel, Schulungen, Mitarbeitende, Verwaltung …)
  src/components/   Lageplan, Raum-Editor, Texteditor, Schnellzugriff, Versionshistorie, Betrachter …
  src/lib/          API-Zugriff, Anmeldung, Übersetzungen (i18n.jsx)
docs/
  FUNKTIONEN.md     ausführliche Funktionsbeschreibung
  screenshots/      Bildschirmfotos
  make_screenshots.py
start.ps1           Einrichtung und Start unter Windows
```

## API

Die vollständige API-Dokumentation (OpenAPI) gibt es im laufenden System unter `http://localhost:8000/docs`.

## Lizenz

Der Quellcode steht unter der [MIT-Lizenz](LICENSE). Die Demo-Fotos in `backend/demo/photos/` stammen von
Unsplash und unterliegen der [Unsplash-Lizenz](https://unsplash.com/license) – Nachweise in [docs/CREDITS.md](docs/CREDITS.md).
