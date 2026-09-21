// Worker-only subset of work.wk's src/data/helpArticles.ts — this app has
// no admin/manager screens at all, so only the "w-*" categories and
// worker-roled articles are ported here. Keep content in sync with the web
// file when either changes; the shape (HelpArticle/HelpCategoryDef) and
// helper functions are copied 1:1 so behaviour matches exactly.
import type { LucideIcon } from "lucide-react-native"
import { Briefcase, Clock, Rocket, Timer, User as UserIcon } from "lucide-react-native"

export interface HelpSection {
  heading?: string
  body?: string
  steps?: string[]
  bullets?: string[]
  note?: string
}

export interface HelpCategoryDef {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

export interface HelpArticle {
  slug: string
  title: string
  description: string
  category: string
  keywords: string[]
  content: HelpSection[]
  /** Slugs of other articles to surface as "Related articles". */
  related?: string[]
  /** Optional deep link into the real feature this article documents. */
  link?: { label: string; to: string }
}

export const HELP_CATEGORIES: HelpCategoryDef[] = [
  { id: "w-getting-started", label: "Getting Started", description: "Find your way around the worker app", icon: Rocket },
  { id: "w-jobs", label: "My Jobs & Shifts", description: "View, accept and manage your shifts", icon: Briefcase },
  { id: "w-clocking", label: "Clocking In & Out", description: "Start and finish work, on time", icon: Timer },
  { id: "w-timesheets", label: "Timesheets", description: "Your hours and pay records", icon: Clock },
  { id: "w-account", label: "Account & Troubleshooting", description: "Your profile and common issues", icon: UserIcon },
]

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "navigating-worker-dashboard",
    title: "Navigating the worker app",
    description: "A tour of Home, Jobs, Clock, Schedule and Profile.",
    category: "w-getting-started",
    keywords: ["worker", "dashboard", "home", "navigation"],
    link: { label: "Open Home", to: "/(tabs)" },
    content: [
      {
        body: "The bottom bar is how you get around: Home for a quick overview, Jobs for everything assigned to you, Clock to start or finish a shift, Schedule for your upcoming week, and Profile for your account and stats.",
      },
    ],
    related: ["viewing-your-assigned-jobs", "starting-work-clocking-in"],
  },
  {
    slug: "viewing-your-assigned-jobs",
    title: "Viewing your assigned jobs",
    description: "Where to find jobs you've been assigned, and what each status means.",
    category: "w-jobs",
    keywords: ["jobs", "shifts", "assigned", "pending", "status"],
    link: { label: "Open My Jobs", to: "/(tabs)/jobs" },
    content: [
      {
        body: "My Jobs lists everything assigned to you. Open Shifts (if enabled by your company) shows unfilled shifts you can pick up yourself, and Recurring shows any repeating schedule you're part of.",
      },
      {
        bullets: [
          "Pending — waiting on you to Accept or Decline",
          "Accepted — confirmed, upcoming",
          "In progress — you're currently clocked in",
          "Completed — the shift is finished",
          "Cancelled — called off",
        ],
      },
    ],
    related: ["accepting-or-declining-a-job", "starting-work-clocking-in"],
  },
  {
    slug: "accepting-or-declining-a-job",
    title: "Accepting or declining a job",
    description: "Confirm a shift you can work, or free it up for someone else.",
    category: "w-jobs",
    keywords: ["accept", "decline", "shift", "job"],
    content: [
      {
        body: "Open the job from My Jobs and use the Accept or Decline buttons. Declining frees the slot so it can be offered to or picked up by someone else — it doesn't affect any of your other shifts.",
      },
    ],
    related: ["cancelling-an-accepted-shift"],
  },
  {
    slug: "cancelling-an-accepted-shift",
    title: "Cancelling an accepted shift",
    description: "What to do if you can no longer work a shift you already accepted.",
    category: "w-jobs",
    keywords: ["cancel", "shift", "accepted"],
    content: [
      {
        body: "Open the job and select \"Cancel Shift\". You'll be asked for a reason before it's confirmed — cancelling removes you from the assignment so it can be reassigned.",
      },
    ],
    related: ["accepting-or-declining-a-job"],
  },
  {
    slug: "starting-work-clocking-in",
    title: "Starting work / clocking in",
    description: "How to clock in for an accepted shift.",
    category: "w-clocking",
    keywords: ["clock in", "start work", "shift"],
    link: { label: "Open Clock", to: "/(tabs)/clock" },
    content: [
      {
        body: "On the day of an accepted shift, open Clock and select \"Start Working Job\". This records your clock-in time and switches the job to in progress.",
      },
    ],
    related: ["finishing-your-shift", "location-checks-when-clocking-in"],
  },
  {
    slug: "finishing-your-shift",
    title: "Clocking out",
    description: "How to finish a shift once your work is done.",
    category: "w-clocking",
    keywords: ["clock out", "finish work", "finish shift"],
    content: [
      {
        body: "From the Clock screen while a shift is running, select \"Finish Work\" (or \"Finish Shift Instead\" if you need to end it early). This records your clock-out time.",
      },
      {
        note: "Your actual worked time is recorded as-is — it isn't capped to your scheduled hours, so finishing early or running long both show up accurately on your timesheet.",
      },
    ],
    related: ["starting-work-clocking-in", "viewing-your-timesheets"],
  },
  {
    slug: "location-checks-when-clocking-in",
    title: "Location checks when clocking in",
    description: "What happens if a job requires you to be on site to clock in.",
    category: "w-clocking",
    keywords: ["location", "gps", "geofence", "permission"],
    content: [
      {
        body: "Some jobs require location access to clock in. Depending on how the job is set up:",
      },
      {
        bullets: [
          "No location check — you can clock in from anywhere",
          "Record and flag — you can always clock in, but it's flagged for your manager if you were off site",
          "Require on site — clocking in outside the job's location is blocked; your manager can override this if needed",
        ],
      },
      {
        note: "If you're prompted for location permission, allow it — without it, a job set to \"Require on site\" won't let you clock in at all.",
      },
    ],
    related: ["starting-work-clocking-in"],
  },
  {
    slug: "viewing-your-timesheets",
    title: "Viewing your timesheets",
    description: "Where to see your worked hours and download a record of them.",
    category: "w-timesheets",
    keywords: ["timesheet", "hours", "download", "pay"],
    link: { label: "Download timesheet", to: "/(tabs)/profile/download-time-sheet" },
    content: [
      {
        body: "Your Profile screen shows a summary of hours worked, jobs completed and earnings for the current month. \"Download Timesheet\" gives you a copy of your worked hours to keep.",
      },
    ],
    related: ["finishing-your-shift"],
  },
  {
    slug: "notification-preferences",
    title: "Notification preferences",
    description: "Control which job alerts and reminders you get.",
    category: "w-account",
    keywords: ["notifications", "alerts", "reminders", "preferences"],
    link: { label: "Open Notification Preferences", to: "/(tabs)/profile/notifications" },
    content: [
      {
        body: "From Profile, open \"Notification Preferences\" to choose which job alerts and reminders you receive.",
      },
    ],
  },
  {
    slug: "managing-your-worker-account",
    title: "Managing your worker account",
    description: "Update your profile details or sign out.",
    category: "w-account",
    keywords: ["profile", "edit", "logout", "sign out", "account"],
    link: { label: "Edit Profile", to: "/(tabs)/profile/edit" },
    content: [
      {
        body: "Open Profile and select \"Edit Profile\" to update your details. Sign out from the logout option at the bottom of the Profile screen.",
      },
      {
        note: "If a job or feature you expect to see is missing, check with your manager — access to some features depends on your company's plan or on restrictions placed on your account.",
      },
    ],
    related: ["navigating-worker-dashboard"],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Same behaviour as work.wk's getArticlesForRole/getCategoriesForRole etc,
// minus the role parameter — every article here is already worker-only.

export function getCategories(): HelpCategoryDef[] {
  return HELP_CATEGORIES.filter(cat => HELP_ARTICLES.some(a => a.category === cat.id))
}

export function getArticlesByCategory(categoryId: string): HelpArticle[] {
  return HELP_ARTICLES.filter(a => a.category === categoryId)
}

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find(a => a.slug === slug)
}

