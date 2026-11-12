# Änderungen

Was sich in Lotse geändert hat, neueste Version oben. Die vollständige Beschreibung aller Funktionen steht in
[FUNKTIONEN.md](FUNKTIONEN.md); hier steht nur, **was neu ist oder anders funktioniert** und worauf man beim
Aktualisieren achten muss.

## 2026-11-12

### Neu

- **Stellenangebote** (Kapitel 28) – interne Ausschreibungen, einzuschalten unter *Einstellungen → Allgemein →
  Zusatzfunktionen* (standardmäßig aus). Eigene Seite im Menü links, Block auf der Startseite unter den Jubiläen.
  Neues Recht *Stellenangebote pflegen* (die Rolle HR hat es). Stellen mit Art, Arbeitszeit, Beginn, Abteilung,
  Niederlassung, Bewerbungsfrist, Ansprechperson und Beschreibung; nach Ablauf der Frist verschwinden sie von
  selbst. Beworben wird per E-Mail oder Telefon bei der Ansprechperson – Lotse speichert keine Bewerbungen.
  Demo-Daten: `python seed.py --jobs`.
- Nach dem Speichern der Einstellungen passen sich Menü und Bereiche **sofort** an, ohne die Seite neu zu laden.
- Der Menüpunkt **Verwaltung** heißt jetzt **Einstellungen**, sein bisheriger Bereich *Einstellungen* heißt
  **Allgemein**. Senkrechtes Menü links statt einer Reihe Reiter. Unter *Allgemein* sind *Windows-Anmeldung
  (SSO)* und *LDAP / Active Directory* eingeklappt (Anzeige *Ein/Aus*, Klick öffnet); **Farbschema** steht als
  letzter Abschnitt.
- **Bildlaufleisten** im Menü links, in Fenstern und Listen tragen die Farbe des gewählten Farbschemas.
- **Jubiläen** (Kapitel 24) – werden von Hand gepflegt unter *Einstellungen → Jubiläen*, neues Recht
  *Jubiläen pflegen* (die Rolle HR hat es). Eigener Block auf der Startseite, standardmäßig vor *Social Media*,
  auch in bestehenden Startseiten-Layouts. Demo-Daten: `python seed.py --jubilees`.
- **Lesebestätigung** (Kapitel 25) – Häkchen im Editor (Redaktion); Mitarbeitende bestätigen unter dem Beitrag;
  Liste *wer hat bestätigt / wer ist offen* mit CSV-Export; Hinweis in der Glocke und auf den Kacheln.
- **Wochen-Newsletter** – *Versand: sofort* oder *wöchentlich* (Wochentag und Uhrzeit). Vierte E-Mail-Vorlage mit
  Platzhalter `{articles}`. Teams-Nachrichten bleiben sofort.
- **Statistik für die Redaktion** (Kapitel 26) – Aufrufe je Tag, meistgelesene Beiträge, Suchen ohne Treffer.
  Gezählt werden nur Zahlen, nie Personen.
- **Schulungsnachweis als PDF** – nach der Bestätigung für sich selbst, in der *Auswertung* für jede Person.
  Mit Schulungsdaten, Erklärung, Liste der Unterlagen und zwei Unterschriftenzeilen (Mitarbeiter:in und
  Vorgesetzte:r). **Immer genau eine DIN-A4-Seite**: Bei sehr vielen Unterlagen endet die Liste mit
  „… und N weitere Unterlagen“, lange Dateinamen werden gekürzt.
- **Bereiche abschalten** – unter *Einstellungen → Allgemein → Bereiche* lassen sich Rubriken ausblenden, die die Firma nicht
  nutzt (z. B. *Neue Produkte*). Leere Rubriken erscheinen ohnehin nicht mehr in den Filtern.

### Geändert

- Die Startseite hat **keinen Block „Für Sie“** mehr – offene Punkte stehen nur in der Glocke; die Seite beginnt
  wieder mit dem Slider. Bestehende Startseiten-Layouts verlieren den Block automatisch.
- **Schriften liegen im Projekt** (`frontend/public/fonts/`, Lizenz OFL, siehe CREDITS.md). Beim Öffnen der Seite
  geht keine Anfrage mehr an Google Fonts – wichtig für Datenschutz und Betrieb ohne Internet.
- **Suche** läuft über einen Volltextindex (SQLite FTS5, Trigramme) statt alle Inhalte bei jeder Anfrage zu laden.
  Wortteile werden gefunden („strasse“ findet „Gewerbestraße“), Umlaute wie bisher. Der Index aktualisiert sich
  nach jeder Änderung selbst; ohne FTS5 arbeitet die alte Suche weiter.
- **Schulungszuweisungen** werden in einem Schritt für alle Personen berechnet statt mit einer Abfrage je Schulung
  und Person – spürbar schneller bei vielen Schulungen.
- **Bild-Adressen** von Beiträgen und Kleinanzeigen akzeptieren nur noch eigene Uploads (`/uploads/…`).

### Sicherheit und Betrieb

- **Passwörter verschlüsselt**: LDAP-Bind-Passwort, SMTP-Passwort und Teams-Webhook werden in der Datenbank
  verschlüsselt gespeichert (Schlüssel aus `backend/data/.secret_key`). Alte Klartext-Einträge werden beim ersten
  Start automatisch verschlüsselt. **Den Ordner `backend/data/` immer komplett sichern** – ohne den Schlüssel
  müssen die Passwörter neu eingetragen werden.
- **Verwaiste Dateien aufräumen** (Kapitel 27): jede Nacht um 3 Uhr. Eine Datei wird nur gelöscht, wenn **kein Text
  in der gesamten Datenbank** sie erwähnt (alle Tabellen, auch ältere Beitragsversionen und von Hand eingefügte
  Links) und sie älter als 24 Stunden ist. Probelauf: `python -m app.housekeeping --dry-run`.

### Beim Aktualisieren

```powershell
backend\.venv\Scripts\pip install -r backend\requirements.txt   # neu: fpdf2 (PDF), cryptography
cd frontend; npm run build; cd ..
```

Neue Tabellen und Spalten legt Lotse beim Start selbst an. Danach den Dienst neu starten.
