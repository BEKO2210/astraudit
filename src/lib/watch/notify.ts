/**
 * Browser-notification helper — Roadmap M7.1.4.
 *
 * Wraps the Notification API so the refresh-loop caller can fire
 * a desktop notification without dealing with permission rituals.
 * Strictly best-effort: every code path is a try/catch fallback,
 * so a browser that blocks notifications never crashes the app.
 *
 * Permission flow:
 *   - `notificationsSupported()` — false in SSR / older Safari.
 *   - `notificationsAllowed()` — true only when the API exists
 *     AND permission === 'granted'.
 *   - `requestNotificationPermission()` — prompts the user;
 *     stores nothing on our side. Pass-through to the platform.
 *   - `fireWatchNotification(opts)` — best-effort fire; no-op
 *     when permission is anything but 'granted'.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsAllowed(): boolean {
  if (!notificationsSupported()) return false;
  try {
    return Notification.permission === "granted";
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export interface NotifyOptions {
  title: string;
  body?: string;
  /** Optional tag so duplicate notifications coalesce. */
  tag?: string;
  /** Optional click handler to focus the tab / route. */
  onClick?: () => void;
}

export function fireWatchNotification(opts: NotifyOptions): Notification | null {
  if (!notificationsAllowed()) return null;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      // Reuse the favicon from the Vite base — the SVG-data-URL
      // icon in index.html doesn't render in OS notification
      // shelves, so the platform falls back to a generic icon.
      // That's deliberately fine; the title carries the brand.
    });
    if (opts.onClick) {
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* tab is blur-restricted */
        }
        opts.onClick?.();
        n.close();
      };
    }
    return n;
  } catch {
    return null;
  }
}
