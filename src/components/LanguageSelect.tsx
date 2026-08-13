import { ChevronDown } from "lucide-react";
import { LANGS, type Lang } from "../i18n";

/**
 * Language picker as a native <select> dropdown.
 *
 * Replaces the old grid/list of language pills (Onboarding + Settings).
 * A native select is deliberate: on a phone it opens the OS-native
 * picker (a scroll wheel on iOS, a dialog on Android), which scales
 * cleanly as we add more languages and is fully accessible/keyboard-
 * friendly for free. We hide the native chevron (`appearance-none`)
 * and draw our own so it matches the dark theme.
 */
export function LanguageSelect({
  value,
  onChange,
  id,
  className = "",
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div className={"relative " + className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Lang)}
        aria-label="Language"
        className="w-full appearance-none rounded-xl bg-bg-card border border-white/10 text-white text-sm font-medium pl-4 pr-10 py-3 outline-none focus:border-kasi-green transition-colors cursor-pointer"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-bg-card text-white">
            {l.native}
            {l.native !== l.label ? ` · ${l.label}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
      />
    </div>
  );
}
