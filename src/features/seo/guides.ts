import type { LucideIcon } from "lucide-react";
import { BookOpen, Camera, Clapperboard, Compass, Heart, Map as MapIcon, Share2, Sparkles } from "lucide-react";

export interface GuideSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  /** <title> and Open Graph title. */
  title: string;
  /** On-page H1. */
  h1: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  intro: string;
  sections: GuideSection[];
  faq: Array<{ q: string; a: string }>;
  cta: { label: string; href: string };
  /** ISO date; used for sitemap lastModified and Article schema. */
  updated: string;
}

export const guides: Guide[] = [
  {
    slug: "travel-photo-book-maker",
    title: "Travel Photo Book Maker: Design a Print-Ready Trip Album Online",
    h1: "Travel photo book maker for your best trips",
    description:
      "Design a travel photo book or magazine in your browser and export a print-ready PDF with bleed and crop marks. Photos stay on your device.",
    keywords: ["travel photo book maker", "photo book online", "trip photo album", "travel magazine layout", "print ready photo book pdf", "custom travel album"],
    icon: BookOpen,
    intro:
      "A camera roll is a lot of photos and very little story. A travel photo book turns one trip into something you can hold: a clear beginning, the best frames given room to breathe, and captions that remember what the photo can't.",
    sections: [
      {
        heading: "What makes a travel photo book worth keeping",
        body: [
          "The books people reopen are edited hard. Aim for 40 to 80 photos for a week-long trip rather than 400, and let the strongest shot of each day run full-page.",
          "Mix scale. A full-bleed landscape, then a page of three small details (a ticket, a street sign, a coffee cup), then a portrait. The rhythm is what makes a book feel designed instead of dumped.",
        ],
        bullets: ["Open with an arrival shot, end with a quiet one", "One idea per spread", "Write short captions: place, date, one detail"],
      },
      {
        heading: "Print-ready from the start",
        body: [
          "My Travel Memory builds the book at exact page sizes with bleed and crop marks, and exports a PDF with real text and photos at up to 300 DPI, so a print shop can use it directly.",
          "Photos are never cropped by accident. A frame crops only when you choose it, and you can see what is cut.",
        ],
      },
      {
        heading: "Private by design",
        body: ["The designer runs in your browser. Your photos and the finished PDF stay on your device instead of being uploaded to a server."],
      },
    ],
    faq: [
      { q: "Can I order the finished book from a print shop?", a: "Yes. Export the print-ready PDF and take it to any print service that accepts PDF files at the page size you chose." },
      { q: "How many photos should a travel photo book have?", a: "Most trip books work well with 40 to 80 carefully chosen photos. Fewer, larger photos feel more premium than a crowded grid." },
      { q: "Are my photos uploaded?", a: "No. The photo book designer works in your browser and keeps your photos on your device." },
    ],
    cta: { label: "Start a photo book", href: "/photo-books/start" },
    updated: "2026-10-01",
  },
  {
    slug: "travel-reel-maker",
    title: "Travel Reel Maker: Create Instagram Reels from Trip Photos",
    h1: "Make a travel reel from your photos in minutes",
    description:
      "Create a cinematic travel reel with music, motion and animated text, rendered in your browser and downloaded as an MP4 for Instagram, TikTok and YouTube Shorts.",
    keywords: ["travel reel maker", "instagram reel maker", "photo to video maker", "trip recap video", "travel video from photos", "tiktok travel video", "youtube shorts maker"],
    icon: Clapperboard,
    intro:
      "Short vertical video is where trips get shared now. A good travel reel is not a slideshow: it is cut to the music, opens on your best frame and keeps text readable on a phone screen.",
    sections: [
      {
        heading: "How to make a travel reel that people finish watching",
        body: [
          "Open with your most striking photo in the first second. Viewers decide almost instantly whether to keep watching.",
          "Keep it between 15 and 30 seconds. With photos that is roughly 8 to 12 images, each held for two to three seconds.",
        ],
        bullets: ["Cut on the beat of the song", "One line of text per photo, large and high-contrast", "Finish on a calm wide shot or a title card"],
      },
      {
        heading: "From photos to MP4",
        body: [
          "Pick a destination and template, add your photos, title and a few words, and My Travel Memory builds a polished first draft. Adjust timing, motion, text and music, then render and download an MP4.",
          "Reels are made in your browser, so your photos are not uploaded to create them.",
        ],
      },
      {
        heading: "Music and rights",
        body: ["You can import a song and trim it to the reel. Only use music you have the right to use on the platform you post to."],
      },
    ],
    faq: [
      { q: "What format is the reel?", a: "You download an MP4 rendered in your browser, suitable for Instagram Reels, TikTok and YouTube Shorts." },
      { q: "What aspect ratios can I use?", a: "The reel studio offers vertical, square and landscape layouts so you can match each platform." },
      { q: "Do I need to install an app?", a: "No. The reel studio runs in a modern desktop or mobile browser." },
    ],
    cta: { label: "Make a reel", href: "/create?intent=reel" },
    updated: "2026-10-01",
  },
  {
    slug: "digital-travel-journal",
    title: "Digital Travel Journal: Turn Photos into a Shareable Memory Page",
    h1: "A digital travel journal that looks like the place you visited",
    description:
      "Create an online travel journal page styled after your destination. Add photos, dates and your own words, then share it with a private link.",
    keywords: ["digital travel journal", "online travel diary", "travel memory page", "trip journal website", "shareable trip page", "travel scrapbook online"],
    icon: MapIcon,
    intro:
      "Paper travel journals are lovely and rarely finished. A digital travel journal keeps the part that matters, your photos and your own words, and does the layout for you.",
    sections: [
      {
        heading: "What to put in a travel journal page",
        body: ["You do not need to write an essay. Three or four honest lines per day beats a long post you never publish."],
        bullets: ["The one moment you want to remember", "A small detail: a smell, a dish, a stranger's kindness", "Where you were and when", "What you would tell a friend going there"],
      },
      {
        heading: "Designed around the destination",
        body: ["Each memory page takes its colours, type and mood from the place, from misty hill stations to sunny beaches, so a Munnar trip does not look like a Goa trip."],
      },
      {
        heading: "You decide who sees it",
        body: ["Keep a memory private, share it through an unlisted link, or make it public. Only public memories whose owners opt in are listed for search engines."],
      },
    ],
    faq: [
      { q: "Can I share my travel journal with friends and family?", a: "Yes. Share an unlisted link, or print the page to PDF to send it along." },
      { q: "Will search engines index my page?", a: "Only if you make it public and allow indexing. Private and unlisted memories are never listed in the sitemap." },
    ],
    cta: { label: "Create a memory page", href: "/create" },
    updated: "2026-10-01",
  },
  {
    slug: "instagram-photo-dump-ideas",
    title: "Instagram Photo Dump Ideas for Travel: A Simple Edit Guide",
    h1: "Travel photo dump ideas that actually flow",
    description:
      "How to pick, order and caption a travel photo dump or carousel so it looks effortless, plus how to turn the same photos into a reel.",
    keywords: ["instagram photo dump ideas", "travel photo dump", "instagram carousel travel", "photo dump captions", "how to order instagram photos", "travel instagram aesthetic"],
    icon: Camera,
    intro:
      "A photo dump looks casual, but the good ones are sequenced. Here is a simple way to pick and order photos so the carousel feels like a story.",
    sections: [
      {
        heading: "A simple order that works",
        body: ["Think in five beats and pick one to three photos for each."],
        bullets: ["Hook: your strongest, most colourful frame", "Context: a wide shot of where you are", "Details: food, textures, signs", "People: candid over posed", "Exit: something quiet and calm"],
      },
      {
        heading: "Keep the colour consistent",
        body: ["Pick one editing look and stick to it. Warm golden tones suit beaches, soft cool tones suit hill stations. Consistency matters more than strong filters."],
      },
      {
        heading: "Reuse the same photos as a reel",
        body: ["The photos you chose for the carousel already work as a reel. Add music and motion in the reel studio and post both."],
      },
    ],
    faq: [
      { q: "How many photos should a travel carousel have?", a: "Between 6 and 10 tends to hold attention. Instagram allows up to 20, but a tight edit usually performs better." },
      { q: "What should I write in the caption?", a: "A short line about the place or feeling, the location, and optionally one useful tip for someone planning the same trip." },
    ],
    cta: { label: "Turn photos into a reel", href: "/create?intent=reel" },
    updated: "2026-10-01",
  },
  {
    slug: "honeymoon-photo-book-ideas",
    title: "Honeymoon Photo Book Ideas: Layouts, Captions and Page Flow",
    h1: "Honeymoon photo book ideas you will keep for years",
    description: "Plan a honeymoon or couple's trip photo book: what to include, how to lay it out and how to caption it. Export a print-ready PDF.",
    keywords: ["honeymoon photo book", "couple travel album", "honeymoon album ideas", "anniversary trip photo book", "wedding trip memory book", "romantic travel scrapbook"],
    icon: Heart,
    intro: "A honeymoon is a few days you will want to revisit in detail. A small, well-edited book beats a folder of two thousand photos.",
    sections: [
      {
        heading: "What to include",
        body: ["Mix the postcard shots with the small stuff that was really yours."],
        bullets: ["The journey: tickets, airport, the first look at the view", "Both of you, candid and together", "Meals and little rituals", "A closing spread with one line each from both of you"],
      },
      {
        heading: "Layout tips",
        body: ["Let landscapes run full-page and group portraits in pairs. Use a handwritten-style caption font sparingly for notes, and a clean type for dates and places."],
      },
      {
        heading: "Make it a gift",
        body: ["Export the print-ready PDF and order copies for parents or for the two of you. Add a short dedication on the first page."],
      },
    ],
    faq: [
      { q: "How long should a honeymoon photo book be?", a: "Around 30 to 60 pages covers most trips. Fewer pages with bigger photos feel more intimate." },
      { q: "Can I add handwritten-style captions?", a: "Yes. The photo book designer includes script and handwritten-style fonts alongside clean text styles." },
    ],
    cta: { label: "Start a photo book", href: "/photo-books/start" },
    updated: "2026-10-01",
  },
  {
    slug: "kerala-goa-manali-trip-memories",
    title: "Kerala, Goa, Manali and Ooty Trip Memories: Photo and Reel Ideas",
    h1: "Capture your Munnar, Goa, Manali, Ooty and Wayanad trips",
    description:
      "Photo spots, shot ideas and memory page themes for popular Indian getaways: Munnar, Goa, Manali, Ooty and Wayanad. Turn them into pages, reels and books.",
    keywords: ["munnar trip photos", "goa trip memories", "manali trip reel", "ooty travel photos", "wayanad trip", "kerala travel photography", "india weekend getaways"],
    icon: Compass,
    intro: "India's hill stations and beaches photograph differently, so the best memories lean into the mood of each. Here is what to shoot and how to present it.",
    sections: [
      {
        heading: "Munnar and Wayanad: mist and green",
        body: ["Shoot early for fog over tea gardens. Keep the edit soft and cool, and use wide frames with a person for scale."],
      },
      {
        heading: "Goa: golden hour and street colour",
        body: ["Beach shots work best at sunrise and sunset. Add the details: shacks, scooters, painted houses. A warm, slightly golden look suits the page."],
      },
      {
        heading: "Manali and Ooty: mountains and toy trains",
        body: ["For Manali, snow and pine need a little extra exposure. For Ooty, tea slopes, the Nilgiri mountain railway and flower gardens make a clear storyline."],
      },
      {
        heading: "Pick a destination theme",
        body: ["Each destination in My Travel Memory has a matching theme, so your page and reel look like the place. Browse them all on the destinations page."],
      },
    ],
    faq: [
      { q: "Which destinations are supported?", a: "Munnar, Goa, Manali, Ooty and Wayanad have dedicated themes. Any other place uses a clean neutral theme." },
      { q: "Can I mix destinations in one memory?", a: "Each memory uses one destination theme, so create one memory per trip." },
    ],
    cta: { label: "Browse destinations", href: "/destinations" },
    updated: "2026-10-01",
  },
  {
    slug: "share-trip-photos-with-friends",
    title: "How to Share Trip Photos with Friends and Family (Privately)",
    h1: "Share your trip photos with the people who were there",
    description:
      "Compare ways to share travel photos: shared albums, messaging apps, memory pages and PDFs. Learn how to share privately with an unlisted link.",
    keywords: ["share trip photos", "share travel photos with friends", "private photo sharing link", "group trip album", "trip photos on whatsapp", "shared travel album"],
    icon: Share2,
    intro: "Group chats compress photos and bury them in a week. A dedicated page keeps a trip together and easy to find later.",
    sections: [
      {
        heading: "Pick the right format",
        body: ["Match the way you share to who you are sharing with."],
        bullets: ["Friends on the trip: an unlisted memory page link", "Family: a printed photo book or a PDF", "Followers: a short reel", "Everyone: a public page that can be found by search"],
      },
      {
        heading: "Privacy options",
        body: ["Memories can be private, unlisted (anyone with the link) or public. Unlisted links also avoid leaking through the referrer header."],
      },
      {
        heading: "WhatsApp-ready",
        body: ["Copy the link and paste it into your group chat. The page opens quickly on mobile and looks good in link previews."],
      },
    ],
    faq: [
      { q: "Can people find my unlisted memory in search?", a: "No. Unlisted and private memories are kept out of the sitemap and search listing." },
      { q: "Can I share a printable version?", a: "Yes. Use the print option to save a memory page as a PDF." },
    ],
    cta: { label: "Create a memory", href: "/create" },
    updated: "2026-10-01",
  },
  {
    slug: "trip-recap-video-ideas",
    title: "Trip Recap Video Ideas: Cinematic Travel Recaps from Photos",
    h1: "Trip recap video ideas that feel cinematic",
    description:
      "Simple structure, pacing and text ideas for a trip recap video made from photos. Build it in the My Travel Memory reel studio.",
    keywords: ["trip recap video", "travel recap reel", "cinematic travel video", "year in travel video", "slideshow with music", "travel montage"],
    icon: Sparkles,
    intro: "A recap video wins on structure. Give it a clear opening, a middle that builds and a closing frame, and the music does the rest.",
    sections: [
      {
        heading: "A 20-second structure",
        body: ["Plan the video as four short acts."],
        bullets: ["0 to 3 sec: title and best photo", "3 to 10 sec: the journey and the place", "10 to 17 sec: the details and people", "17 to 20 sec: a calm closing frame with the dates"],
      },
      {
        heading: "Text that reads on a phone",
        body: ["Keep text to a few words, use large type and leave margins so platform buttons don't cover it."],
      },
      {
        heading: "Motion",
        body: ["Slow zooms and gentle pans make still photos feel like footage. Keep the movement subtle and consistent."],
      },
    ],
    faq: [
      { q: "Can I use video clips?", a: "The reel studio is built around photos with motion, music and text." },
      { q: "How long should a recap be?", a: "Between 15 and 30 seconds suits reels and shorts. Go longer only if you have a strong story." },
    ],
    cta: { label: "Make a reel", href: "/create?intent=reel" },
    updated: "2026-10-01",
  },
];

const bySlug = new Map(guides.map((g) => [g.slug, g]));
export const getGuide = (slug: string) => bySlug.get(slug) ?? null;
