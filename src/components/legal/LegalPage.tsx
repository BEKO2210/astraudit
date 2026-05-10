/**
 * Shared chrome for the German legal pages (Impressum +
 * Datenschutzerklärung).
 *
 * Thin wrapper over the generic `<DocPage>` (Phase 4.5) that hard-
 * codes the German back-link copy and the cross-link pair the BGH
 * and the Datenschutzbehörden expect on a compliant site (each legal
 * page must be one click away from the other).
 */

import type { ReactNode } from "react";
import { DocPage } from "./DocPage";

interface LegalPageProps {
  title: string;
  /** Slug of the *other* legal page so we can render its cross-link. */
  otherSlug: "impressum" | "datenschutz";
  otherLabel: string;
  children: ReactNode;
}

export function LegalPage({
  title,
  otherSlug,
  otherLabel,
  children,
}: LegalPageProps) {
  return (
    <DocPage
      title={title}
      backLabel="Zurück zur App"
      nav={[{ slug: otherSlug, label: otherLabel }]}
    >
      {children}
    </DocPage>
  );
}
