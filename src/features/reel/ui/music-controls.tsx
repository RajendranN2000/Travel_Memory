"use client";

import { AudioWaveform, Check, Loader2, Music2, Pause, Play, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AUDIO_ACCEPT } from "../audio-engine";
import { formatDuration } from "../config";
import { Section, Slider } from "./controls";
import type { ReelStudioApi } from "./use-reel-studio";

/** Waveform of the loaded track with the trimmed region lit. */
function Waveform({ peaks, startFrac, endFrac }: { peaks: Float32Array; startFrac: number; endFrac: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const style = getComputedStyle(canvas);
    const lit = style.getPropertyValue("--primary").trim() || "#e6b06a";
    const bars = Math.floor(w / (3 * dpr));
    for (let i = 0; i < bars; i++) {
      const frac = i / bars;
      const peak = peaks[Math.min(peaks.length - 1, Math.floor(frac * peaks.length))] ?? 0;
      const bh = Math.max(2 * dpr, peak * h * 0.95);
      ctx.fillStyle = frac >= startFrac && frac <= endFrac ? lit : "rgba(255,255,255,0.22)";
      ctx.fillRect(i * 3 * dpr, (h - bh) / 2, 2 * dpr, bh);
    }
  }, [peaks, startFrac, endFrac]);
  return <canvas ref={ref} role="img" aria-label="Waveform of the music track" className="h-14 w-full rounded-lg bg-muted" />;
}

/** Original, royalty-free tracks that ship with the app, so a reel can have music without importing a file. */
const LIBRARY = [
  { file: "golden-hour", name: "Golden Hour", mood: "Warm and dreamy", bpm: 84 },
  { file: "open-road", name: "Open Road", mood: "Upbeat travel groove", bpm: 112 },
  { file: "quiet-shore", name: "Quiet Shore", mood: "Slow and calm", bpm: 66 },
  { file: "city-lights", name: "City Lights", mood: "Energetic night out", bpm: 124 },
] as const;

