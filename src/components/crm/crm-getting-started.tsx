import { useState } from "react";
import { Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

type Step = {
  emoji: string;
  textEs: string;
  textEn: string;
};

type CrmGettingStartedProps = {
  titleEs: string;
  titleEn: string;
  steps: Step[];
  storageKey: string;
  ctaLabelEs?: string;
  ctaLabelEn?: string;
  onCtaClick?: () => void;
};

export function CrmGettingStarted({
  titleEs,
  titleEn,
  steps,
  storageKey,
  ctaLabelEs,
  ctaLabelEn,
  onCtaClick,
}: CrmGettingStartedProps) {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "1";
  });
  const [collapsed, setCollapsed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-800/40 p-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
            <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {isEs ? titleEs : titleEn}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded p-1 text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2 pl-10.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300/80">
              <span className="shrink-0">{step.emoji}</span>
              <span>{isEs ? step.textEs : step.textEn}</span>
            </div>
          ))}

          {onCtaClick && ctaLabelEs && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={onCtaClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {isEs ? ctaLabelEs : ctaLabelEn}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
