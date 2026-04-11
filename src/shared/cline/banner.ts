/**
 * Action types that can be triggered from banner buttons/links
 * Frontend maps these to actual handlers
 */
export enum BannerActionType {
  /** Open external URL */
  Link = "link",
  /** Open API settings tab */
  ShowApiSettings = "show-api-settings",
  /** Open feature settings tab */
  ShowFeatureSettings = "show-feature-settings",
  /** Open account/login view */
  ShowAccount = "show-account",
  /** Set the active model */
  SetModel = "set-model",
  /** Trigger CLI installation flow */
  InstallCli = "install-cli",
}

/**
 * Banner data structure for backend-to-frontend communication.
 * Backend constructs this JSON, frontend renders it via BannerCarousel.
 */
export interface BannerCardData {
  /** Unique identifier for the banner (used for dismissal tracking) */
  id: string;

  /** Banner title text */
  title: string;

  /** Banner description/body markdown text */
  description: string;

  /**
   * Icon ID from Lucide icon set (e.g., "lightbulb", "megaphone", "terminal")
   * LINK: https://lucide.dev/icons/
   * Optional - if omitted, no icon is shown
   */
  icon?: string;

  /**
   * Optional footer action buttons
   * Rendered below the description as prominent buttons
   */
  actions?: BannerAction[];

  /**
   * Platform filter - only show on specified platforms
   * If undefined, show on all platforms
   */
  platforms?: ("windows" | "mac" | "linux")[];

  /** Only show to Cline users */
  isClineUserOnly?: boolean;
}

/**
 * Single action definition (button or link)
 */
export interface BannerAction {
  /** Button/link label text */
  title: string;

  /**
   * Action type - determines what happens on click
   * Defaults to "link" if omitted
   */
  action?: BannerActionType;

  /**
   * Action argument - interpretation depends on action type:
   * - Link: URL to open
   * - SetModel: model ID (e.g., "google/gemini-2.0-flash-exp")
   * - Others: generally unused
   */
  arg?: string;

  /**
   * Optional model picker tab to open when using SetModel action
   */
  tab?: "recommended" | "free";
}

/**
 * The list of predefined banner config rendered by the Welcome Section UI.
 * Hard-Locked for Gemini-Only Sovereign Architecture.
 */
export const BANNER_DATA: BannerCardData[] = [
  // Gemini 2.0 Flash banner
  {
    id: "gemini-2.0-flash-promo",
    icon: "sparkles",
    title: "Try Gemini 2.0 Flash",
    description: "Experience ultra-fast coding with Google's latest next-gen model.",
    actions: [
      {
        title: "Use Gemini 2.0 Flash",
        action: BannerActionType.SetModel,
        arg: "gemini-2.0-flash-exp",
        tab: "recommended",
      },
    ],
  },

  // Gemini Thinking banner
  {
    id: "gemini-thinking-promo",
    icon: "brain",
    title: "Advanced Thinking Mode",
    description: "Enable experimental thinking for complex architectural reasoning.",
    actions: [
      {
        title: "Try Thinking Mode",
        action: BannerActionType.SetModel,
        arg: "gemini-2.0-flash-thinking-exp-01-21",
        tab: "recommended",
      },
    ],
  },

  // Sovereign Hive Infrastructure info
  {
    id: "sovereign-hive-upgrade",
    icon: "shield-check",
    title: "Sovereign Hive Architecture",
    description:
      "Your extension has been upgraded to the Sovereign Hive baseline. Optimized exclusively for high-performance Gemini orchestration.",
    actions: [
      {
        title: "View Settings",
        action: BannerActionType.ShowApiSettings,
      },
    ],
  },

  // Jupyter Notebooks banner
  {
    id: "jupyter-notebooks-v1",
    icon: "book-open",
    title: "Jupyter Notebooks",
    description:
      "Comprehensive AI-assisted editing of `.ipynb` files with full cell-level context awareness.",
  },

  // Platform-specific banner (Windows)
  {
    id: "cli-info-windows-v1",
    icon: "terminal",
    title: "DietCode CLI",
    platforms: ["windows"] satisfies BannerCardData["platforms"],
    description:
      "Available for macOS and Linux. Coming soon to other platforms.",
  },

  // Info banner with inline link
  {
    id: "info-banner-v1",
    icon: "lightbulb",
    title: "Sovereign UI Tips",
    description:
      "For the best experience, keep the DietCode view in the sidebar to maintain full context awareness while coding.",
  },
];
