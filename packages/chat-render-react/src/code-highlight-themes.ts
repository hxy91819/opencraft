import type { ThemeRegistration } from "@shikijs/core";
import vitesseDark from "@shikijs/themes/vitesse-dark";
import vitesseLight from "@shikijs/themes/vitesse-light";

interface CodexSyntaxPalette {
  readonly foreground: string;
  readonly comment: string;
  readonly string: string;
  readonly number: string;
  readonly regexp: string;
  readonly keyword: string;
  readonly variable: string;
  readonly parameter: string;
  readonly function: string;
}

// Legacy export names remain API-compatible; colors and rules come from the
// licensed Shiki Vitesse themes. See SYNTAX_THEME_NOTICE.json.
function palette(theme: ThemeRegistration): CodexSyntaxPalette {
  const foreground = theme.colors?.["editor.foreground"] ?? theme.fg ?? "inherit";
  const color = (scope: string): string => {
    for (const rule of theme.tokenColors ?? theme.settings ?? []) {
      const scopes = typeof rule.scope === "string" ? rule.scope.split(",") : rule.scope ?? [];
      if (scopes.some(value => value.trim() === scope) && rule.settings.foreground) {
        return rule.settings.foreground;
      }
    }
    return foreground;
  };
  return {
    foreground,
    comment: color("comment"),
    string: color("string"),
    number: color("constant.numeric"),
    regexp: color("string.regexp"),
    keyword: color("keyword"),
    variable: color("variable"),
    parameter: color("variable.parameter.function"),
    function: color("entity.name.function"),
  };
}

export const CODEX_LIGHT_SYNTAX = palette(vitesseLight);
export const CODEX_DARK_SYNTAX = palette(vitesseDark);
export const codexLightTheme: ThemeRegistration = { ...vitesseLight, name: "codex-light" };
export const codexDarkTheme: ThemeRegistration = { ...vitesseDark, name: "codex-dark" };
