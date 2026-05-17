# Renovate vs. Dependabot — Evaluation für Astraudit

> **Roadmap‑Item M1.3 (Monat 1).** Side‑by‑side‑Bewertung von
> Renovate gegen die bestehende Dependabot‑Konfiguration aus M1.2.
> Diese Datei ist **Empfehlung**, kein Setup‑Trigger — keine
> renovate.json wird hier abgelegt, keine GitHub‑App wird installiert.
>
> **Datum:** 2026‑05‑17 · **Stand der Untersuchung:** Dependabot
> nach M1.2‑Grouping in `main`, Renovate aus Doku + Erfahrungswerten.

---

## TL;DR

**Bleib bei Dependabot.** Die in M1.2 nachgezogene Gruppierung
adressiert das ursprüngliche „Bump‑Flut"‑Problem direkt — eine
Migration zu Renovate würde für Astraudit‑typische Workflows kaum
zusätzlichen Wert liefern, aber Trust‑Surface, Config‑Komplexität
und Dual‑Tool‑Reibung erhöhen. Die ursprünglich genannte
„Snapshot‑Reset‑Loop"‑Begründung ist orthogonal zur Bot‑Wahl
(siehe Abschnitt 5).

**Re‑Evaluation:** Wenn nach 4 Wochen Beobachtung (Mitte Juni 2026)
die wöchentliche Bump‑Queue trotz Gruppierung > 6 PRs/Woche bleibt,
oder wenn `npm audit` Sicherheits‑Patches verzögert hochkommen,
ist Renovate erneut prüfen.

---

## 1 · Was M1.3 lösen wollte

Aus `docs/ROADMAP_2026_2027.md`:

> **M1.3 Renovate‑Bot evaluieren.** Side‑by‑side mit Dependabot
> testen. Wenn Renovate die Snapshot‑Reset‑Loops besser
> automatisiert → migrieren.

Zwei implizite Hypothesen:

- **H1:** Renovate gruppiert besser → weniger Review‑Last.
- **H2:** Renovate automatisiert Snapshot‑Reset besser → weniger
  manuelle Playwright‑Update‑Loops nach Dep‑Bumps.

Beide Hypothesen sind im Folgenden geprüft.

---

## 2 · H1 — Gruppierung

### Stand Dependabot nach M1.2

| Group | Pakete (ca.) | Bumps pro Monat (geschätzt) |
|---|---:|---:|
| `react` | 4 | 1–2 |
| `tooling` | 9 | 2–3 |
| `tailwind` | 3 | 1 |
| `playwright` | 3 | 1 |
| `fonts` | 2 | < 1 |
| `markdown` | 2 | < 1 |
| `types` (catch‑all) | ~3 | < 1 |
| `runtime` (catch‑all) | ~4 | 1 |
| **Summe Singletons** | — | **≤ 5 PRs/Woche** |

Vor M1.2 waren das im Worst‑Case 15+ PRs/Woche (siehe Branch‑Liste
in `main`: `dependabot/npm_and_yarn/*` Häufung um 2026‑05).

### Stand Renovate (potenziell)

Renovates Stärken bei Grouping:

- **Custom Managers / Regex**: kann Pattern in beliebigen Dateien
  finden (z.B. Pin in `README.md` oder im Worker‑Bundle‑Test).
  *Für Astraudit nicht relevant* — alle Versionen leben in
  `package.json` / `package-lock.json` / `.github/workflows/*`.
- **Auto‑merge mit Test‑Gating**: PR wird automatisch gemerged
  sobald CI grün ist. *Für Astraudit kritisch riskant* — Visual
  Snapshots können auf grüner CI durchkommen und in `main` doch
  echte Regression sein (z.B. Font‑Renderer‑Drift). Auto‑merge
  würde die maintainer‑led‑Review‑Philosophie aus Phase 6.50
  brechen.
