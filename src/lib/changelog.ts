export interface ChangelogItem {
  version: string;
  releaseDate: string;
  title: string;
  badge?: string;
  highlights: {
    category: "New" | "Delight" | "Improvement" | "Fix";
    text: string;
  }[];
}

export const CHANGELOG_HISTORY: ChangelogItem[] = [
  {
    version: "v0.10.0",
    releaseDate: "October 2026",
    title: "Material Archetype Theme Studio & OSL Light-Spill",
    badge: "Latest Release 🎨",
    highlights: [
      {
        category: "New",
        text: "9-Palette Theme Studio: Choose between 4 'Super Creamy' Matte PBT Keycap palettes (Mocha, Matcha, Oat, and Daylight Latte) and 5 'Cyberpunk & Seasonal OSL' palettes (Over-Volt Blue, Yakuza Purple, Red Dragon, Neon Green, and All Hallows).",
      },
      {
        category: "Delight",
        text: "Hue-Preserving Member Color Adaptation: Family member colors stay true to their chosen hue while adapting saturation, lightness, and Mother-Color undertone to match the active theme's materiality.",
      },
      {
        category: "Improvement",
        text: "OSL Left-Lip Cards & Double-Shot Keycap Focus: Event, Chore, Meal, and List cards feature a crisp 3px solid left lip with a directional horizontal glaze, while active tabs adapt between tactile PBT keycaps and 3-layer fluorescent OSL light-spill.",
      },
      {
        category: "Improvement",
        text: "Reworked All Hallows OSL & Visual Restraint: Replaced intrusive full-screen spooky overlays and novelty display fonts with an atmospheric pumpkin-phosphor OSL palette, borderless header utilities, and single-anchor calendar selection.",
      },
    ],
  },
  {
    version: "v0.9.0",
    releaseDate: "October 2026",
    title: "Autonomous Agent Conduit & Bot Wall",
    badge: "Previous",
    highlights: [
      {
        category: "New",
        text: "Bot Wall & Personal Access Tokens (PAT): Mint scoped bearer tokens (jlight_ag_...) bound to household inhabitants ('User N's Agent') with 4 access tiers.",
      },
      {
        category: "New",
        text: "Push & Pull Handshake Protocols: Mint directly in the kiosk UI or let autonomous agents initiate connection via standard RFC 8628 device codes (BOT-XXXX).",
      },
      {
        category: "Delight",
        text: "Pixel Art Stencils & Runes: Rescued from tomasmed.dev Bot Wall, agents display custom 16×16 bitmaps, UTF-8 runes, and the historic Buff (∅) tombstone on revocation.",
      },
      {
        category: "New",
        text: "Agent Discoverability: Added /llms.txt machine-readable documentation and /api/agent/whoami orientation endpoint.",
      },
      {
        category: "New",
        text: "Zero-Dependency jlight CLI: Control family calendars, chores, meals, and grocery lists directly from the terminal or background agent loops.",
      },
      {
        category: "Improvement",
        text: "Full Provenance Attribution: Every item created by an agent features a crisp visual badge indicating which agent performed the action on behalf of which family member.",
      },
    ],
  },
  {
    version: "v0.8.0",
    releaseDate: "October 2026",
    title: "Spooky Season & Family Themes Pack",
    badge: "Previous",
    highlights: [
      {
        category: "Delight",
        text: "Spooky Halloween Theme: Midnight skies, glowing pumpkin embers, and eerie neon purple and slime accents.",
      },
      {
        category: "New",
        text: "Interactive Theme Engine: Switch between Cosmic Milky Way and Spooky Halloween with instant live previews.",
      },
      {
        category: "New",
        text: "Changelog & What's New: Easily see upcoming features, recent fixes, and improvements directly from the kiosk or landing page.",
      },
      {
        category: "New",
        text: "Mobile Split Month + Live Agenda: Tap any date in the compact mobile month grid to immediately inspect and manage its events in a split agenda pane below without popup modals.",
      },
      {
        category: "Improvement",
        text: "Mobile Thumb-Zone FABs & Compact Toolbars: Added floating '+ Add' action buttons, a 2-row calendar toolbar, and a unified Chores Member + Star filter strip.",
      },
      {
        category: "Improvement",
        text: "Two-Row Mobile Top Banner: Redesigned mobile header into two spacious rows with a full-text Access Mode badge, Galaxy switcher, and quick utility actions.",
      },
      {
        category: "Improvement",
        text: "Database Safety & Rolling Snapshots: Automatic local database backups protect schedules and chores across server restarts.",
      },
    ],
  },
  {
    version: "v0.7.0",
    releaseDate: "September 2026",
    title: "Recurring Schedules & Touch Optimization",
    badge: "Previous",
    highlights: [
      {
        category: "New",
        text: "Recurring Event Engine: Daily, Weekday, Weekly, and Monthly event repetition anchored to local timezones.",
      },
      {
        category: "Improvement",
        text: "Weekly Hour Breakdown: 7-day hour-by-hour view with full kiosk touchscreen support.",
      },
      {
        category: "Improvement",
        text: "Ergonomic 48px touch targets across all mobile navbars and modal dialogs.",
      },
    ],
  },
  {
    version: "v0.6.0",
    releaseDate: "August 2026",
    title: "Multi-Galaxy Households & Star Store",
    badge: "Core",
    highlights: [
      {
        category: "New",
        text: "Household Galaxies with join codes, invite links, and independent inhabitant roles.",
      },
      {
        category: "New",
        text: "Kid Mode & Gamified Star Store with PIN-protected parent toggles.",
      },
    ],
  },
];