export function getCategoryLabel(categoryId: string): string {
  return HELP_CATEGORIES.find(c => c.id === categoryId)?.label ?? categoryId
}

/**
 * Simple client-side search across title, description, category label and
 * keywords — good enough for a documentation set this size. Ranks title
 * matches above description/keyword-only matches.
 */
export function searchHelpArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return HELP_ARTICLES
    .map(article => {
      const title = article.title.toLowerCase()
      const inTitle = title.includes(q)
      const inDescription = article.description.toLowerCase().includes(q)
      const inCategory = getCategoryLabel(article.category).toLowerCase().includes(q)
      const inKeywords = article.keywords.some(k => k.toLowerCase().includes(q))
      const inBody = article.content.some(s =>
        s.body?.toLowerCase().includes(q) ||
        s.heading?.toLowerCase().includes(q) ||
        s.bullets?.some(b => b.toLowerCase().includes(q)) ||
        s.steps?.some(s2 => s2.toLowerCase().includes(q))
      )
      const matches = inTitle || inDescription || inCategory || inKeywords || inBody
      const rank = inTitle ? 3 : inDescription || inKeywords ? 2 : inCategory || inBody ? 1 : 0
      return { article, matches, rank }
    })
    .filter(r => r.matches)
    .sort((a, b) => b.rank - a.rank)
    .map(r => r.article)
}

export function getRelatedArticles(article: HelpArticle): HelpArticle[] {
  const bySlug = article.related
    ?.map(slug => getArticleBySlug(slug))
    .filter((a): a is HelpArticle => !!a) ?? []

  if (bySlug.length > 0) return bySlug.slice(0, 4)

  return HELP_ARTICLES.filter(a => a.category === article.category && a.slug !== article.slug).slice(0, 4)
}
