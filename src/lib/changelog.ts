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
