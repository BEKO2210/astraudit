import {
  Boxes,
  Bot,
  ClipboardCheck,
  Cpu,
  FlaskConical,
  GitBranch,
  Hammer,
  Layers3,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { StackSignals } from "../types/audit";
import { useTranslation } from "../lib/i18n";

interface DependencyPanelProps {
  stack: StackSignals;
}

export function DependencyPanel({ stack }: DependencyPanelProps) {
  const { t } = useTranslation();
  return (
    <section className="glass p-6">
      <div className="flex items-center gap-2">
        <Boxes className="h-4 w-4 text-aurora-violet" />
        <h3 className="text-sm font-semibold text-white">
          {t("panel.dependencies")}
        </h3>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field
          icon={Cpu}
          label="Primary language"
          value={stack.language ?? "Not detected"}
        />
        <Field
          icon={GitBranch}
          label="Runtime"
          value={stack.runtime ?? "Not detected"}
        />
        <Field
          icon={Hammer}
          label="Package manager"
          value={stack.packageManager ?? "Not detected"}
        />
        <Field
          icon={ShieldCheck}
          label="Lockfile"
          value={stack.hasLockfile ? "Present" : "Missing"}
        />
        <Field
          icon={Boxes}
          label="Frameworks"
          value={stack.frameworks.length ? stack.frameworks.join(", ") : "Not detected"}
        />
        <Field
          icon={Hammer}
          label="Build tools"
          value={stack.buildTools.length ? stack.buildTools.join(", ") : "Not detected"}
        />
        <Field
          icon={FlaskConical}
          label="Test tools"
          value={stack.testTools.length ? stack.testTools.join(", ") : "Not detected"}
        />
        <Field
          icon={ShieldCheck}
          label="Lint/format tools"
          value={stack.lintTools.length ? stack.lintTools.join(", ") : "Not detected"}
        />
        {stack.envManagers.length > 0 ? (
          <Field
            icon={Wrench}
            label="Toolchain managers"
            value={stack.envManagers.join(", ")}
          />
        ) : null}
        {stack.pythonTools.length > 0 ? (
          <Field
            icon={Layers3}
            label="Python ecosystem"
            value={stack.pythonTools.join(", ")}
          />
        ) : null}
        {stack.sboms.length > 0 ? (
          <Field
            icon={ClipboardCheck}
            label="Software bill of materials"
            value={stack.sboms.join(", ")}
          />
        ) : null}
        {stack.aiDevTools.length > 0 ? (
          <Field
            icon={Bot}
            label="AI / agent tooling"
            value={stack.aiDevTools.join(", ")}
          />
        ) : null}
      </div>

      {stack.dependencyCounts ? (
        <p className="mt-4 text-xs text-slate-400">
          Approximate dependency counts: {stack.dependencyCounts.dependencies}{" "}
          dependencies, {stack.dependencyCounts.devDependencies} devDependencies.
          Astraudit does not install or audit packages.
        </p>
      ) : null}

      {stack.languages.length > 0 ? (
        <div className="mt-5">
          <h4 className="card-title">Language mix</h4>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/5">
            {stack.languages.slice(0, 6).map((lang, idx) => (
              <div
                key={lang.name}
                style={{
                  width: `${Math.max(2, Math.round(lang.share * 100))}%`,
                  background: GRADIENTS[idx % GRADIENTS.length],
                }}
                title={`${lang.name} · ${(lang.share * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
            {stack.languages.slice(0, 6).map((lang, idx) => (
              <span key={lang.name} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: SWATCHES[idx % SWATCHES.length] }}
                />
                {lang.name} · {(lang.share * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const GRADIENTS = [
  "linear-gradient(90deg,#7a5cff,#3a7bff)",
  "linear-gradient(90deg,#3ad6ff,#42e8c8)",
  "linear-gradient(90deg,#ffb547,#ff7a48)",
  "linear-gradient(90deg,#ff7a90,#ff4d6d)",
  "linear-gradient(90deg,#9aa3c2,#6e7aa6)",
  "linear-gradient(90deg,#42e8c8,#3a7bff)",
];

const SWATCHES = [
  "#7a5cff",
  "#3ad6ff",
  "#ffb547",
  "#ff7a90",
  "#9aa3c2",
  "#42e8c8",
];

interface FieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function Field({ icon: Icon, label, value }: FieldProps) {
  const isMissing = value === "Not detected" || value === "Missing";
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div
        className={`mt-1 break-words text-sm ${isMissing ? "text-slate-500" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}
