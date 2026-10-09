import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave, type SaveHandler } from "@/features/editor/use-autosave";

describe("useAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces and merges edits per key", async () => {
    const save = vi.fn<SaveHandler>(async () => ({ ok: true }));
    const { result } = renderHook(() => useAutosave({ save, delay: 1000 }));

    act(() => {
      result.current.schedule("trip", { title: "A" });
      result.current.schedule("trip", { title: "AB", description: "x" });
      result.current.schedule("photo:1", { caption: "hi" });
    });
    expect(result.current.status).toBe("pending");
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith("trip", { title: "AB", description: "x" });
    expect(save).toHaveBeenCalledWith("photo:1", { caption: "hi" });
    expect(result.current.status).toBe("saved");
    expect(result.current.hasPending()).toBe(false);
  });

  it("keeps failed changes, reports the error and retries with newer edits merged in", async () => {
    const save = vi
      .fn<SaveHandler>()
      .mockResolvedValueOnce({ ok: false, error: "Network down" })
      .mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAutosave({ save, delay: 500 }));

    act(() => result.current.schedule("trip", { title: "Old", description: "kept" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network down");
    expect(result.current.hasPending()).toBe(true);

    act(() => result.current.schedule("trip", { title: "New" }));
    let ok = false;
    await act(async () => {
      ok = await result.current.flush();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenLastCalledWith("trip", { title: "New", description: "kept" });
    expect(result.current.status).toBe("saved");
  });

  it("treats thrown errors as failures instead of claiming success", async () => {
    const save = vi.fn<SaveHandler>().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useAutosave({ save, delay: 100 }));
    act(() => result.current.schedule("trip", { title: "x" }));
    let ok = true;
    await act(async () => {
      ok = await result.current.flush();
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe("error");
  });

  it("never saves when disabled (demo mode)", async () => {
    const save = vi.fn<SaveHandler>(async () => ({ ok: true }));
    const { result } = renderHook(() => useAutosave({ save, delay: 100, enabled: false }));
    act(() => result.current.schedule("trip", { title: "x" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