function MusicLibrary({ studio, current }: { studio: ReelStudioApi; current: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const pick = async (t: (typeof LIBRARY)[number]) => {
    setBusy(t.file);
    try {
      const res = await fetch(`/music/${t.file}.wav`);
      if (!res.ok) throw new Error("fetch");
      const blob = await res.blob();
      await studio.importMusic(new File([blob], `${t.name}.wav`, { type: "audio/wav" }));
    } catch {
      toast.error("That track couldn't be loaded. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <ul className="space-y-1.5" aria-label="Free music library">
      {LIBRARY.map((t) => {
        const active = current === `${t.name}.wav` || current === t.name;
        return (
          <li key={t.file}>
            <button
              type="button"
              disabled={!studio.audio.available || busy !== null}
              onClick={() => void pick(t)}
              aria-pressed={active}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2 text-left transition-all duration-200 outline-none hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary/10"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                {busy === t.file ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Music2 aria-hidden className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.mood} · {t.bpm} BPM
                </span>
              </span>
              {active ? <Check aria-hidden className="size-4 shrink-0 text-primary" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MusicControls({ studio }: { studio: ReelStudioApi }) {
  const { project, track, audio, setMusic } = studio;
  const music = project.music;
  const fileRef = useRef<HTMLInputElement>(null);
  const duration = track?.durationMs ?? audio.durationMs;
  const end = music.trimEndMs ?? duration;

  return (
    <div>
      <Section title="Music">
        <input
          ref={fileRef}
          type="file"
          accept={AUDIO_ACCEPT}
          className="sr-only"
          aria-label="Choose a music file from your device"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void studio.importMusic(file);
            e.target.value = "";
          }}
        />
        {!studio.capabilities.canMixAudio && studio.capabilities.canExport ? (
          <p className="rounded-lg bg-warning/15 p-3 text-xs text-warning">This browser can&apos;t mix music into the video, so exports will be silent.</p>
        ) : null}
        {track ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Music2 aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(track.durationMs)}
                  {track.beat ? ` · about ${Math.round(track.beat.bpm)} BPM` : ""}
                </p>
              </div>
              <Button size="icon-sm" variant="secondary" onClick={() => void studio.toggleTrackPreview()} aria-label={studio.trackPlaying ? "Pause music preview" : "Play music preview"}>
                {studio.trackPlaying ? <Pause /> : <Play />}
              </Button>
            </div>
            <Waveform peaks={track.peaks} startFrac={music.trimStartMs / Math.max(1, duration)} endFrac={end / Math.max(1, duration)} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}>
                <Upload data-icon="inline-start" /> Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={studio.removeMusic}>
                <Trash2 data-icon="inline-start" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={!studio.audio.available}>
              <Upload data-icon="inline-start" /> Import music
            </Button>
            {music.name ? (
              <p className="text-xs text-muted-foreground">
                This project used “{music.name}”. Music files aren&apos;t stored, so import it again to hear it.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a song from your device. It stays in your browser and is mixed into the video you download.</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Free tracks</h3>
          <MusicLibrary studio={studio} current={track?.name ?? ""} />
          <p className="text-xs text-muted-foreground">Original tracks made for this app. Free to use in any reel.</p>
        </div>
        <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          Only use music you have the right to use. Platforms like Instagram can mute or remove videos with unlicensed tracks.
        </p>
      </Section>

      {track ? (
        <>
          <Section title="Sound">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                {music.muted ? <VolumeX aria-hidden className="size-4" /> : <Volume2 aria-hidden className="size-4" />} Export a silent video
              </span>
              <Switch checked={music.muted} onCheckedChange={(muted) => setMusic({ muted })} aria-label="Export a silent video" />
            </div>
            <Slider label="Volume" value={Math.round(music.volume * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => setMusic({ volume: v / 100 }, "music-volume")} disabled={music.muted} />
            <Slider label="Fade in" value={music.fadeInMs} min={0} max={5000} step={100} format={(v) => `${(v / 1000).toFixed(1)}s`} onChange={(v) => setMusic({ fadeInMs: v }, "music-fade-in")} disabled={music.muted} />
            <Slider label="Fade out" value={music.fadeOutMs} min={0} max={6000} step={100} format={(v) => `${(v / 1000).toFixed(1)}s`} onChange={(v) => setMusic({ fadeOutMs: v }, "music-fade-out")} disabled={music.muted} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Keep music going across all clips</span>
              <Switch checked={music.loop} onCheckedChange={(loop) => setMusic({ loop })} aria-label="Repeat the music if it is shorter than the video" />
            </div>
            <p className="text-xs text-muted-foreground">{music.loop ? "The track repeats if the video is longer." : "The music stops when the track ends."}</p>
          </Section>
          <Section title="Trim">
            <Slider
              label="Start"
              value={music.trimStartMs}
              min={0}
              max={Math.max(100, end - 1000)}
              step={100}
              format={(v) => formatDuration(v)}
              onChange={(v) => setMusic({ trimStartMs: v }, "music-trim-start")}
            />
            <Slider
              label="End"
              value={end}
              min={Math.min(duration, music.trimStartMs + 1000)}
              max={duration}
              step={100}
              format={(v) => formatDuration(v)}
              onChange={(v) => setMusic({ trimEndMs: v >= duration - 50 ? null : v }, "music-trim-end")}
            />
          </Section>
          <Section title="Sync to the beat">
            {track.beat ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Found a steady pulse of about <strong className="text-foreground">{Math.round(track.beat.bpm)} BPM</strong>. Beat marks appear on the music track in the timeline.
                </p>
                <Button variant="secondary" className="w-full" onClick={studio.snapToBeat} disabled={project.clips.length === 0}>
                  <AudioWaveform data-icon="inline-start" /> Cut clips on the beat
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No steady beat was found in this track, so automatic beat sync isn&apos;t available. You can still set each clip&apos;s length by hand.</p>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
