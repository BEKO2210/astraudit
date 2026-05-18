/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireWatchNotification,
  notificationsAllowed,
  notificationsSupported,
  requestNotificationPermission,
} from "../../../src/lib/watch/notify";

const origNotification = (globalThis as { Notification?: unknown }).Notification;

afterEach(() => {
  if (origNotification === undefined) {
    delete (globalThis as { Notification?: unknown }).Notification;
  } else {
    (globalThis as { Notification?: unknown }).Notification = origNotification;
  }
  vi.restoreAllMocks();
});

describe("notificationsSupported", () => {
  it("returns false when window.Notification is missing", () => {
    delete (globalThis as { Notification?: unknown }).Notification;
    expect(notificationsSupported()).toBe(false);
  });

  it("returns true when window.Notification exists", () => {
    (globalThis as { Notification?: unknown }).Notification = function MockNotification() {};
    expect(notificationsSupported()).toBe(true);
  });
});

describe("notificationsAllowed", () => {
  beforeEach(() => {
    const Mock = function MockNotification() {} as unknown as {
      permission: NotificationPermission;
    };
    Mock.permission = "default";
    (globalThis as { Notification?: unknown }).Notification = Mock;
  });

  it("is false when permission is not granted", () => {
    expect(notificationsAllowed()).toBe(false);
  });

  it("is true when permission is granted", () => {
    (globalThis as unknown as { Notification: { permission: NotificationPermission } }).Notification.permission =
      "granted";
    expect(notificationsAllowed()).toBe(true);
  });
});

describe("requestNotificationPermission", () => {
  it("returns 'denied' when the API is missing", async () => {
    delete (globalThis as { Notification?: unknown }).Notification;
    await expect(requestNotificationPermission()).resolves.toBe("denied");
  });

  it("delegates to Notification.requestPermission when available", async () => {
    const Mock = vi.fn();
    (Mock as unknown as { requestPermission: () => Promise<NotificationPermission> }).requestPermission =
      vi.fn().mockResolvedValue("granted");
    (globalThis as { Notification?: unknown }).Notification = Mock;
    await expect(requestNotificationPermission()).resolves.toBe("granted");
  });
});

describe("fireWatchNotification", () => {
  it("returns null when permission is not granted", () => {
    delete (globalThis as { Notification?: unknown }).Notification;
    expect(fireWatchNotification({ title: "hello" })).toBeNull();
  });

  it("constructs a Notification when permission is granted", () => {
    const constructor = vi.fn();
    const Mock = function MockNotification(title: string, options?: NotificationOptions) {
      constructor(title, options);
      return { onclick: null, close: () => {} };
    } as unknown as { permission: NotificationPermission };
    Mock.permission = "granted";
    (globalThis as { Notification?: unknown }).Notification = Mock;
    fireWatchNotification({ title: "Score up", body: "facebook/react" });
    expect(constructor).toHaveBeenCalledWith(
      "Score up",
      expect.objectContaining({ body: "facebook/react" }),
    );
  });

  it("swallows constructor failures gracefully", () => {
    const Mock = function () {
      throw new Error("blocked by policy");
    } as unknown as { permission: NotificationPermission };
    Mock.permission = "granted";
    (globalThis as { Notification?: unknown }).Notification = Mock;
    expect(() => fireWatchNotification({ title: "boom" })).not.toThrow();
    expect(fireWatchNotification({ title: "boom" })).toBeNull();
  });
});
