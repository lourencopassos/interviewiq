"use client";

import { Globe, Check } from "lucide-react";
import * as DropdownPrimitive from "@radix-ui/react-select";
import { LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Interface language switch, styled as a pop tile with a tile dropdown. */
export function LanguageSelect({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownPrimitive.Root value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <DropdownPrimitive.Trigger
        aria-label={t.common.language.label}
        className={cn(
          "tile-pop tile-pop-hover tile-pop-press inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] shadow-pop-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          className,
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <DropdownPrimitive.Value>{LOCALE_LABELS[locale].short}</DropdownPrimitive.Value>
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          position="popper"
          sideOffset={6}
          align="end"
          className="z-50 min-w-[10rem] overflow-hidden rounded-md border-1.5 border-ink bg-card p-1 text-ink shadow-pop data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownPrimitive.Viewport>
            {LOCALES.map((code) => (
              <DropdownPrimitive.Item
                key={code}
                value={code}
                className="relative flex cursor-default select-none items-center justify-between gap-3 rounded-sm px-2.5 py-1.5 text-[12px] outline-none data-[highlighted]:bg-sage data-[highlighted]:text-sage-deep data-[state=checked]:font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span className="kbd">{LOCALE_LABELS[code].short}</span>
                  <DropdownPrimitive.ItemText>{LOCALE_LABELS[code].native}</DropdownPrimitive.ItemText>
                </span>
                <DropdownPrimitive.ItemIndicator>
                  <Check className="h-3.5 w-3.5" />
                </DropdownPrimitive.ItemIndicator>
              </DropdownPrimitive.Item>
            ))}
          </DropdownPrimitive.Viewport>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
