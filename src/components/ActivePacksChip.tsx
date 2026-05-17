/**
 * <ActivePacksChip /> — Roadmap M5.1.
 *
 * Tiny pill rendered just under the OverviewHeader whenever the
 * audit ran with one or more opt‑in rule packs enabled. Makes the
 * non‑default audit configuration visible at a glance so the user
 * never wonders "why is there a TypeScript‑strictness finding here
 * that I don't usually see?". Hidden completely when no packs are
 * active so the canonical audit stays uncluttered.
 */

import { Sliders } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { RULE_PACK_REGISTRY } from "../lib/audit/rulePacks/registry";
import type { RulePackId } from "../lib/audit/rulePacks/types";
import { RULE_PACK_IDS } from "../lib/audit/rulePacks/types";

interface ActivePacksChipProps {
  enabledPacks: readonly string[];
}

const KNOWN: ReadonlySet<string> = new Set(RULE_PACK_IDS);

export function ActivePacksChip({ enabledPacks }: ActivePacksChipProps) {
  const { t } = useTranslation();
  // Filter to ids the registry knows about so a future server‑side
  // change that introduces an unknown pack never crashes the panel.
  const ids = enabledPacks.filter((id): id is RulePackId => KNOWN.has(id));
  if (ids.length === 0) return null;
  const labels = ids.map((id) => t(RULE_PACK_REGISTRY[id].labelKey as never));
  return (
    <div
      data-testid="active-packs-chip"
      className="mt-3 inline-flex items-center gap-2 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1 text-[11px] font-medium text-aurora-violet"
    >
      <Sliders className="h-3 w-3" />
      <span>
        {t("rulePacks.activeLabel")}: {labels.join(" · ")}
      </span>
    </div>
  );
}
