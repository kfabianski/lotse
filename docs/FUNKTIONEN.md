# Lotse – Funktionsbeschreibung

Diese Beschreibung erklärt, was Lotse kann und wer was darf. Installation und Konfiguration stehen in der
[README](../README.md).

## Inhalt

1. [Rollen und Anmeldung](#1-rollen-und-anmeldung)
2. [Oberfläche](#2-oberfläche)
3. [Startseite](#3-startseite)
4. [Aktuelles und Wissen & Regeln](#4-aktuelles-und-wissen--regeln)
5. [Veranstaltungen und Kalender](#5-veranstaltungen-und-kalender)
6. [Dokumente und Fotos](#6-dokumente-und-fotos)
7. [Mitarbeitende und Abteilungen](#7-mitarbeitende-und-abteilungen)
8. [Lageplan](#8-lageplan)
9. [Pinnwand](#9-pinnwand)
10. [Ideenbox](#10-ideenbox)
11. [Verwaltung](#11-verwaltung)
12. [LDAP / Active Directory](#12-ldap--active-directory)

---

## 1. Rollen und Anmeldung

| Rolle | Darf |
|---|---|
| **Besucher** (nicht angemeldet) | Alles lesen: Artikel, Veranstaltungen, Dokumente, Pinnwand, Ideen, Verzeichnis und Lageplan. Gilt nur, wenn *Lesen ohne Anmeldung* eingeschaltet ist. |
| **Mitarbeitende** | Zusätzlich: Aushänge an der Pinnwand und Ideen einreichen (auch anonym), eigene löschen, für Ideen stimmen, bei Veranstaltungen zusagen, Profilfoto, Durchwahl und Passwort ändern. |
| **Redaktion** | Zusätzlich: Artikel in allen Bereichen schreiben, bearbeiten, löschen; Entwürfe sehen; Beiträge für den Slider auswählen; Fotos und PDFs anhängen; Status und Antwort bei Ideen setzen; fremde Aushänge entfernen. |
| **Administrator** | Zusätzlich: Benutzer, Rollen, Fotos und Plätze verwalten; Abteilungen pflegen; Etagen und Lager mit Grundrissen anlegen; Einstellungen und LDAP konfigurieren. |

- **Anmeldung**: oben rechts über *Anmelden*. Lokale Konten oder Windows-Konto (LDAP).
- Wer ohne Anmeldung etwas schreiben möchte (z. B. *Aushang erstellen*), wird zur Anmeldung geführt und
  danach auf dieselbe Seite zurückgebracht.
- Mit *Lesen ohne Anmeldung = aus* verlangt das ganze Portal eine Anmeldung.

## 2. Oberfläche

- **Navigation links**: Start, Aktuelles, Veranstaltungen, Wissen & Regeln, Dokumente, Pinnwand, Ideen,
  Mitarbeitende, Verwaltung (nur Administratoren). Auf dem Handy als ausklappbares Menü.
- **Oben rechts**: Suche (Tastenkürzel **Strg + K**), Sprache **DE/EN**, **helles/dunkles Design**,
  Avatar mit Profil und Abmelden.
- **Zweisprachig**: Alle Bedienelemente auf Deutsch und Englisch; Artikel haben einen deutschen und einen
  englischen Text. Fehlt die englische Fassung, wird die deutsche gezeigt.
- **Suche**: findet Artikel (Titel, Kurztext, Text) und Personen (Name, Abteilung, Position, E-Mail, Durchwahl).

## 3. Startseite

- **Slider** über die ganze Breite mit den Beiträgen, die die Redaktion als *Im Slider zeigen* markiert hat
  (z. B. *Weihnachtsfeier 2026*). Wechselt automatisch, hält beim Überfahren mit der Maus an, lässt sich
  pausieren und mit Pfeilen steuern. Bei „Bewegung reduzieren“ im Betriebssystem läuft er nicht von selbst.
- **Neuigkeiten** und **Neue Produkte**: der neueste Beitrag groß, die nächsten daneben.
- **Nächste Termine** mit Anzahl der Zusagen.
- **Neu im Team**: Kolleg:innen der letzten 90 Tage – ein Klick zeigt ihren Platz im Lageplan.
- **Zuletzt veröffentlicht** und **Neu an der Pinnwand**.

## 4. Aktuelles und Wissen & Regeln

| Aktuelles | Wissen & Regeln |
|---|---|
| Neuigkeiten | Regeln & Richtlinien |
| Veranstaltungen | Arbeitssicherheit |
| Neue Kolleg:innen | IT-Sicherheit |
| Neue Produkte | Know-how |

- Filter nach Bereich über die Schaltflächen oberhalb der Liste.
- **Artikel schreiben** (Redaktion): Bereich, Titel, Kurztext und Text in **Deutsch und Englisch**
  (Text in Markdown mit Vorschau), Titelbild, Fotos und PDFs, *Veröffentlicht* oder *Entwurf*,
  *Im Slider zeigen*. Bei Veranstaltungen zusätzlich Datum, Uhrzeit und Ort.
- **Veröffentlichen am** (Datum und Uhrzeit): leer = sofort. Ein Datum in der Zukunft **plant** den Artikel – er
  erscheint automatisch zu diesem Zeitpunkt (auch auf der Startseite, im Kalender, bei den Dokumenten und im
  Kalender-Abo). Bis dahin sieht ihn nur die Redaktion, markiert mit *Geplant für …*. Der Knopf heißt dann
  *Einplanen* statt *Veröffentlichen*.
- Entwürfe sieht nur die Redaktion.

## 5. Veranstaltungen und Kalender

Drei Ansichten unter **Veranstaltungen**:

- **Demnächst**: Karten mit Datum, Uhrzeit, Ort, Kurztext und Teilnehmenden. Mit **„Ich bin dabei“** sagen
  angemeldete Mitarbeitende zu (noch einmal klicken = absagen).
- **Kalender**: Monatsansicht (Woche beginnt Montag). Ein Klick auf einen Tag zeigt dessen Termine.
- **Rückblick**: vergangene Veranstaltungen mit Anzahl der Teilnehmenden und Fotos.

**Kalender abonnieren** kopiert einen Link (`/api/events.ics`), den man in Outlook unter
*Kalender hinzufügen → Aus dem Internet* einträgt. Neue Termine erscheinen dann automatisch.

## 6. Dokumente und Fotos

- An jeden Artikel lassen sich **Fotos** (Galerie) und **PDFs** (Dokumente) anhängen, z. B. Fotos vom
  Sommerfest oder die Brandschutzordnung.
- **Eingebauter Betrachter**: Fotos und PDFs öffnen sich **im Portal**, nicht in einem neuen Fenster.
  - Fotos: Vollbild, blättern mit Pfeiltasten oder Schaltflächen, Vorschaubilder unten.
  - PDFs: Anzeige im Portal mit Zoom und Seitenansicht, Schaltfläche *Herunterladen*.
  - Schließen mit **Esc** oder ✕.
  - Auch Links auf PDFs im Artikeltext öffnen im Betrachter.
- **Dokumente** (Navigation): alle PDFs aus veröffentlichten Artikeln an einem Ort, mit Suche und Verweis
  auf den zugehörigen Artikel.

## 7. Mitarbeitende und Abteilungen

- **Liste**: nach Abteilungen gegliedert – **Einkauf, Verwaltung, Finanzen, IT, Versand, Fulfillment,
  Vertrieb** (anpassbar). Jede Karte zeigt Foto, Name, Position, **E-Mail** und **Durchwahl** (beides
  anklickbar), den Standort und „Dabei seit“.
- **Abteilungsfilter**: Schaltflächen mit Farbe und Personenzahl. Ein Klick auf *Einkauf* zeigt nur die
  Einkäufer:innen; die Suche nach „Einkauf“ findet sie ebenso.
- Direkter Link auf eine Abteilung: `/people?dept=Einkauf`.
- **Auf dem Plan zeigen** springt in den Lageplan zum Platz der Person.

## 8. Lageplan

- **Gebäudeansicht** rechts: die Büroetagen übereinander (2. OG, 1. OG, EG), die Lagerhallen darunter
  (Lager Nord, Lager Süd) – jeweils mit Anzahl der Personen. Ein Klick wechselt die Ebene (mit Animation).
- **Interaktiver Plan**: Räume sind eigene Flächen – Büros in der **Abteilungsfarbe** mit Belegung
  (z. B. *3/8 Plätze*), Besprechungsräume mit Tisch und Stühlen, Küche, Empfang, Treppenhaus; im Lager
  Hochregale, Tore, Fahrweg und Lagerbüro. Belegte Plätze zeigen Foto bzw. Initialen, freie Plätze sind
  gestrichelt und mit *frei* beschriftet.
- **Überfahren einer Person** zeigt eine Karte mit Foto, Position, Abteilung und Durchwahl.
- **Klick auf eine Person** zoomt weich zu ihrem Platz und zeigt rechts die Kontaktkarte (Telefon, E-Mail,
  Platz, Raum).
- **Klick auf einen Raum** zeigt rechts, wer dort sitzt; bei **Besprechungsräumen** Plätze, Ausstattung,
  die Raumadresse für die Outlook-Einladung und den Link zur Buchungsanleitung. **Doppelklick** zoomt in den Raum.
- **Suche** über alle Etagen nach Personen, Abteilungen und Räumen – das Ergebnis wechselt die Etage und
  fliegt direkt zum Platz bzw. Raum.
- **Zoomen** mit Mausrad oder **+ / −**, **Verschieben** durch Ziehen, **Esc** oder **Ganze Etage** setzt
  zurück. Beim Hineinzoomen erscheinen die Vornamen und oben eine **Minikarte** (anklickbar).
- **Abteilungsfilter** der Etage hebt eine Abteilung hervor, alle anderen werden ausgeblendet.
- **Auf dem Plan zeigen** (Verzeichnis, *Neu im Team* auf der Startseite) öffnet die richtige Etage und
  zoomt zur Person.
- Die Räume zeichnet die Verwaltung im **Raum-Editor** (siehe Verwaltung). Etagen ohne Räume zeigen ihren
  hochgeladenen Grundriss mit den Plätzen darauf.

## 9. Pinnwand

- Arten: **Biete, Suche, Zu verschenken, Fahrgemeinschaft, Sonstiges** – mit Filter.
- Aushang mit Titel, Beschreibung, optionalem Preis und Foto; Kontakt über E-Mail oder Durchwahl der
  Person.
- Erstellen nur nach Anmeldung; löschen dürfen die Person selbst und die Redaktion.

## 10. Ideenbox

- **Idee einreichen** mit Thema (*Abläufe, Arbeitsplatz, IT & Software, Sicherheit, Nachhaltigkeit,
  Sonstiges*), einem Satz als Titel und einer Beschreibung.
- **Anonym einreichen** möglich: Der Name ist öffentlich verborgen, die Redaktion sieht ihn für Rückfragen.
- **Bewerten mit Sternen**: jede angemeldete Person gibt einer Idee 1 bis 5 Sterne (nicht der eigenen);
  erneuter Klick auf denselben Stern nimmt die Bewertung zurück. Jede Idee zeigt den **Durchschnitt** und die
  Anzahl der Bewertungen. Sortierung nach *Beste Bewertung* (Ideen mit wenigen Bewertungen werden vorsichtig
  gewichtet, damit eine einzelne 5-Sterne-Wertung nicht alles überholt) oder *Neueste*.
- **Status** als Ablauf: *Neu → In Prüfung → Geplant → Umgesetzt* oder *Abgelehnt*, mit **Antwort** der
  Redaktion und Datum.

## 11. Verwaltung

Nur für Administratoren, über **Verwaltung** in der Navigation:

- **Benutzer**: anlegen, bearbeiten, Rolle, Abteilung (Auswahl aus der Liste), Position, Durchwahl,
  Eintrittsdatum, Platz, aktiv / im Verzeichnis sichtbar, Foto hochladen (Klick auf das Bild), löschen.
- **Abteilungen**: Name, Farbe und Reihenfolge; neue Abteilungen anlegen; Umbenennen nimmt alle Personen
  mit; löschen nur, wenn niemand mehr zugeordnet ist. Kennzeichnung *aus LDAP* oder *manuell*.
- **Etagen & Lager**: neue Etage oder Halle anlegen, **Grundriss hochladen** (PNG, JPG oder SVG),
  **Klick auf den Plan legt einen Platz an**, Klick auf einen Platz weist ihn einer Person zu, benennt ihn
  um oder entfernt ihn. **Platz ziehen** verschiebt ihn auf dem Plan – die Person sitzt danach dort.
- **Etagen & Lager → Räume** (Raum-Editor): Etage wählen, auf freier Fläche ein **Rechteck aufziehen** legt
  einen Raum an. Räume **ziehen** verschiebt sie, die **Griffe** ändern die Größe; Pfeiltasten justieren fein,
  *Entf* löscht. Rechts: **Art** (Büro, Besprechungsraum, Küche, Empfang, WC, Lager/Archiv, Flur, Treppe,
  Regal, Ladetor, Fahrweg …), **Name** Deutsch/Englisch, **Abteilung** (färbt das Büro), bei
  Besprechungsräumen **Plätze, Ausstattung und Raum-E-Mail**; Position und Größe auch als Zahlen.
  **Raster** (abschaltbar, *Alt* = frei) und der hochgeladene **Grundriss im Hintergrund** helfen beim
  Nachzeichnen. Die Plätze werden zur Orientierung angezeigt; Änderungen erscheinen sofort im Lageplan.
- **Einstellungen**: Firmenname, *Lesen ohne Anmeldung*, LDAP (siehe unten).

## 12. LDAP / Active Directory

Unter **Verwaltung → Einstellungen → LDAP / Active Directory**:

| Feld | Beispiel |
|---|---|
| Server (IP-Adresse oder Hostname) | `10.0.0.5` oder `dc01.firma.local` |
| Port | `636` (LDAPS) oder `389` (STARTTLS) |
| Verschlüsselung | **LDAPS (SSL)** empfohlen, oder **STARTTLS** |
| Serverzertifikat prüfen | an (nur zum Testen ausschalten) |
| CA-Zertifikat der Firma | PEM-Text, falls ein internes Zertifikat verwendet wird |
| Dienstkonto (Bind-DN) | `CN=svc-intranet,OU=Service,DC=firma,DC=local` |
| Suchbasis (Base-DN) | `OU=Mitarbeiter,DC=firma,DC=local` |
| Gruppe für Administratoren / Redaktion | `CN=Intranet-Admins,OU=Gruppen,DC=firma,DC=local` |

- **Speichern & testen** prüft Verbindung, Zertifikat und Dienstkonto und zeigt die Anzahl der gefundenen
  Konten; mit *Testbenutzer* wird zusätzlich ein Konto gesucht und dessen Rolle angezeigt.
- **Anmeldung**: Das Dienstkonto sucht den Benutzer, danach wird mit dessen Passwort geprüft. Name, E-Mail,
  Abteilung, Position, Telefon und Foto (`thumbnailPhoto`) werden übernommen; die Rolle ergibt sich aus den
  Gruppen.
- **Abteilungen aus LDAP übernehmen**: an = unbekannte Abteilungen aus dem Attribut `department` werden
  automatisch angelegt (Schreibweise einer vorhandenen Abteilung wird beibehalten); aus = nur die von Hand
  gepflegte Liste gilt.
- **Aus LDAP synchronisieren** importiert alle aktiven Konten auf einmal.
- Bei einer **IP-Adresse** muss das Zertifikat des Servers diese IP enthalten – sonst den Hostnamen eintragen.
- Lokale Konten (z. B. ein Notfall-Administrator) funktionieren weiterhin.
