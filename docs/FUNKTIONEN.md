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
9. [Kleinanzeigen](#9-kleinanzeigen)
10. [Ideenbox](#10-ideenbox)
11. [Einstellungen (Verwaltung)](#11-einstellungen-verwaltung)
12. [LDAP / Active Directory](#12-ldap--active-directory)
13. [Schulungen und Pflichtlektüre](#13-schulungen-und-pflichtlektüre)
14. [Umfragen](#14-umfragen)
15. [Organigramm](#15-organigramm)
16. [Benachrichtigungen (E-Mail, Teams)](#16-benachrichtigungen-e-mail-teams)
17. [Startseite gestalten](#17-startseite-gestalten)
18. [Niederlassungen](#18-niederlassungen)
19. [Beiträge oben anheften](#19-beiträge-oben-anheften)
20. [Aussehen, Sprache und Navigation](#20-aussehen-sprache-und-navigation)
21. [Personal (HR) und neue Kolleg:innen](#21-personal-hr-und-neue-kolleginnen)
22. [Browser und Geräte](#22-browser-und-geräte)
23. [Social Media](#23-social-media)
24. [Jubiläen](#24-jubiläen)
25. [Lesebestätigung](#25-lesebestätigung)
26. [Statistik für die Redaktion](#26-statistik-für-die-redaktion)
27. [Betrieb: Aufräumen und Passwörter](#27-betrieb-aufräumen-und-passwörter)
28. [Stellenangebote (interne Ausschreibungen)](#28-stellenangebote-interne-ausschreibungen)

---

## 1. Rollen und Anmeldung

Der **Administrator** vergibt unter **Einstellungen → Rollen & Rechte** jeder Person, die schon im System ist,
eine Rolle und – zusätzlich zur Rolle – einzelne Rechte.

| Rolle | Darf (zusätzlich zum Lesen) |
|---|---|
| **Besucher** (nicht angemeldet) | nur lesen – wenn *Lesen ohne Anmeldung* eingeschaltet ist; keine Schulungen |
| **Mitarbeitende** | Anzeigen und Ideen (auch anonym), Sterne vergeben, bei Veranstaltungen zusagen, eigene Schulungen bestätigen, Profil |
| **Autor:in** | zusätzlich **eigene** Artikel und Veranstaltungen schreiben, bearbeiten, löschen (eigene Entwürfe) |
| **Personal (HR)** | wie Autor:in, dazu **Mitarbeitenden-Karten** anlegen und bearbeiten, **Schulungen verwalten**, **Jubiläen** und **Stellenangebote** eintragen und **E-Mail-Texte** ändern (siehe Kapitel 16, 21, 24 und 28) |
| **Moderator:in** | wie Autor:in, dazu **Schulungen verwalten**, **Ideen & Kleinanzeigen moderieren**, **Schnellzugriff** pflegen, **Umfragen** erstellen |
| **Redaktion** | wie Moderator:in, dazu **alle** Artikel bearbeiten, alle Entwürfe sehen, Slider, Versionen wiederherstellen, **Lesebestätigungen** anfordern und auswerten, Startseite gestalten, **Statistik** |
| **Administrator** | alles, auch die **Systemeinstellungen** |

**Einzelne Rechte**, die der Administrator pro Person zusätzlich einschalten kann: *Eigene Artikel &
Veranstaltungen*, *Alle Artikel & Veranstaltungen*, *Schulungen verwalten*, *Ideen & Kleinanzeigen moderieren*,
*Schnellzugriff pflegen*, *Umfragen erstellen*, *Etagen, Räume & Plätze*, *E-Mail-Texte*, *Jubiläen pflegen*, *Stellenangebote pflegen*,
*Personen & Abteilungen* (nur Konten **ohne** besondere Rechte; keine Rollen- oder Rechtevergabe).

**Nie übertragbar** – nur Administratoren: allgemeine Einstellungen, **LDAP**, Windows-Anmeldung,
**Rollen & Rechte**, **LDAP-Abgleich**. Wer kein Administrator ist, kann sich und anderen keine Rechte geben.
Der Menüpunkt *Einstellungen* zeigt jeder Person nur die Bereiche, für die sie Rechte hat.

- **Anmeldung**: oben rechts über *Anmelden*. Lokale Konten oder Windows-Konto (LDAP).
- **Windows-Anmeldung (SSO)**: Ist sie eingerichtet, prüft Lotse **bei jedem Öffnen der Seite**, wer am
  Firmen-PC angemeldet ist, sucht die Person im LDAP/AD und meldet sie **ohne Passwort** an (siehe Kapitel 12).
  Ist im Browser noch die Sitzung einer anderen Person gespeichert (gemeinsam genutzter PC), wird sie ersetzt.
  Klappt die Windows-Anmeldung nicht (z. B. privates Gerät), bleibt eine bestehende Sitzung erhalten.
  Ausnahmen: Nach *Abmelden* bleibt man in diesem Tab abgemeldet, bis man auf *Mit Windows-Konto anmelden*
  klickt; wer sich mit einem **lokalen Konto** per Passwort angemeldet hat, wird nicht ersetzt.
- **Schutz vor Passwort-Raten**: Nach **5 falschen Passwörtern** für einen Benutzernamen muss man
  **30 Sekunden** warten; nach 20 Fehlversuchen von einem Rechner gilt dasselbe für diesen Rechner.
- Wer ohne Anmeldung etwas schreiben möchte (z. B. *Anzeige aufgeben*), wird zur Anmeldung geführt und
  danach auf dieselbe Seite zurückgebracht.
- Mit *Lesen ohne Anmeldung = aus* verlangt das ganze Portal eine Anmeldung.

## 2. Oberfläche

- **Navigation links**: Start, Aktuelles, Veranstaltungen, Wissen & Regeln, Schulungen (angemeldet), Ideen,
  Umfragen, Mitarbeitende, Stellenangebote (wenn eingeschaltet), Dokumente, Kleinanzeigen, Einstellungen (für alle mit
  einem Verwaltungsrecht). Auf dem Handy als
  ausklappbares Menü. Sind alle Bereiche von *Wissen & Regeln* abgeschaltet (Kapitel 11), fehlt der Eintrag.
- **Oben rechts**: Suche (Tastenkürzel **Strg + K**), Sprache **DE/EN**, **helles/dunkles Design**,
  Avatar mit Profil und Abmelden.
- **Zweisprachig**: Alle Bedienelemente auf Deutsch und Englisch; Artikel haben einen deutschen und einen
  englischen Text. Fehlt die englische Fassung, wird die deutsche gezeigt.
- **Suche beim Tippen**: ab 2 Zeichen öffnet sich unter dem Suchfeld eine Trefferliste (je Bereich die
  ersten 4). **Pfeiltasten** wählen aus, **Enter** öffnet den Treffer, **Esc** schließt die Liste; Enter ohne
  Auswahl oder *Alle Treffer anzeigen* führt zur vollständigen Ergebnisseite.
- **Suche** über alles, was die Person sehen darf, gruppiert nach Bereichen:
  - **Personen** (Vor- und Nachname auch zusammen, Abteilung, Position, E-Mail, Durchwahl, Platz z. B. „1OG-01“),
  - **Artikel und Veranstaltungen** (Titel, Kurztext, Text, Ort – mit Textauszug zur Fundstelle),
  - **Dokumente** (PDF-Name und Artikel; öffnen sich direkt im Betrachter),
  - **Räume** aus dem Lageplan (Name, Ausstattung, Buchungs-E-Mail, Abteilung) – Klick öffnet die Etage,
  - **Kleinanzeigen** und **Ideen** (Klick springt zum Eintrag; anonyme Ideen bleiben anonym), **Umfragen**,
  - **Schnellzugriff**-Kacheln,
  - **Schulungen** nur für Angemeldete und nur die, die sie öffnen dürfen (zugewiesen oder für alle freiwillig).
  Groß-/Kleinschreibung und Akzente spielen keine Rolle: *yilmaz* findet *Yılmaz*, *schroeder* findet *Schröder*,
  *strasse* findet *Straße* – auch als Teil eines Wortes (*Gewerbestraße*). Mehrere Wörter müssen alle vorkommen
  (z. B. „Mehmet Yılmaz“). Die Suche läuft über einen Volltextindex (SQLite FTS5), der sich nach jeder Änderung von
  selbst erneuert; so bleibt sie auch bei vielen Beiträgen schnell. Entwürfe sehen nur Redaktion bzw. die eigenen
  Autor:innen.

## 3. Startseite

- **Begrüßung** oben links in der Kopfzeile: Datum und *Guten Morgen / Guten Tag / Guten Abend, Mehmet*.
- Was für die angemeldete Person ansteht (offene Schulungen, Beiträge zum Bestätigen, heutige Termine, neue
  Umfragen, Neues zu eigenen Ideen), zeigt die **Glocke** in der Kopfzeile (Kapitel 20) – die Startseite selbst
  bleibt frei davon und beginnt mit dem Slider.
- **Slider** über die ganze Breite mit den Beiträgen, die die Redaktion als *Im Slider zeigen* markiert hat
  (z. B. *Weihnachtsfeier 2026*). Wechselt automatisch, hält beim Überfahren mit der Maus an, lässt sich
  pausieren und mit Pfeilen steuern. Bei „Bewegung reduzieren“ im Betriebssystem läuft er nicht von selbst.
- **Schnellzugriff** unter dem Slider: Kacheln zu Firmenprogrammen (Zeiterfassung, ERP, Helpdesk …),
  Sammel-Postfächern (Buchhaltung, Rechnungen, IT-Support – mit Knopf zum Kopieren der Adresse) und wichtigen
  Nummern. Die Kacheln pflegt die Verwaltung.
- **Neuigkeiten** und **Neue Produkte**: der neueste Beitrag groß, die nächsten daneben.
- **Nächste Termine** mit Anzahl der Zusagen.
- **Neu im Team**: Kolleg:innen der letzten 90 Tage – ein Klick zeigt ihren Platz im Lageplan.
- **Zuletzt veröffentlicht** und **Neue Kleinanzeigen**.
- **Jubiläen**: Dienstjubiläen, runde Geburtstage, Ruhestand – rund um das Datum, von HR eingetragen (Kapitel 24).

## 4. Aktuelles und Wissen & Regeln

| Aktuelles | Wissen & Regeln |
|---|---|
| Neuigkeiten | Regeln & Richtlinien |
| Veranstaltungen | Arbeitssicherheit |
| Neue Kolleg:innen | IT-Sicherheit |
| Neue Produkte | Know-how |

- Filter nach Bereich über die Schaltflächen oberhalb der Liste – nur Bereiche, die genutzt werden (nicht
  abgeschaltet, Kapitel 11, und nicht leer).
- **Artikel schreiben** (Redaktion): Bereich, Titel, Kurztext und Text in **Deutsch und Englisch**
  (Text in Markdown mit Vorschau), Titelbild, Fotos und PDFs, *Veröffentlicht* oder *Entwurf*,
  *Im Slider zeigen*. Bei Veranstaltungen zusätzlich Datum, Uhrzeit und Ort.
- **Titelbild** (das Hauptbild des Beitrags, nicht die Fotos im Text): empfohlen **1920 × 1080 px (16:9)**, mindestens
  1600 × 900 px; Wichtiges in die Bildmitte, weil Slider und Kacheln die Ränder abschneiden. Nach dem Hochladen prüft
  Lotse die Größe: *passt*, *zu klein – wirkt unscharf* oder *anderes Seitenverhältnis – wird zugeschnitten*.
- **Veröffentlichen am** (Datum und Uhrzeit): leer = sofort. Ein Datum in der Zukunft **plant** den Artikel – er
  erscheint automatisch zu diesem Zeitpunkt (auch auf der Startseite, im Kalender, bei den Dokumenten und im
  Kalender-Abo). Bis dahin sieht ihn nur die Redaktion, markiert mit *Geplant für …*. Der Knopf heißt dann
  *Einplanen* statt *Veröffentlichen*.
- Entwürfe sieht nur die Redaktion.
- **Lesebestätigung anfordern** (Redaktion): siehe Kapitel 25 – Angemeldete bestätigen am Ende des Beitrags, dass
  sie ihn gelesen und verstanden haben.
- **Versionen** (Historie): Jede Änderung eines Artikels wird als Version gespeichert – mit Datum, Person und
  optionalem **Änderungsgrund** (Feld beim Speichern). Unter dem Artikel steht die Liste der Versionen; ein Klick
  zeigt, was sich gegenüber der Vorversion geändert hat (Titel, Kurztext, Text zeilenweise, hinzugefügte und
  entfernte Dokumente). Die Historie ist so öffentlich wie der Artikel selbst – auch ohne Anmeldung, wenn
  *Lesen ohne Anmeldung* eingeschaltet ist. Die Redaktion kann eine alte Version **wiederherstellen**; der
  vorherige Stand bleibt dabei in der Historie (wichtig für ISO 9001, *Lenkung dokumentierter Information*).

## 5. Veranstaltungen und Kalender

Drei Ansichten unter **Veranstaltungen**:

- **Demnächst**: Karten mit Datum, Uhrzeit, Ort, Kurztext und Teilnehmenden. Mit **„Ich bin dabei“** sagen
  angemeldete Mitarbeitende zu (noch einmal klicken = absagen).
- **Kalender**: Monatsansicht (Woche beginnt Montag). Ein Klick auf einen Tag zeigt dessen Termine.
- **Gesetzliche Feiertage** für **Deutschland, Österreich und die Schweiz** – vom letzten Jahr bis zehn Jahre im
  Voraus, auch die beweglichen (Ostern, Pfingsten, Fronleichnam …). Feiertage sind rot markiert, mit Namen im Tag
  und Länderkürzeln (**DE**, **AT**, **CH**) in der Monatsliste; derselbe Feiertag in mehreren Ländern steht
  nur einmal da. Auch der kleine Kalender auf der Startseite zeigt sie. Welche Länder und ob zusätzlich die
  Feiertage eines Bundeslands bzw. Kantons erscheinen, legt die Verwaltung fest. Die Daten werden lokal
  berechnet (Python-Paket `holidays`) – keine Internetverbindung nötig.
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
- Die Räume zeichnet die Verwaltung im **Raum-Editor** (siehe Kapitel 11). Etagen ohne Räume zeigen ihren
  hochgeladenen Grundriss mit den Plätzen darauf.

## 9. Kleinanzeigen

- Arten: **Biete, Suche, Zu verschenken, Fahrgemeinschaft, Sonstiges** – mit Filter.
- Anzeige mit Titel, Beschreibung, optionalem Preis und **Titelbild** (empfohlen 1200 × 900 px, 4:3, mindestens
  800 × 600 px – mit derselben Größenprüfung); Kontakt über E-Mail oder Durchwahl der Person.
- Erstellen nur nach Anmeldung; löschen dürfen die Person selbst und die Redaktion.
- **Laufzeit 90 Tage**: Eine Anzeige ist 90 Tage sichtbar und verschwindet danach automatisch – aus der Liste,
  von der Startseite und aus der Suche. Das Formular *Anzeige aufgeben* weist darauf hin; bei den eigenen Anzeigen
  steht *sichtbar bis …*. Vorher lässt sich eine Anzeige jederzeit selbst löschen.

## 10. Ideenbox

- **Idee einreichen** mit Thema (*Abläufe, Arbeitsplatz, IT & Software, Sicherheit, Nachhaltigkeit,
  Sonstiges*), einem Satz als Titel und einer Beschreibung.
- **Anonym einreichen** möglich: Der Name wird dann **gar nicht gespeichert** – weder Kolleg:innen noch Redaktion oder
  Verwaltung können sehen, von wem die Idee stammt. Eine anonyme Idee kann deshalb nur die Redaktion löschen.
- **Bewerten mit Sternen**: jede angemeldete Person gibt einer Idee 1 bis 5 Sterne (nicht der eigenen);
  erneuter Klick auf denselben Stern nimmt die Bewertung zurück. Jede Idee zeigt den **Durchschnitt** und die
  Anzahl der Bewertungen. Sortierung nach *Beste Bewertung* (Ideen mit wenigen Bewertungen werden vorsichtig
  gewichtet, damit eine einzelne 5-Sterne-Wertung nicht alles überholt) oder *Neueste*.
- **Status** als Ablauf: *Neu → In Prüfung → Geplant → Umgesetzt* oder *Abgelehnt*, mit **Antwort** der
  Redaktion und Datum.

## 11. Einstellungen (Verwaltung)

Der Menüpunkt **Einstellungen** (früher *Verwaltung*) bündelt alles, was Rechte braucht. Seine Bereiche stehen als **senkrechtes Menü links** neben dem Inhalt (auf dem Handy als Zeile zum
Wischen); jede Person sieht nur die Bereiche, für die sie Rechte hat. Unter **Allgemein** sind *Windows-Anmeldung
(SSO)* und *LDAP / Active Directory* eingeklappt (mit Anzeige *Ein/Aus*) und öffnen sich per Klick; das
**Farbschema** steht als letzter Abschnitt von *Allgemein*.

Nur für Administratoren, über **Einstellungen** in der Navigation:

- **Benutzer**: anlegen, bearbeiten, Rolle, Abteilung (Auswahl aus der Liste), Position, Durchwahl,
  Eintrittsdatum, Platz, aktiv / im Verzeichnis sichtbar, Foto hochladen (Klick auf das Bild), löschen.
  Jede **E-Mail-Adresse** darf nur einmal vorkommen. Bei LDAP-Konten sind Name, E-Mail, Abteilung,
  Position und Durchwahl gesperrt (*aus LDAP*) – sie werden im Verzeichnis gepflegt.
  Die Liste zeigt je Person Abteilung, Rolle, Herkunft (lokal/LDAP) und **Niederlassung**.
- **Filter wie in Excel**: In den Spaltenköpfen *Abteilung*, *Rolle*, *Herkunft* und *Niederlassung* öffnet der Trichter
  eine Liste der vorkommenden Werte mit Anzahl und Häkchen (*(Alle auswählen)*, Suche bei langen Listen, *(Leer)* für
  Personen ohne Wert, *OK* / *Filter löschen*). Filter mehrerer Spalten wirken zusammen, jede Liste zeigt nur die Werte,
  die nach den anderen Filtern übrig sind; ein gefilterter Spaltenkopf ist farbig. Dazu das Suchfeld (Name, Benutzername,
  E-Mail, Abteilung, Position, Niederlassung), die Anzeige *x von y* und *Filter zurücksetzen*.
- **Mehrere Personen auf einmal ändern**: Häkchen setzen (oder *alle angezeigten* auswählen). Ab **zwei** ausgewählten
  Personen erscheint eine Leiste, um **Niederlassung**, **Abteilung** und – nur Administratoren – **Rolle** für alle
  zugleich zu setzen (*nicht ändern* lässt ein Feld unverändert). Es gelten dieselben Regeln wie beim Bearbeiten einer
  Person; wer nicht geändert werden kann, wird übersprungen und mit Grund genannt: Feld kommt aus LDAP, Konto mit
  besonderen Rechten (nur Administratoren), eigene Administrator-Rolle.
- **Rollen & Rechte** (nur Administrator): Übersicht, welche Rolle welche Rechte hat; darunter alle Personen mit
  Rolle und zusätzlichen Rechten zum Anklicken (Filter *Nur Personen mit Rechten*).
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
- **Schulungen**: siehe [Schulungen und Pflichtlektüre](#13-schulungen-und-pflichtlektüre).
- **Schnellzugriff**: Kacheln der Startseite anlegen, bearbeiten, ausblenden und sortieren – Titel und
  Untertitel Deutsch/Englisch, **Link, E-Mail-Adresse oder Telefon** (`https://…`, `buchhaltung@firma.de`,
  `tel:100` oder ein Pfad im Portal wie `/documents`), Symbol und Farbe, mit Vorschau. Andere Adressarten
  (z. B. `javascript:`) werden abgelehnt.
- **Einstellungen**: Firmenname, *Lesen ohne Anmeldung*, **Bereiche** (welche Rubriken die Firma nutzt – ein
  abgeschalteter Bereich wie *Neue Produkte* wird Autor:innen nicht mehr angeboten und erscheint nicht als Filter;
  vorhandene Beiträge bleiben lesbar; *Neuigkeiten* und *Veranstaltungen* sind immer an), **Feiertage im Kalender**
  (je Land aus/landesweit oder inklusive eines Bundeslands/Kantons, z. B. Niedersachsen oder Zürich), LDAP (siehe unten).
- **Jubiläen**: siehe Kapitel 24. **Statistik**: siehe Kapitel 26.

## 12. LDAP / Active Directory

Unter **Einstellungen → Allgemein → LDAP / Active Directory**:

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
- **LDAP ist führend.** Personen werden über den **Benutzernamen** und die **E-Mail-Adresse** erkannt – nie über
  den Namen (der unterschiedlich geschrieben sein kann). Ein lokales Konto mit derselben E-Mail-Adresse wird
  beim ersten Anmelden **verknüpft** statt doppelt angelegt (Platz, Schulungen, Bewertungen bleiben). Konten
  mit besonderen Rechten (z. B. ein lokaler Administrator) werden **nie automatisch** verknüpft.
- **LDAP-Abgleich** (Einstellungen → Benutzer, nur Administrator): liest das Verzeichnis und zeigt **vorher**, was
  sich ändern würde – zum Abhaken:
  - *Neue Personen* aus dem Verzeichnis anlegen;
  - *Bestehende Konten verknüpfen* (gleiche E-Mail-Adresse oder gleicher Benutzername);
  - *Daten aktualisieren* (Name, Abteilung, Position …) und wieder aktiv setzen;
  - *Nicht mehr im Verzeichnis*: LDAP-Konten **deaktivieren** (nicht löschen);
  - *Abteilungen*: neue aus dem Verzeichnis werden angelegt; Abteilungen, die es dort nicht gibt, können
    entfernt werden, sobald niemand mehr darin ist.
  Doppelte E-Mail-Adressen im Verzeichnis werden angezeigt und nicht angelegt.
- **Abteilungen aus LDAP** lassen sich in Lotse nicht umbenennen, solange *Abteilungen aus LDAP übernehmen*
  an ist – so entsteht keine Mischung aus Verzeichnis- und Handpflege.
- Eine Rolle, die der Administrator in Lotse vergeben hat, bleibt beim Anmelden erhalten. Rollen aus den
  LDAP-Gruppen (Administratoren, Redaktion) werden bei jeder Anmeldung neu geprüft und auch wieder entzogen.
- **Windows-Anmeldung (SSO)** – *Einstellungen → Allgemein → Windows-Anmeldung*, zwei Arten:
  - **Kerberos direkt (ohne IIS)** – Standard: Lotse prüft das Kerberos-Ticket des Browsers selbst
    (*Negotiate*; fällt der Browser auf NTLM zurück, klappt das ebenfalls). Kein Webserver davor, ein Prozess.
    Felder: *Adresse des Portals* (wie im SPN, z. B. `intranet.firma.local`) und *Keytab-Datei* (nur Linux).
    Voraussetzung: SPN `HTTP/<Adresse>` im AD. Einrichtung mit Skript: [`deploy/kerberos/`](../deploy/kerberos/README.md).
  - **Über einen Webserver**: ein vorgeschalteter Webserver mit Windows-Authentifizierung (z. B. **IIS**) gibt den
    angemeldeten Windows-Benutzer in einem Header (Standard `X-Remote-User`) weiter. Lotse glaubt diesem Header
    **nur** von den eingetragenen Adressen (*Vertrauenswürdige Webserver*, z. B. `127.0.0.1`). Einrichtung: README.
  In beiden Fällen: aus `FIRMA\m.mustermann` bzw. `m.mustermann@FIRMA.LOCAL` wird der Benutzername, die Person wird
  im LDAP gesucht und ihre Daten aktualisiert. Nur LDAP-Konten melden sich so an; lokale Konten (z. B. der
  Notfall-Administrator) immer mit Passwort. Damit Browser das Windows-Konto ohne Rückfrage weitergeben, wird die
  Adresse per Gruppenrichtlinie freigegeben (Edge/Chrome: Zone *Lokales Intranet*; Firefox: SPNEGO-Richtlinie;
  Safari: Mac in der Domäne).
- Bei einer **IP-Adresse** muss das Zertifikat des Servers diese IP enthalten – sonst den Hostnamen eintragen.
- Lokale Konten (z. B. ein Notfall-Administrator) funktionieren weiterhin.

## 13. Schulungen und Pflichtlektüre

Unterweisungen, Schulungen und Pflichtlektüre (z. B. Datenschutz, KI-Richtlinie, Stapler, Brandschutz) sowie
allgemeine Anleitungen. Es gibt zwei Arten der Sichtbarkeit, frei kombinierbar:

- **Für alle freiwillig verfügbar** – allgemeine Schulungen (z. B. *Besprechungsraum buchen*, *IT-Probleme melden*):
  jede angemeldete Person sieht sie unter **Freiwillig** und kann sie bestätigen, ohne Pflicht und ohne Frist.
- **Pflicht für** bestimmte Personen – Fachschulungen: nur die Zugewiesenen sehen sie; für alle anderen sind sie
  unsichtbar (auch nicht über die Adresse erreichbar).

**Für Mitarbeitende** (Navigation **Schulungen**, nur angemeldet):

- Reiter **Offen** (Pflicht), **Freiwillig** (für alle) und **Erledigt**, mit Fälligkeitsdatum; überfällige
  Schulungen sind rot markiert. Der Hinweis auf der Startseite zählt nur Pflichtschulungen.
- Eine Schulung enthält eine Beschreibung und **Unterlagen**: PDFs (öffnen im Portal), **Videos** (MP4/WebM,
  direkt abspielbar), Bilder und Links.
- **E-Mail**: Wer einer Pflichtschulung zugewiesen wird, bekommt automatisch eine E-Mail (siehe Kapitel 16).
- Am Ende: **„Ich habe die Schulung durchgearbeitet und verstanden“** – die Bestätigung wird mit Datum und
  Uhrzeit gespeichert.
- Startet die Verwaltung eine **neue Runde** (z. B. jährliche Unterweisung), steht die Schulung wieder unter
  *Offen* mit dem Hinweis *Neue Runde – bitte erneut bestätigen*.
- **Nachweis als PDF**: nach der Bestätigung lässt sich ein Schulungsnachweis herunterladen (eine DIN-A4-Seite) – Person, Abteilung,
  Schulung, Runde, Unterlagen, Zeitpunkt der Bestätigung, die Erklärung „durchgearbeitet und verstanden“ und zwei
  Unterschriftenzeilen (Mitarbeiter:in, Vorgesetzte:r aus dem Organigramm) – zum Ausdrucken, Unterschreiben und
  Weitergeben, auf Deutsch oder Englisch je nach Oberflächensprache. In der **Auswertung** lädt die Verwaltung den
  Nachweis jeder Person herunter.

**Für die Verwaltung** (Einstellungen → **Schulungen**):

- **Neue Schulung** (auch direkt aus *Meine Schulungen* oder dem Benutzermenü): großes Fenster mit Titel und
  Beschreibung (Deutsch/Englisch) im **Texteditor** – Überschriften H1–H4, fett, kursiv, unterstrichen,
  durchgestrichen, Textfarbe, Listen, Zitat, Trennlinie, Link; rechts *Aktiv*, *Fällig bis*, Zuweisung und Unterlagen.
- **Für alle Mitarbeitenden freiwillig verfügbar** (Häkchen) – und/oder **Pflicht für**: *Alle Mitarbeitenden*,
  **Abteilungen**, **Gruppen**, **Funktionen/Positionen** (Stellenbezeichnung aus dem Profil bzw. LDAP, z. B.
  *Staplerfahrer*) und/oder **einzelne Personen** – beliebig kombinierbar. Wer neu in eine Abteilung, Gruppe oder
  Position kommt, bekommt die Schulung automatisch.
- **Gruppen** (unten auf der Seite) für Zuweisungen, die nicht an Abteilungen hängen, z. B.
  *Geschäftsführung*, *Ersthelfer*, *Staplerfahrer*.
- **Unterlagen**: Dateien hineinziehen oder auswählen (PDF bis 25 MB, Video MP4/WebM bis 500 MB, Bilder) oder
  Links hinzufügen – auch schon vor dem ersten Speichern; sie werden beim Anlegen hochgeladen.
- **Auswertung**: Fortschritt (*x von y erledigt*), Listen *Noch offen*, *Erledigt* und *Freiwillig erledigt* mit Datum,
  **CSV-Export** als Nachweis für Audits, **Neue Runde starten** (alle müssen erneut bestätigen).
- **Sicherheit**: Die Dateien liegen **nicht** im öffentlichen Upload-Ordner, sondern in `backend/data/trainings/`
  und werden nur über **zeitlich begrenzte, signierte Links** (2 Stunden) an zugewiesene Personen ausgeliefert.
  Wer eine Schulung nicht zugewiesen hat, sieht sie nicht – auch nicht über die Adresse.

## 14. Umfragen

- **Navigation → Umfragen**: laufende Umfragen oben, darunter die beendeten mit Ergebnis. Die neueste laufende
  Umfrage steht zusätzlich auf der **Startseite**; die persönliche Begrüßung erinnert an Umfragen ohne eigene Stimme.
- **Abstimmen** nur angemeldet, **eine Stimme pro Person**. Solange die Umfrage läuft, lässt sich die Antwort
  ändern oder zurückziehen.
- **Anonym**: Gespeichert wird nur, *dass* jemand abgestimmt hat (damit niemand doppelt abstimmt) – angezeigt
  werden ausschließlich die Summen je Antwort. Auch Redaktion und Administratoren sehen keine Einzelstimmen.
- **Wer wird gefragt?** Eine Umfrage gilt für *Alle* oder nur für gewählte **Abteilungen** und/oder **Niederlassungen**
  (z. B. *Vertrieb* und *München*). Dann sehen nur diese Personen sie (auf der Startseite, in der Liste, in der Suche
  und in der Begrüßung) und nur sie dürfen abstimmen; die Redaktion sieht alles. Nicht Angemeldete sehen nur Umfragen für alle.
- **Anlegen** (Recht *Umfragen erstellen* – Moderator:in, Redaktion, Administrator): Frage (DE, optional EN),
  Erläuterung, 2–12 Antworten (je DE/EN), **Mehrfachauswahl**, **Endet am** (optional) und wann das
  **Ergebnis sichtbar** ist: *nach der eigenen Stimme*, *immer* oder *erst nach dem Ende*.
- **Bearbeiten**: Sobald Stimmen da sind, lassen sich Antworten nur noch umbenennen (nicht hinzufügen oder
  entfernen), damit keine Stimme einer anderen Antwort zugeordnet wird. *Umfrage jetzt beenden* schließt sie sofort.
- Umfragen erscheinen auch in der **Suche**.

## 15. Organigramm

- **Mitarbeitende → Organigramm**: wer wem unterstellt ist. Oben die Leitung, darunter die direkt Unterstellten
  nebeneinander, tiefere Ebenen als Liste darunter. Farbiger Streifen = Abteilungsfarbe.
- **Äste ein- und ausklappen** („3 direkt unterstellt“), **an Breite anpassen** (Standard) oder mit **− / +** zoomen.
- Klick auf eine Person zeigt ihren **Platz im Lageplan**. Suche und Abteilungsfilter heben passende Personen hervor.
- **Woher die Daten kommen**: bei LDAP aus dem Attribut **`manager`** (in den LDAP-Einstellungen änderbar) – beim
  Anmelden und beim LDAP-Abgleich; der Abgleich zeigt geänderte Vorgesetzte in der Vorschau. Ohne LDAP trägt die
  Verwaltung bei der Person **Vorgesetzte:r** ein. Kreise (A über B über A) werden abgelehnt.
- Personen ohne Vorgesetzte und ohne Team stehen unter *Ohne Zuordnung*.

## 16. Benachrichtigungen (E-Mail, Teams)

- **Einstellungen → Benachrichtigungen** (eigener Menüpunkt, direkt nach *Allgemein*, das ganz oben steht).
- **Einschalten** (nur Administratoren): Adresse des Intranets
  (für Links), SMTP-Server, Port, Verschlüsselung (STARTTLS, SSL/TLS oder keine), Benutzer, Passwort, Absender.
  **Test-Mail senden** prüft die Einstellungen sofort. Passwort und Teams-Adresse werden nie angezeigt und liegen
  in der Datenbank verschlüsselt.
- **Versand**: *Sofort je Beitrag* (Standard) oder **wöchentliche Zusammenfassung** – dann geht einmal pro Woche
  (Wochentag und Uhrzeit einstellbar) eine Mail „Was war diese Woche“ mit allen neuen Beiträgen und Terminen an alle,
  die Mails zu neuen Beiträgen bekommen; jede Person sieht nur, was sie sehen darf. Gab es nichts Neues, kommt keine
  Mail. Teams bekommt Beiträge weiterhin sofort; Schulungs- und Ideen-Mails bleiben unverändert.
- **Neue Artikel und Termine**: sobald ein Beitrag sichtbar wird (auch geplante Beiträge zur geplanten Zeit) bekommen
  alle eine E-Mail, die ihn sehen dürfen und die Benachrichtigung nicht abgeschaltet haben. Beiträge, die vor dem
  Einschalten erschienen sind, werden nicht nachträglich verschickt.
- **Ideen**: Ändert die Redaktion Status oder Antwort, bekommt die Einreicherin / der Einreicher eine E-Mail
  (bei anonymen Ideen nicht – dort ist niemand gespeichert).
- **Schulungen**: Jede Person, der eine **Pflichtschulung** zugewiesen ist – einzeln, über Gruppe, Abteilung,
  Niederlassung, Position, *Neue Kolleg:innen* oder *Alle* – bekommt **eine E-Mail**, dass die Schulung auf sie wartet
  (mit Fälligkeit und Knopf *Zur Schulung*). Lotse prüft das jede Minute: Wer später in eine Gruppe oder Abteilung kommt,
  bekommt die Mail dann auch; bei einer **neuen Runde** alle, die erneut bestätigen müssen (mit Hinweis *Neue Runde*).
  Keine Mail für freiwillige Schulungen, für inaktive Schulungen oder an Personen, die diese Runde schon bestätigt haben;
  jede Person bekommt pro Schulung und Runde höchstens eine Mail. Pflicht – daher **nicht abbestellbar**. Beim ersten
  Einschalten der E-Mail-Benachrichtigungen werden alle bereits offenen Pflichtschulungen einmal gemeldet.
- **Wer darf die Texte ändern?** Administratoren und alle mit dem Recht **E-Mail-Texte** – die Rolle *Personal (HR)*
  hat es automatisch, anderen kann der Administrator es einzeln geben. Sie sehen unter *Benachrichtigungen* nur eine
  verkleinerte Seite mit *Mail anpassen* – **keine** Postfach-Zugangsdaten, keinen Absender, kein Teams. Test-Mails gehen bei
  ihnen immer an die eigene Adresse. Hinweis im Editor: Änderungen gelten sofort **für das ganze Portal**.
- **Mail anpassen**: Betreff und Text der vier Mails (*Neuer Beitrag / Termin*, *Idee: neuer Status*,
  *Schulung zugewiesen*, *Wöchentliche Zusammenfassung*) frei gestalten – kleiner Editor (fett, kursiv, Überschrift, Listen,
  Links) mit **Platzhaltern**, die per Klick eingefügt werden: `{article}` (Titel), `{summary}`, `{category}`, `{when}`
  (Datum/Ort bei Terminen), `{author}`, `{idea}`, `{status}`, `{answer}`, `{training}`, `{due}` (Fälligkeit), `{round}` (Hinweis bei neuer Runde),
  `{articles}` (Liste der Beiträge der Woche), `{count}`, `{period}`, `{name}`, `{first_name}`, `{company}`, `{link}`,
  `{button}`. **Vorschau** mit Beispieldaten, **Test senden**, **Standardtext** stellt das Original wieder her.
  Kopfzeile und Abbestell-Hinweis werden immer ergänzt; Skripte und fremde Formatierungen werden entfernt.
- **Microsoft Teams**: Webhook-Adresse eines Kanals (in Teams: Kanal → *Workflows* → *Bei Empfang einer
  Webhookanforderung in einem Kanal posten*). Neue Beiträge erscheinen dort als Karte mit Knopf *Im Intranet öffnen*.
- **Abbestellen**: jede Person im **Profil → Benachrichtigungen** (*Neue Artikel und Termine*, *Neuigkeiten zu meinen
  Ideen*). Standard: eingeschaltet.

## 17. Startseite gestalten

- **Einstellungen → Startseite** (Redaktion und Administratoren). Die Startseite besteht aus Blöcken:
  *Slider*, *Schnellzugriff*, *Was kommt*, *Was gibt’s Neues*, *Neu im Team*, *So war’s*,
  *Frisch erschienen*, *Umfrage*, *Kleinanzeigen*, *Jubiläen*, *Stellenangebote*, *Social Media*. Ein Block, den eine neue Version
  mitbringt, erscheint an seiner Standardstelle (z. B. *Jubiläen* vor *Social Media*), die eigene Reihenfolge bleibt.
- Blöcke **ziehen** (oder mit den Pfeilen verschieben), mit dem Auge **ein-/ausblenden**, Breite **Breit** oder
  **Halb** wählen. Zwei halbe Blöcke stehen nebeneinander; ein einzelner halber Block wird automatisch breit – so
  bleibt die Seite ohne Lücken. Rechts zeigt die **Vorschau** die Anordnung.
- **Vorlagen** mit einem Klick: *Standard*, *Nachrichten zuerst*, *Bilder & Termine*, *Kompakt (Werk/Lager)* –
  danach nach Belieben anpassen und speichern. *Standard wiederherstellen* setzt alles zurück.
- Leere Blöcke (keine Umfrage, keine Jubiläen im Zeitraum, keine offenen Stellen)
  werden übersprungen.
- **Zurück im Browser** führt wieder an die Stelle, an der man auf der Seite war.
- **Farbschema** (nur Admin, *Einstellungen → Allgemein*, letzter Abschnitt): *Hafen* (Marineblau, Eisblau, Rot; Standard), *Signal* (Rot-Orange),
  *Meer* (Türkis), *Indigo*, *Nordsee* (Kobalt), *Fjord* (Petrol), *Azur* (Himmelblau), *Marine* (Dunkelblau). Ein Klick zeigt
  die Vorschau, *Speichern* übernimmt es für alle; jedes Schema hat eigene Töne für den Dunkelmodus.
  Jede Person kann im **Profil → Meine Farben** ein eigenes Schema wählen (gespeichert am Konto, gilt auf jedem Gerät)
  oder beim *Firmenstandard* bleiben.

## 18. Niederlassungen

- **Einstellungen → Niederlassungen**: Standorte anlegen, umbenennen, löschen (Recht *Personen & Abteilungen*).
- **Personen** bekommen unter *Einstellungen → Benutzer* eine Niederlassung – oder aus LDAP (Attribut
  `physicalDeliveryOfficeName`, in den LDAP-Einstellungen änderbar; unbekannte Standorte werden angelegt).
- **Artikel und Termine**: im Editor unter *Sichtbar für* „Alle Niederlassungen“ oder einzelne wählen. Begrenzte
  Beiträge tragen das Zeichen *Nur München* o. ä.
- **Wer sieht was?** Beiträge für alle: alle. Begrenzte Beiträge: Personen dieser Niederlassung, Personen **ohne**
  Niederlassung (z. B. Zentrale) und die Redaktion. Nicht angemeldete Besucher sehen nur Beiträge für alle. Das gilt
  überall – Startseite, Listen, Kalender, Dokumente, Fotos, Suche, direkte Links, Zusagen und E-Mail-Benachrichtigungen;
  in den Teams-Kanal gehen nur Beiträge für alle.
- **Schulungen** lassen sich zusätzlich einer ganzen Niederlassung zuweisen.

## 19. Beiträge oben anheften

- Im Editor (Redaktion): **Oben anheften**, optional **bis** zu einem Datum. Angeheftete Beiträge stehen ganz oben
  in **Aktuelles** (auch wenn sie z. B. unter *Regeln* abgelegt sind), in ihrer eigenen Liste und auf der Startseite
  in **Was gibt’s Neues** (Zeichen *angepinnt*).
- Gedacht für Dinge, die lange sichtbar sein sollen: Jahresplanung, Inventur, Audits, Betriebsferien – damit alle
  ihren Urlaub danach planen können. Nach dem Datum verschwindet der Beitrag automatisch aus dem Block.

## 20. Aussehen, Sprache und Navigation

- **Oben links** Datum und Begrüßung (*Guten Morgen, Mehmet*), **oben rechts** die **Suche** (Lupe oder *Strg + K*,
  ein kleines Fenster mit Treffern beim Tippen), Sprache, Hell/Dunkel, die **Glocke** und das Konto.
- **Glocke**: alles, was die Person betrifft – offene Schulungen (überfällige rot), Beiträge mit offener
  Lesebestätigung, neue Umfragen ohne eigene Stimme, Antworten auf eigene Ideen, Termine von heute. Die Zahl zeigt,
  wie viele Punkte offen sind.
- **Menü links** lässt sich unten mit dem Pfeil **einklappen** (nur Symbole) und wieder ausklappen; das bleibt gespeichert.
- **Fußzeile**: © Jahr und Firmenname, ein freier Text aus *Einstellungen → Allgemein* (z. B. Anschrift,
  Handelsregister, Datenschutzhinweis), Links zu Dokumenten, Mitarbeitenden, Ideen und Profil sowie die Symbole der
  Social-Media-Seiten.
- **Empfohlene Bildgrößen** stehen an jedem Upload: Titelbild 1920 × 1080 px, Kleinanzeige 1200 × 900 px, Profilfoto
  quadratisch ab 400 × 400 px, Anmeldebild 1920 × 1080 px, Grundriss als SVG oder ab 2000 px Breite.
- **Farbschema**: siehe Abschnitt 17 – für alle (Admin) oder pro Person im Profil.
- **Sprache**: Die Umschaltung betrifft die **Oberfläche** (Menüs, Knöpfe, Hinweise). **Inhalte bleiben in der
  Sprache, in der sie geschrieben wurden** – niemand muss Artikel oder Dokumente übersetzen. Wer möchte, kann im
  Editor eine *Übersetzung hinzufügen (optional)*; sie wird dann bei englischer Oberfläche gezeigt, sonst das Original.
  Umfragen behalten ihre optionalen zweisprachigen Felder. Weitere Oberflächensprachen: in `frontend/src/lib/i18n.jsx`
  ein Wörterbuch ergänzen (z. B. `pl: {...}`) – es erscheint automatisch in der Umschaltung.

## 21. Personal (HR) und neue Kolleg:innen

- **Rolle Personal (HR)**: darf Mitarbeitenden-Karten bearbeiten und anlegen, Schulungen erstellen und zuweisen,
  **Jubiläen** eintragen (Kapitel 24), eigene Beiträge schreiben und die **E-Mail-Texte** anpassen (z. B. die Mail zu
  zugewiesenen Schulungen). Rollen, Rechte und Einstellungen (LDAP, SMTP …) bleiben dem Administrator vorbehalten.
- **Neue Kolleg:innen** erkennt Lotse am **Eintrittsdatum** (Mitarbeitenden-Karte). Bei LDAP wird es beim ersten
  Abgleich gefüllt: aus dem Attribut *Eintrittsdatum* (Standard `whenCreated`, einstellbar, z. B. ein eigenes
  Feld für das Einstellungsdatum), sonst mit dem Tag, an dem das Konto in Lotse erscheint. Ein gesetztes Datum wird
  nie überschrieben und lässt sich von Hand korrigieren.
- **Zuordnung beim LDAP-Abgleich** – nie über den Namen: zuerst über die feste Verzeichnis-ID (**objectGUID**, bleibt
  bei Namensänderung, neuer Mail-Domain oder neuem Benutzernamen gleich), dann über den Benutzernamen, dann über die
  E-Mail-Adresse. So entsteht bei einer Heirat oder Domainumstellung kein zweites Konto.
- **Pflichtschulungen zum Start**: Beim Zuweisen einer Schulung *Neue Kolleg:innen* wählen – sie gilt dann für alle in
  ihren ersten 90 Tagen ab Eintrittsdatum, auch für alle, die später dazukommen. Erscheint in der Glocke und unter
  *Schulungen*.

## 22. Browser und Geräte

- Lotse läuft in **Microsoft Edge**, **Google Chrome**, **Mozilla Firefox** und **Safari** (macOS, iPhone, iPad) –
  jeweils ab Chrome/Edge 111, Firefox 128 und Safari 16.4 (Grenze der verwendeten Gestaltung, Tailwind CSS 4).
  Ältere Browser werden nicht unterstützt.
- Alles funktioniert in allen vier Browsern gleich: Ziehen der Startseiten-Blöcke, Lageplan mit Zoom, Fenster,
  Suche, Kalender, Datums- und Farbfelder, Videos.
- **Bekannte Grenzen**: Auf iPhone/iPad zeigt Safari PDFs im eingebauten Betrachter nur die erste Seite – *Download*
  öffnet das ganze Dokument. Schulungsvideos als **MP4** hochladen; `.mov` vom iPhone spielen Chrome und Firefox
  nicht immer ab. Firefox zeigt schmalere, systemeigene Bildlaufleisten.
- **Handy**: Menü als ausklappbare Leiste, alle Seiten ohne seitliches Scrollen.
- **Schriften** (Hanken Grotesk, IBM Plex Mono) liefert Lotse selbst aus – beim Öffnen der Seite geht keine Anfrage
  an Google oder einen anderen Dienst; das Portal funktioniert auch ohne Internetzugang.

## 23. Social Media

- **Einrichten** (Administrator): *Einstellungen → Allgemein → Social Media* – Adressen der Firmenseiten bei
  **Facebook**, **LinkedIn** und **Instagram** (vollständige Adresse, z. B. `https://www.linkedin.com/company/…`; andere
  Adressen werden abgelehnt).
- **Startseite**: Block *Folgen Sie uns* mit je einer Karte pro Netzwerk (öffnet die Seite in einem neuen Tab). Der Block
  erscheint, sobald mindestens eine Adresse eingetragen ist, und lässt sich unter *Startseite gestalten* verschieben oder
  ausblenden. In der **Fußzeile** stehen die Symbole.
- Es werden nur **Links** gezeigt, keine eingebetteten Beitragslisten.

## 24. Jubiläen

- **Einstellungen → Jubiläen** (Recht *Jubiläen pflegen* – Personal (HR) und Administratoren): Dienstjubiläen, runde
  Geburtstage, Ruhestand oder andere Anlässe. Jeder Eintrag wird **von Hand** angelegt – nichts wird aus
  Eintrittsdatum oder Geburtsdatum berechnet; was öffentlich wird, entscheiden Menschen.
- Eintrag: **Person** aus dem Verzeichnis (mit Foto und Link ins Verzeichnis) oder ein **Name** ohne Konto (z. B.
  Ehemalige), **Anlass**, **Jahre** (10 → „10 Jahre im Unternehmen“, 50 → „50. Geburtstag“), **Datum**, optional ein
  kurzer Text auf Deutsch und Englisch. Die Liste zeigt *Demnächst* und *Vergangene*.
- **Startseite**: der Block *Jubiläen* (standardmäßig vor *Social Media*, unter *Startseite gestalten* verschiebbar)
  zeigt Einträge von etwa sechs Wochen vor bis eine Woche nach dem Datum, nach Datum sortiert; der heutige Tag ist
  farbig hervorgehoben. Ohne Einträge im Zeitraum fehlt der Block.
- Demodaten: `python seed.py --jubilees`.

## 25. Lesebestätigung

- Für Beiträge, die alle gelesen haben sollen (Richtlinien, Regeln), ohne gleich eine Schulung anzulegen.
- **Redaktion**: im Editor **Lesebestätigung anfordern** ankreuzen. Der Beitrag trägt dann das Zeichen
  *Lesebestätigung*; unter dem Text sehen Redaktion und Administratoren **Lesebestätigungen**: *x von y bestätigt*,
  wer wann bestätigt hat, wer noch offen ist (alle aktiven Personen im Verzeichnis, die den Beitrag sehen dürfen),
  **CSV-Export**.
- **Mitarbeitende**: am Ende des Beitrags **„Ich habe diesen Beitrag gelesen und verstanden“** – die Bestätigung wird
  mit Datum und Uhrzeit gespeichert. Offene Bestätigungen stehen in der **Glocke**. Nicht Angemeldete sehen den Hinweis *Zum Bestätigen anmelden*.
- Der Unterschied zu Schulungen: keine Zuweisung, keine Frist, keine Runden, kein PDF-Nachweis – dafür ein Klick.
  Für Unterweisungen mit Nachweispflicht bleiben die Schulungen (Kapitel 13).

## 26. Statistik für die Redaktion

- **Einstellungen → Statistik** (Redaktion und Administratoren). Zeitraum 7, 30, 90 oder 365 Tage.
- **Aufrufe**: wie oft Beiträge geöffnet wurden – gesamt, im Zeitraum, je Tag als Balken – und die **meistgelesenen
  Beiträge**. Gezählt wird je Beitrag und Tag nur die Anzahl, **nie wer** gelesen hat. Entwürfe zählen nicht.
- **Suchen ohne Treffer**: Begriffe, die gesucht wurden, aber nichts gefunden haben (von der Ergebnisseite und aus der
  Suche beim Tippen, wenn nach anderthalb Sekunden noch nichts gefunden ist) – ein Hinweis, welche Inhalte fehlen oder
  anders heißen. Dazu die **häufigsten Suchen**. Gespeichert werden nur Begriff und Zähler, keine Person; die Liste
  ist auf 5000 Begriffe begrenzt.

## 27. Betrieb: Aufräumen und Passwörter

- **Verwaiste Dateien**: Bilder gelöschter Beiträge und Kleinanzeigen, ersetzte Profilfotos und Grundrisse oder
  abgebrochene Uploads räumt Lotse **einmal pro Nacht (3 Uhr)** weg. Eine Datei gilt erst dann als verwaist, wenn
  **kein Text in der gesamten Datenbank** sie erwähnt – auch keine ältere Beitragsversion, kein von Hand eingefügter
  Link in einem Beitrag, einer Schulung oder einer Einstellung. Dateien, die jünger als 24 Stunden sind, bleiben
  immer liegen (sie können zu einem Beitrag gehören, der gerade geschrieben wird). Schulungsunterlagen werden nur
  gelöscht, wenn keine Schulung sie mehr verwendet.
- Von Hand (Ordner `backend`, aktivierte `.venv`): `python -m app.housekeeping --dry-run` listet nur auf,
  ohne `--dry-run` wird gelöscht.
- **Passwörter in der Datenbank**: LDAP-Bind-Passwort, SMTP-Passwort und die Teams-Webhook-Adresse werden
  **verschlüsselt** gespeichert (Schlüssel aus `backend/data/.secret_key`) und nie an den Browser zurückgegeben.
  Ältere, noch unverschlüsselte Einträge werden beim ersten Start automatisch verschlüsselt. Wer die Datenbank
  sichert, sichert den Schlüssel mit – ohne ihn müssen die Passwörter neu eingegeben werden.

## 28. Stellenangebote (interne Ausschreibungen)

- **Einschalten**: *Einstellungen → Allgemein → Zusatzfunktionen → Stellenangebote*. Standardmäßig **aus**.
  Eingeschaltet erscheint **Stellenangebote** im Menü links (nach *Mitarbeitende*) und auf der Startseite ein Block
  **Stellenangebote** – standardmäßig direkt **unter den Jubiläen**, auch in bestehenden Startseiten-Layouts; unter
  *Startseite gestalten* lässt er sich verschieben oder ausblenden. Ausgeschaltet verschwinden Seite, Menüeintrag und
  Block sofort; die eingetragenen Stellen bleiben gespeichert.
- **Wer pflegt**: Personen mit dem Recht **Stellenangebote pflegen** – die Rolle **Personal (HR)** hat es, der
  Administrator kann es einzelnen Personen zusätzlich geben. Sie sehen auf der Seite **Neue Stelle** und können jede
  Stelle bearbeiten oder löschen.
- **Eine Stelle hat**: Bezeichnung (Deutsch, optional Englisch), Art (*Vollzeit, Teilzeit, Minijob, Ausbildung,
  Praktikum, Sonstiges*), Arbeitszeit und Beginn als freien Text (z. B. *30 Std./Woche*, *ab sofort*), Abteilung,
  Niederlassung, **Bewerbung bis** (leer = bis die Stelle geschlossen wird), **Ansprechperson** aus dem Verzeichnis
  und eine Beschreibung im Texteditor (Deutsch/Englisch).
- **Sichtbar** ist eine Stelle, solange *Veröffentlicht* an ist und *Bewerbung bis* nicht vorbei ist. Danach
  verschwindet sie für alle anderen von selbst. Wer Stellen pflegt, sieht darunter **Entwürfe, besetzte und
  abgelaufene Stellen** mit Kennzeichen und kann sie wieder öffnen.
- **Bewerben**: Ein Klick auf eine Stelle zeigt die Beschreibung und die Ansprechperson mit **Per E-Mail bewerben**
  (Betreff *Interne Bewerbung: …* ist schon ausgefüllt) und Durchwahl. Lotse **speichert keine Bewerbungen** – sie
  gehen direkt an die Ansprechperson und bleiben vertraulich.
- Demodaten: `python seed.py --jobs` (drei Stellen, schaltet die Funktion ein).
