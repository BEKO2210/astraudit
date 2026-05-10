/**
 * Datenschutzerklärung — Pflichtangaben gemäß Art. 13 DSGVO sowie
 * § 25 TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz).
 *
 * Astraudit ist eine reine Browser-Anwendung ohne eigenes Backend;
 * die Datenschutzerklärung deckt entsprechend ausschließlich:
 *   1. GitHub Pages-Hosting (IP in Server-Logs durch GitHub),
 *   2. Direkte Aufrufe der öffentlichen GitHub-API aus dem Browser,
 *   3. Lokale Speicherung im localStorage (Theme, Dichte, History,
 *      Audit-Cache, optionaler GitHub-PAT),
 *   4. Bestehen *keiner* Cookies, Tracking-Pixel, Werbenetzwerke
 *      oder Webanalyse-Tools.
 */

import { LegalPage } from "./LegalPage";

export function Datenschutzerklaerung() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      otherSlug="impressum"
      otherLabel="Impressum →"
    >
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
        sowie sonstiger nationaler Datenschutzgesetze ist:
      </p>
      <p>
        Belkis Aslani
        <br />
        Vogelsangstraße 32
        <br />
        71691 Freiberg am Neckar
        <br />
        Deutschland
        <br />
        E-Mail:{" "}
        <a href="mailto:belkis.aslani@gmail.com">belkis.aslani@gmail.com</a>
        <br />
        Telefon: +49 176 81462526
      </p>

      <h2>2. Allgemeine Hinweise</h2>
      <p>
        Astraudit ist eine reine Browser-Anwendung. Es gibt{" "}
        <strong>keinen eigenen Server</strong>, der von uns betrieben wird.
        Sämtliche Berechnungen, Analysen und Audit-Ergebnisse entstehen
        ausschließlich auf Ihrem Endgerät. Personenbezogene Daten oder
        Audit-Ergebnisse werden von uns weder erhoben noch gespeichert noch
        weiterverarbeitet.
      </p>

      <h2>3. Hosting via GitHub Pages</h2>
      <p>
        Diese Website wird über GitHub Pages ausgeliefert. Anbieter ist die
        GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
        Beim Aufruf der Seite werden technisch erforderliche
        personenbezogene Daten (insbesondere IP-Adresse, Datum und Uhrzeit
        der Anfrage, Browsertyp, Betriebssystem, Referrer-URL, übertragene
        Datenmenge) automatisch in den Server-Logs von GitHub erfasst.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
        Interesse an einer technisch fehlerfreien Auslieferung der
        Website). Auf Inhalt, Speicherdauer und Verwendung dieser Server-
        Logs durch GitHub haben wir keinen Einfluss.
      </p>
      <p>
        GitHub ist nach dem EU-U.S. Data Privacy Framework zertifiziert.
        Weitere Informationen finden Sie in der Datenschutzerklärung von
        GitHub:{" "}
        <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub General Privacy Statement
        </a>
        .
      </p>

      <h2>4. Aufrufe der GitHub-API (Drittanbieter)</h2>
      <p>
        Zur Erstellung eines Audits ruft Astraudit die öffentlich
        verfügbare GitHub-REST-API (<code>api.github.com</code>) sowie die
        Inhalte unter <code>raw.githubusercontent.com</code> direkt aus
        Ihrem Browser auf. Dabei wird Ihre IP-Adresse an GitHub
        übermittelt. Es werden ausschließlich öffentlich zugängliche Daten
        der von Ihnen ausgewählten Repositories abgefragt.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
        Interesse an der Bereitstellung der Audit-Funktion). Eine
        Übermittlung an Astraudit findet nicht statt — die Antworten der
        GitHub-API werden ausschließlich in Ihrem Browser ausgewertet.
      </p>

      <h2>4a. Öffentliche Paket-Registries (Drittanbieter)</h2>
      <p>
        Wenn das auditierte Repository ein <code>package.json</code> (Node.js),
        eine <code>requirements.txt</code> bzw. <code>pyproject.toml</code> (Python)
        oder eine <code>Cargo.toml</code> (Rust) enthält, fragt Astraudit zu den
        dort deklarierten Top-Level-Abhängigkeiten ergänzende Metadaten von den
        jeweiligen <strong>öffentlichen, unauthentifizierten</strong>
        Read-Only-Endpunkten ab:
      </p>
      <ul>
        <li>
          <code>registry.npmjs.org</code> — Anbieter: GitHub, Inc., 88 Colin
          P Kelly Jr St, San Francisco, CA 94107, USA.
        </li>
        <li>
          <code>pypi.org</code> — Anbieter: Python Software Foundation, 9450
          SW Gemini Dr ECM #90772, Beaverton, OR 97008, USA.
        </li>
        <li>
          <code>crates.io</code> — Anbieter: The Rust Foundation, 401 Edgewater
          Place, Suite 600, Wakefield, MA 01880, USA.
        </li>
      </ul>
      <p>
        Pro abgefragter Bibliothek wird Ihre IP-Adresse an den jeweiligen
        Registry-Betreiber übermittelt. Die Anzahl der Anfragen ist je
        Audit pro Ökosystem auf höchstens 12 (npm) bzw. 10 (PyPI / crates.io)
        Pakete begrenzt; Antworten werden 24 Stunden lang ausschließlich in
        Ihrem Browser zwischengespeichert, sodass Wiederholungs-Audits ohne
        weitere Netzwerk-Anfragen auskommen.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
        Interesse an der Anreicherung der Audit-Ausgabe um veröffentlichte
        Versions- und Veröffentlichungsdaten). Es werden ausschließlich
        öffentlich verfügbare Paket-Metadaten abgefragt — Astraudit
        übermittelt keine Daten an diese Anbieter und empfängt keine
        Antworten an einem eigenen Server.
      </p>

      <h2>5. Lokale Speicherung im Browser (localStorage)</h2>
      <p>
        Astraudit speichert ausschließlich auf Ihrem Endgerät, im
        localStorage Ihres Browsers, folgende Einstellungen und Daten:
      </p>
      <ul>
        <li>Theme-Auswahl (dunkel / hell / System)</li>
        <li>UI-Dichte (komfortabel / kompakt)</li>
        <li>
          Audit-Verlauf inkl. Favoriten (Repository-Bezeichner, Score,
          Zeitstempel)
        </li>
        <li>
          Cache der zuletzt durchgeführten Audits (Lebensdauer 24 Stunden)
        </li>
        <li>
          Optional, nur falls aktiv durch Sie hinterlegt: Ihr persönlicher
          GitHub Personal Access Token (PAT)
        </li>
      </ul>
      <p>
        Diese Daten verlassen Ihren Browser zu keinem Zeitpunkt. Sie werden
        weder von uns noch von Dritten erhoben oder verarbeitet. Sie können
        die Daten jederzeit über die Einstellungen Ihres Browsers oder über
        die in Astraudit eingebauten Funktionen („Cache leeren", „Token
        entfernen", Browserverlauf löschen) wieder entfernen.
      </p>
      <p>
        Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TTDSG (technisch unbedingt
        erforderliche Speicherung) sowie Art. 6 Abs. 1 lit. a DSGVO
        (Einwilligung durch aktive Konfiguration).
      </p>

      <h2>6. Keine Cookies, kein Tracking, keine Analyse</h2>
      <p>
        Astraudit setzt <strong>keine Cookies</strong>. Es findet{" "}
        <strong>kein Webanalyse-Tracking</strong> (z. B. Google Analytics,
        Matomo, Plausible) statt. Es werden{" "}
        <strong>keine Werbenetzwerke</strong> eingebunden. Es erfolgt{" "}
        <strong>keine Profilbildung</strong> und keine automatisierte
        Entscheidungsfindung im Sinne des Art. 22 DSGVO.
      </p>

      <h2>7. Ihre Rechte als betroffene Person</h2>
      <p>
        Sie haben gegenüber dem Verantwortlichen folgende Rechte
        hinsichtlich der Sie betreffenden personenbezogenen Daten:
      </p>
      <ul>
        <li>Auskunftsrecht (Art. 15 DSGVO)</li>
        <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
        <li>Recht auf Löschung (Art. 17 DSGVO)</li>
        <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
        <li>Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p>
        Da wir keinen eigenen Server betreiben und keine personenbezogenen
        Daten von Ihnen speichern, beschränkt sich der praktisch
        ausübbare Umfang dieser Rechte uns gegenüber im Wesentlichen auf
        Auskunft und Hinweise. Über lokal in Ihrem Browser abgelegte Daten
        haben Sie jederzeit selbst die volle Kontrolle.
      </p>

      <h2>8. Zuständige Aufsichtsbehörde</h2>
      <p>
        Der Landesbeauftragte für den Datenschutz und die
        Informationsfreiheit Baden-Württemberg
        <br />
        Königstraße 10a
        <br />
        70173 Stuttgart
        <br />
        <a
          href="https://www.baden-wuerttemberg.datenschutz.de/"
          target="_blank"
          rel="noreferrer noopener"
        >
          baden-wuerttemberg.datenschutz.de
        </a>
      </p>

      <h2>9. SSL/TLS-Verschlüsselung</h2>
      <p>
        Diese Seite nutzt aus Gründen der Sicherheit und zum Schutz der
        Übertragung vertraulicher Inhalte eine SSL/TLS-Verschlüsselung. Sie
        erkennen eine verschlüsselte Verbindung an dem „https://" in der
        Adresszeile Ihres Browsers sowie am Schloss-Symbol.
      </p>

      <h2>10. Aktualität und Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Stand: Mai 2026. Diese Datenschutzerklärung wird bei Bedarf an
        aktuelle rechtliche oder funktionale Anforderungen angepasst.
        Bitte rufen Sie diese Seite gelegentlich erneut auf, um sich über
        eventuelle Änderungen zu informieren.
      </p>
    </LegalPage>
  );
}