- **Stability Windows** (z.B. „warte 3 Tage nach Release"):
  *Sinnvoll*, aber via Dependabot durch „PR offen lassen +
  manuell mergen nach Sanity‑Window" gut approximierbar.
- **Dependency Dashboard Issue**: zentrales Issue listet alle
  Pending Updates, statt Inbox‑PRs. *Nice‑to‑have*, aber kein
  Game‑Changer bei 5 PRs/Woche.

### Verdikt H1

Nach M1.2 ist die Gruppierungs‑Gap klein genug, dass ein
Tool‑Wechsel nicht der Hebel ist. Erwartete Queue‑Größe ≤ 5 PRs/
Woche schlägt schon das Phase‑7‑Track‑0 abgeschlossene Niveau.

---

## 3 · H2 — Snapshot‑Reset‑Automatisierung

### Was passiert heute

Wenn ein Dep‑Bump Visual‑Snapshots verändert (Font‑Hinting,
Tailwind‑Reset, React‑Layout‑Edgecases):

1. Dependabot/Renovate öffnet PR mit Lock‑Bump.
2. `playwright.yml` läuft, schlägt fehl auf 5–15 Snapshots.
3. Maintainer (oder Agent) entscheidet: legit Regression vs.
   harmloser Pixel‑Shift.
4. Bei harmlos: `npm run test:visual:update` lokal, neue Baseline
   committen.

### Was Renovate hier KANN

Renovate hat **kein** natives Feature für „re‑baseline Visual
Snapshots". Was geht:

- `postUpdateOptions: ["yarnDedupeFewer", "npmDedupe"]` —
  Lock‑Hygiene, nicht Snapshot‑Reset.
- Custom `postUpgradeTasks` (nur self‑hosted) — ein Shell‑Befehl,
  der nach dem Update läuft. Theoretisch könnte das
  `npm run test:visual:update` aufrufen, aber:
  - Setzt **self‑hosted Renovate** voraus (eigener Runner) —
    bricht den „kein Backend, kein externer Service"‑Ansatz von
    Astraudit.
  - Auto‑Re‑Baseline ohne Maintainer‑Review **macht den Visual
    Gate wertlos** — jede legit Regression würde stillschweigend
    grün gemacht.

### Was Dependabot hier kann

Identisch nichts. Beide Bots sind Source‑Manager, keine
Test‑Updater.

### Verdikt H2

Snapshot‑Reset ist **orthogonal zur Bot‑Wahl**. Die Lösung wäre
ein separater Workflow:

- **Vorgeschlagenes Folge‑Item (für Monat 1 oder 2):** Ein
  „snapshot‑triage"‑Workflow, der auf jedem fehlgeschlagenen
  visual‑Run eine Side‑by‑Side‑Comparison als PR‑Comment postet
  (alt vs. neu vs. Diff‑Bild). Maintainer entscheidet per
  Comment‑Befehl `/accept-snapshots`, Action committed dann das
  Baseline‑Update auf den PR‑Branch.
- Hebel groß, Aufwand ~3 Sessions, keinen Bot‑Wechsel nötig.

---

## 4 · Weitere Kriterien

| Kriterium | Dependabot | Renovate | Astraudit‑Gewicht |
|---|---|---|---|
| Setup‑Aufwand heute | 0 (live) | App‑Install + Config + Cutover | Hoch (Reibung) |
| Trust‑Surface | nur GitHub | + Mend.io (Renovate‑Maintainer) | Mittel |
| Config‑Komplexität | YAML, ~80 Zeilen | JSON5, schnell 200+ Zeilen | Mittel |
| Native zu GitHub | ja | nein (third‑party App) | Hoch |
| Action‑Pinning auf SHA | nein | ja | Niedrig (CodeQL deckt) |
| Lockfile‑only PRs | nein (in Beta) | ja | Niedrig |
| Self‑hostable | nein | ja | Niedrig (kein Backend Policy) |
| Doku‑Qualität | sehr gut | sehr gut + verbose | Gleich |
| Maintainer‑Review‑Last | sinkt nach M1.2 | würde leicht weiter sinken | Mittel |

**Tie‑Breaker**: Astraudits Anti‑Roadmap sagt „kein Backend, keine
externen Services im kritischen Pfad". Dependabot ist Teil von
GitHub und damit Teil der Pflicht‑Trust‑Surface. Renovate wäre
ein zusätzlicher Dritt‑Anbieter im Release‑kritischen Pfad. Das
ist konsistent mit der Philosophie, *kein* zusätzliches Risiko zu
addieren wenn der Gewinn marginal ist.

---

## 5 · Empfehlung

1. **Bleib bei Dependabot.** M1.2‑Grouping ist die zielführende
   Antwort auf die Bump‑Flut. Renovate würde maximal 10–15 % der
   verbleibenden Review‑Zeit sparen — bei +1 Trust‑Surface und
   +50 % Config‑Komplexität nicht der Trade.

2. **Snapshot‑Reset separat lösen.** Als neues Roadmap‑Item
   vorgeschlagen (siehe `docs/ROADMAP_2026_2027.md` § Monat 1
   Eskalations‑Protokoll / Lessons‑Learned). Konkreter Vorschlag
   in Abschnitt 3 oben — Workflow mit `/accept-snapshots`‑Befehl.

3. **Re‑Evaluation in 4 Wochen.** Mitte Juni 2026: Wenn die
   Dependabot‑Queue trotz Gruppierung weiterhin > 6 PRs/Woche
   ist, oder wenn Security‑Advisories verzögert ankommen, dann
   ist H1 widerlegt und Renovate verdient einen echten Trial.
   Bis dahin: kein Move.

---

## 6 · Falls später doch migriert wird

Mini‑Cheatsheet — was eine Migration kosten würde:

- Renovate GitHub App installieren (Maintainer‑Account).
- `renovate.json` mit Mirror der M1.2‑Gruppen (1 Session).
- Parallel‑Phase: 1 Woche beide Bots gleichzeitig, Doppel‑PRs
  ignorieren / Renovate‑PRs mergen, Dependabot‑PRs schließen.
- `.github/dependabot.yml` löschen, npm‑Ecosystem aus Dependabot
  raus (github‑actions kann bleiben oder auch zu Renovate).
- README‑Badge / Dokumentation updaten.

Total geschätzt: 4 Sessions Migration + 1 Woche Beobachtung.
Nicht jetzt, nicht ohne neuen Trigger.
