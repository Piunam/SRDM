// Site-wide identity and navigation.

export type NavItem = { label: string; href: string; locked?: boolean };

export const siteConfig = {
  name: "[PROJECT NAME]",
  status: "PROTOTYPE · DEMO BUILD",
  nav: [
    { label: "System", href: "/system" },
    { label: "Demo", href: "/demo" },
    { label: "Live", href: "/live", locked: true },
  ] satisfies NavItem[] as NavItem[],
  headerHeight: 56,

  // Assets the owner drops in later. Anything left undefined renders as a
  // neutral "[ asset pending ]" frame instead of a broken element.
  assets: {
    stlUrl: undefined as string | undefined,
    demoVideoUrl: undefined as string | undefined,
    demoVideoPoster: undefined as string | undefined,
  },

  contact: {
    email: "TODO(owner)",
    github: undefined as string | undefined,
  },
} as const;
