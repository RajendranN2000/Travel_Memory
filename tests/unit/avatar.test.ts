import { describe, expect, it } from "vitest";
import { avatarStoragePath, initialOf, isOwnedAvatarPath } from "@/features/account/avatar";

const USER = "6f1c2a4e-1b2c-4d3e-8f90-1234567890ab";
const OTHER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const FILE = "11111111-2222-4333-8444-555555555555";

describe("avatar paths", () => {
  it("builds paths inside the user's folder", () => {
    expect(avatarStoragePath(USER, FILE)).toBe(`${USER}/${FILE}.jpg`);
  });

  it("accepts the user's own well-formed path", () => {
    expect(isOwnedAvatarPath(USER, avatarStoragePath(USER, FILE))).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(isOwnedAvatarPath(USER, avatarStoragePath(OTHER, FILE))).toBe(false);
  });

  it.each([
    `${USER}/../${OTHER}/${FILE}.jpg`,
    `${USER}/${FILE}.png`,
    `${USER}/nested/${FILE}.jpg`,
    `${USER}/avatar.jpg`,
    `/${USER}/${FILE}.jpg`,
    "",
  ])("rejects malformed path %s", (path) => {
    expect(isOwnedAvatarPath(USER, path)).toBe(false);
  });
});

describe("initialOf", () => {
  it("prefers the display name, then the email", () => {
    expect(initialOf("hari", "x@example.com")).toBe("H");
    expect(initialOf(null, "zoe@example.com")).toBe("Z");
    expect(initialOf(null, null)).toBe("?");
    expect(initialOf("  ", null)).toBe("?");
  });
});
