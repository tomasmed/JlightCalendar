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
    version: "v0.8.0",
    releaseDate: "October 2026",
    title: "Spooky Season & Family Themes Pack",
    badge: "Latest Release 🎃",
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
