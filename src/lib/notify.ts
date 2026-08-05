/**
 * Lightweight in-app notification system.
 *
 * Two layers:
 *
 *   1. **In-app toasts** — always work, no permissions needed. A queue
 *      of transient banners renders at the top of the app while it's
 *      open. Handled entirely by `NotifyProvider` in components/.
 *
 *   2. **System notifications (Notification API)** — optional and
 *      permission-gated. Fires alongside the in-app toast when the
 *      tab is hidden / backgrounded, so admins can react to payment
 *      verifications even if they've switched to WhatsApp or the
 *      screen is locked (assuming they've installed the PWA).
 *
 * The store publishes notifications by calling `emitNotification(...)`;
 * `NotifyProvider` subscribes and renders. Simple pub/sub avoids
 * plumbing the notification callback through every component that
 * might need to send one.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotifyTone = "info" | "success" | "warning" | "error";

export type Notification = {
  /** Unique id per notification, used for dedup + toast keys. */
  id: string;
  /** Short heading (1 line). */
  title: string;
  /** Optional body copy (1-2 lines). */
  body?: string;
  tone: NotifyTone;
  /** Emitted-at ms epoch. */
  createdAt: number;
  /** After how many ms the toast should auto-dismiss. Defaults to 5000. */
  ttlMs?: number;
};

// ---------------------------------------------------------------------------
// Pub/sub bus. Deliberately module-level so the store can emit
// notifications without needing a React context handle.
// ---------------------------------------------------------------------------

type Listener = (n: Notification) => void;

const listeners = new Set<Listener>();

export function subscribeToNotifications(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Emit a notification. Delivered to every subscribed listener; if
 * system-notification permission has been granted AND the user has
 * opted in AND the document is currently hidden, a system-level
 * Notification is also fired.
 */
export function emitNotification(
  input: Omit<Notification, "id" | "createdAt"> & { id?: string },
): Notification {
  const n: Notification = {
    id: input.id ?? Math.random().toString(36).slice(2, 10),
    title: input.title,
    body: input.body,
    tone: input.tone,
    createdAt: Date.now(),
    ttlMs: input.ttlMs,
  };
  for (const fn of listeners) {
    try {
      fn(n);
    } catch {
      // Never let one listener's error break another.
    }
  }
  maybeFireSystemNotification(n);
  return n;
}

// ---------------------------------------------------------------------------
// System (browser) notifications
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kasikash:notifications:optIn:v1";

/**
 * The current permission state as reported by the browser. Used by
 * the Settings toggle to render an accurate current state.
 */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Whether the user has opted in to system notifications via the
 * Settings toggle. Independent from the browser permission — a user
 * can revoke the permission at the browser level even after opting
 * in here.
 */
export function isSystemNotificationsOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setOptedIn(v: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * Ask the browser for notification permission and remember the
 * opt-in choice. Returns the final permission state.
 *
 * Should only be called in response to a user gesture (a button
 * click); browsers routinely block automatic prompts.
 */
export async function requestSystemNotifications(): Promise<NotificationPermission | "unsupported"> {
  const perm = notificationPermission();
  if (perm === "unsupported") return "unsupported";
  if (perm === "granted") {
    setOptedIn(true);
    return "granted";
  }
  if (perm === "denied") {
    // Can't prompt again from JS if the user (or a policy) said no.
    setOptedIn(false);
    return "denied";
  }
  const result = await Notification.requestPermission();
  setOptedIn(result === "granted");
  return result;
}

/**
 * Turn off system notifications. Clears the local opt-in flag but
 * doesn't touch the browser permission (only the user can revoke
 * that via their browser settings).
 */
export function disableSystemNotifications(): void {
  setOptedIn(false);
}

/**
 * If the tab is currently backgrounded (document.hidden === true) and
 * the user has opted in and the browser permission is granted, fire
 * a system-level Notification. Otherwise silently do nothing — the
 * in-app toast already delivered the message.
 */
function maybeFireSystemNotification(n: Notification): void {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!isSystemNotificationsOptedIn()) return;
  if (!document.hidden) return;
  try {
    const sysNotif = new Notification(n.title, {
      body: n.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "kasikash-" + n.id,
    });
    // Auto-close after a short window so the OS notification tray
    // doesn't accumulate stale entries.
    window.setTimeout(() => sysNotif.close(), 8000);
  } catch {
    // ignore — some browsers throw when called from a service worker
    // or when a notification has already been dismissed.
  }
}
