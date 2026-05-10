/**
 * Impressum — Pflichtangaben gemäß § 5 DDG (Digitale-Dienste-Gesetz,
 * vormals § 5 TMG) und § 18 Abs. 2 MStV (Medienstaatsvertrag).
 *
 * Inhaltlich nach den Vorgaben der gängigen deutschen Impressums-
 * Generatoren (e-recht24, RA Plutte, Datenschutz.org) modelliert; die
 * Kontaktangaben stammen direkt vom Betreiber.
 */

import { LegalPage } from "./LegalPage";

export function Impressum() {
  return (
    <LegalPage
      title="Impressum"
      otherSlug="datenschutz"
      otherLabel="Datenschutzerklärung →"
    >
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Belkis Aslani
        <br />
        Vogelsangstraße 32
        <br />
        71691 Freiberg am Neckar
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: +49 176 81462526
        <br />
        E-Mail:{" "}
        <a href="mailto:belkis.aslani@gmail.com">belkis.aslani@gmail.com</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Belkis Aslani
        <br />
        Vogelsangstraße 32
        <br />
        71691 Freiberg am Neckar
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
        auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
        §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
        überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon
        unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
        Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
        Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
        Inhalte umgehend entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
        fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
        der Seiten verantwortlich. Die verlinkten Seiten wurden zum
        Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
        Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
        erkennbar.
      </p>
      <p>
        Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist
        jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
        zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
        derartige Links umgehend entfernen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
        diesen Seiten unterliegen dem deutschen Urheberrecht. Die
        Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
        Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
        schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        Downloads und Kopien dieser Seite sind nur für den privaten, nicht
        kommerziellen Gebrauch gestattet.
      </p>
      <p>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
        wurden, werden die Urheberrechte Dritter beachtet. Insbesondere
        werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
        trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten
        wir um einen entsprechenden Hinweis. Bei Bekanntwerden von
        Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noreferrer noopener"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht
        bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalPage>
  );
}
