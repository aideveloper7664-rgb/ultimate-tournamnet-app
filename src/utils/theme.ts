export interface ThemeDef {
  id: string;
  name: string;
  sw: [string, string];
  light?: boolean;
  v?: Record<string, string>;
}

export const mk = (
  id: string,
  name: string,
  bg: string,
  card: string,
  accent: string,
  nav: string,
  dip: string,
  light = false
): ThemeDef => ({
  id,
  name,
  sw: [bg, accent],
  light,
  v: {
    "--bg": bg,
    "--bg2": light ? "#f8fafc" : card,
    "--card": card,
    "--text": light ? "#0f172a" : "#ffffff",
    "--sub": light ? "#334155" : "#94a3b8",
    "--accent": accent,
    "--plus": accent,
    "--sel": accent,
    "--plusfg": light ? "#ffffff" : "#0b1020",
    "--pill": light ? "#e2e8f0" : bg,
    "--pillb": light ? "#cbd5e1" : accent + "66",
    "--nav": nav,
    "--dip": dip,
    "--drawer": light ? "#ffffff" : card,
    "--opt": light ? "#f8fafc" : `color-mix(in srgb, ${card}, #fff 7%)`,
    "--shadow": light ? "0 4px 16px rgba(15,23,42,0.12)" : "0 4px 16px rgba(0,0,0,0.4)"
  }
});

export const THEMES: ThemeDef[] = [
  mk("", "Original Blue", "#0f1a33", "#14223f", "#19e6ff", "#1a1a2e", "#0d0d2a"),
  mk("day", "Day Mode", "#f3f5f9", "#ffffff", "#1e88e5", "#1a1a2e", "#0d0d2a", true),
  mk("night", "Night Mode", "#000000", "#0f0f0f", "#ffc400", "#0a0a0a", "#000000"),
  mk("cyber", "Cyberpunk", "#17002e", "#220040", "#ff2e93", "#120024", "#07000f"),
  mk("emerald", "Emerald Green", "#06180f", "#0d2a1b", "#2dff8a", "#0a1f14", "#04100a"),
  mk("sunset", "Sunset Orange", "#1a0d08", "#2c1710", "#ff7a2f", "#22110a", "#100804"),
  mk("royal", "Royal Purple", "#130a2a", "#211344", "#a66bff", "#190d36", "#0b0518"),
  mk("crimson", "Crimson Red", "#1a0508", "#2e0b12", "#ff3b4e", "#210609", "#0d0204"),
  mk("ocean", "Ocean Teal", "#04202a", "#0a3340", "#1de9d6", "#072a36", "#031219"),
  mk("rose", "Rose Pink", "#200a17", "#361327", "#ff6fb5", "#290d1d", "#12050c"),
  mk("gold", "Midnight Gold", "#0e0c06", "#1d190c", "#f5c542", "#16130a", "#070603"),
  mk("lime", "Forest Lime", "#0b1405", "#172a0b", "#b6ff3b", "#101e07", "#060b03"),
  mk("steel", "Slate Steel", "#12161c", "#1e252e", "#7fb2ff", "#171c23", "#0a0d11"),
  mk("coffee", "Coffee Brown", "#1b120d", "#2e1f17", "#d9a066", "#231710", "#0e0906"),
  mk("mint", "Mint Light", "#eef8f3", "#ffffff", "#12a26a", "#1a1a2e", "#0d0d2a", true),
  mk("lav", "Lavender Light", "#f4f0fb", "#ffffff", "#7c4dff", "#1a1a2e", "#0d0d2a", true)
];

export function applyTheme(themeId: string) {
  const th = THEMES.find(x => x.id === themeId) || THEMES[0];
  const isLight = Boolean(th.light || th.id === "day" || th.id === "mint" || th.id === "lav");

  document.body.className = ["day", "night", "cyber"].includes(th.id) ? th.id : "";
  document.documentElement.setAttribute("data-theme", th.id);
  document.documentElement.setAttribute("data-theme-type", isLight ? "light" : "dark");
  document.body.setAttribute("data-theme-type", isLight ? "light" : "dark");

  const varKeys = [
    "--bg", "--bg2", "--card", "--text", "--sub", "--accent", "--plus", "--sel",
    "--plusfg", "--pill", "--pillb", "--nav", "--dip", "--drawer", "--opt", "--shadow",
    "--primary-bg", "--secondary-bg", "--card-bg", "--text-primary", "--text-secondary",
    "--accent-color", "--border-color"
  ];
  varKeys.forEach(k => {
    document.body.style.removeProperty(k);
    document.documentElement.style.removeProperty(k);
  });

  if (th.v) {
    for (const [k, v] of Object.entries(th.v)) {
      document.body.style.setProperty(k, v);
      document.documentElement.style.setProperty(k, v);
    }
    const bg = th.v["--bg"] || "#0f1a33";
    const bg2 = th.v["--bg2"] || (isLight ? "#f8fafc" : "#14223f");
    const card = th.v["--card"] || (isLight ? "#ffffff" : "#16264a");
    const text = th.v["--text"] || (isLight ? "#0f172a" : "#fff");
    const sub = th.v["--sub"] || (isLight ? "#334155" : "#8e9ab5");
    const accent = th.v["--accent"] || "#19e6ff";

    const derived: Record<string, string> = {
      "--primary-bg": bg,
      "--secondary-bg": bg2,
      "--card-bg": card,
      "--text-primary": text,
      "--text-secondary": sub,
      "--accent-color": accent,
      "--border-color": isLight
        ? `color-mix(in srgb, ${accent} 40%, #cbd5e1)`
        : `color-mix(in srgb, ${accent} 22%, transparent)`
    };

    for (const [dk, dv] of Object.entries(derived)) {
      document.body.style.setProperty(dk, dv);
      document.documentElement.style.setProperty(dk, dv);
    }
  }

  // Update theme-color meta tag
  const computedBg = th.v?.["--bg"] || (
    th.id === "day" ? "#f3f5f9" :
    th.id === "mint" ? "#eef8f3" :
    th.id === "lav" ? "#f4f0fb" :
    th.id === "night" ? "#000000" :
    th.id === "cyber" ? "#17002e" : "#0f1a33"
  );
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', computedBg);

  // Set color-scheme
  document.documentElement.style.colorScheme = isLight ? "light" : "dark";

  try {
    localStorage.setItem("gz", th.id);
    localStorage.setItem("app_theme_mode", isLight ? "light" : "dark");
  } catch (e) {
    // ignore
  }
}
