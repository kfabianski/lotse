# Windows-Anmeldung mit Kerberos – ohne IIS

Lotse prüft das Kerberos-Ticket des Browsers selbst (HTTP *Negotiate*, wie IIS es auch tut). Es gibt **keinen
vorgeschalteten Webserver**: ein Prozess liefert Oberfläche, API und die Anmeldung aus.

Ablauf bei jedem Öffnen der Seite:

1. Die Oberfläche ruft `/api/auth/sso` auf. Lotse antwortet `401 WWW-Authenticate: Negotiate`.
2. Der Browser holt beim Domänencontroller ein Ticket für `HTTP/<Adresse des Portals>` und schickt es mit –
   ohne Rückfrage, wenn die Adresse freigegeben ist (siehe unten).
3. Lotse prüft das Ticket (Windows: SSPI, Linux: Keytab), erhält `FIRMA\m.mustermann`, sucht die Person im
   LDAP/AD und meldet sie an. Eine gespeicherte Sitzung einer anderen Person (gemeinsamer PC) wird ersetzt.

Klappt Kerberos nicht (Gerät nicht in der Domäne, Portal per IP-Adresse geöffnet), versucht Windows NTLM; das
unterstützt Lotse ebenfalls. Klappt beides nicht, bleibt die Anmeldung mit Benutzername und Passwort.

## Variante A: Windows-Server in der Domäne (empfohlen)

Voraussetzungen: Server ist Mitglied der Domäne, Python 3.11+, Node.js 20+, ein DNS-Eintrag
(z. B. `intranet.firma.local` → Server) und ein Zertifikat der Firmen-CA als PEM (`cert.pem`, `key.pem`).

```powershell
# als Administrator im Lotse-Ordner
.\deploy\kerberos\install-windows.ps1 -HostName intranet.firma.local -CertFile C:\lotse\cert.pem -KeyFile C:\lotse\key.pem
```

Das Skript richtet die Umgebung ein, baut die Oberfläche, trägt den **SPN** ein, öffnet die Firewall und startet
Lotse als geplante Aufgabe beim Systemstart (Konto *SYSTEM* = Computerkonto, Neustart bei Absturz).

Fehlen dem Konto die Rechte für den SPN, führt ein Domänen-Admin aus:

```powershell
setspn -S HTTP/intranet.firma.local SERVERNAME
```

Ein Zertifikat liegt oft als `.pfx` vor; in PEM umwandeln:

```bash
openssl pkcs12 -in lotse.pfx -nokeys -out cert.pem
openssl pkcs12 -in lotse.pfx -nocerts -nodes -out key.pem
```

## Variante B: Linux-Server

1. Pakete: `krb5-user` (Debian/Ubuntu) bzw. `krb5-workstation`; in `backend/.venv`:
   `pip install "pyspnego[kerberos]"`.
2. In AD ein Dienstkonto `svc-lotse` anlegen und auf dem Domänencontroller die Keytab erzeugen:

   ```powershell
   ktpass -princ HTTP/intranet.firma.local@FIRMA.LOCAL -mapuser FIRMA\svc-lotse -crypto AES256-SHA1 `
          -ptype KRB5_NT_PRINCIPAL -pass * -out http.keytab
   ```

3. `http.keytab` nach `/etc/lotse/` kopieren (nur für den Lotse-Benutzer lesbar), `/etc/krb5.conf` mit dem Realm
   `FIRMA.LOCAL` einrichten.
4. [`lotse.service`](lotse.service) anpassen und als systemd-Dienst starten.
5. In Lotse den Pfad der Keytab unter *Keytab-Datei* eintragen.

## In Lotse einschalten

**Verwaltung → Einstellungen**: zuerst **LDAP** einrichten und testen, dann **Windows-Anmeldung** einschalten,
Art **Kerberos direkt (ohne IIS)**, *Adresse des Portals* = `intranet.firma.local`.

## Browser freigeben (Gruppenrichtlinie)

Ohne Freigabe geben Browser das Windows-Konto nicht weiter oder fragen nach dem Passwort.

| Browser | Einstellung |
|---|---|
| Edge, Chrome | Adresse in die Zone **Lokales Intranet** (*Liste der Site-zu-Zonen-Zuweisungen*: `https://intranet.firma.local` = 1) – oder Richtlinie `AuthServerAllowlist` = `intranet.firma.local` |
| Firefox | Firefox-ADMX: *Authentifizierung → SPNEGO* = `intranet.firma.local` (oder `policies.json`); von Hand: `about:config` → `network.negotiate-auth.trusted-uris` |
| Safari (macOS) | Mac in der Domäne oder Kerberos-SSO-Erweiterung (MDM); sonst fragt Safari nach dem Passwort |

## Fehlersuche

| Beobachtung | Ursache |
|---|---|
| Passwortfenster des Browsers statt automatischer Anmeldung | Adresse nicht freigegeben (Tabelle oben) oder Portal per IP statt Namen geöffnet |
| Anmeldung klappt nur per NTLM / gar nicht | SPN fehlt oder ist doppelt: `setspn -Q HTTP/intranet.firma.local` muss genau ein Konto zeigen |
| „No active account for this Windows user“ | Person im LDAP nicht gefunden – Benutzerfilter und Basis-DN prüfen |
| Linux: „Windows sign-in failed“ im Log | Keytab passt nicht zum SPN, Uhrzeit weicht > 5 Minuten ab oder `krb5.conf` fehlt |

Kerberos-Tickets am Client anzeigen: `klist`. Nach einem neuen SPN: `klist purge` und neu anmelden.
