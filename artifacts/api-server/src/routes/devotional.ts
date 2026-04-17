import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];
const DEFAULT_VOICE: Voice = "onyx";

const audioCache = new Map<string, { buffer: Buffer; createdAt: number }>();
const AUDIO_CACHE_MS = 6 * 60 * 60 * 1000;

const LIST_URL = "https://www.pastorrick.com/devotional/";
const SITE_BASE = "https://www.pastorrick.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

type DevotionalCache = {
  fetchedAt: number;
  payload: {
    title: string;
    url: string;
    paragraphs: string[];
    text: string;
  };
};

let cache: DevotionalCache | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchDevotional(): Promise<DevotionalCache["payload"]> {
  const listRes = await fetchWithTimeout(LIST_URL);
  if (!listRes.ok) throw new Error(`Listing fetch failed: ${listRes.status}`);
  const listHtml = await listRes.text();

  const linkMatch = listHtml.match(
    /href="(\/current-teaching\/devotional\/[^"]+)"/
  );
  if (!linkMatch) throw new Error("No devotional link found in listing");
  const path = linkMatch[1];
  const detailUrl = SITE_BASE + path;

  const headingRe = new RegExp(
    `href="${path.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"[^>]*>[\\s\\S]*?<h2[^>]*>([^<]+)<\\/h2>`
  );
  const headingMatch = listHtml.match(headingRe);
  const title = headingMatch ? stripTags(headingMatch[1]) : "Daily Devotional";

  const detailRes = await fetch(detailUrl, { headers: { "User-Agent": UA } });
  if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);
  const html = await detailRes.text();

  const paragraphs: string[] = [];
  const paraRe = /<p[^>]*>([\s\S]{40,2000}?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(html))) {
    const text = stripTags(m[1]);
    if (text.length < 40) continue;
    if (/^Save\b/i.test(text)) {
      paragraphs.push(text.replace(/^Save\s*/i, ""));
    } else {
      paragraphs.push(text);
    }
  }

  const stopAt = paragraphs.findIndex((p) =>
    /If you just prayed to accept Jesus|email me at Rick@PastorRick/i.test(p)
  );
  const trimmed = stopAt >= 0 ? paragraphs.slice(0, stopAt) : paragraphs;

  if (trimmed.length === 0) throw new Error("No content paragraphs found");

  return {
    title,
    url: detailUrl,
    paragraphs: trimmed,
    text: trimmed.join("\n\n"),
  };
}

router.get("/daily-devotional", async (_req, res): Promise<void> => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    res.json(cache.payload);
    return;
  }
  try {
    const payload = await fetchDevotional();
    cache = { fetchedAt: Date.now(), payload };
    res.json(payload);
  } catch (err) {
    if (cache) {
      res.json(cache.payload);
      return;
    }
    res
      .status(502)
      .json({ error: (err as Error).message || "Failed to fetch devotional" });
  }
});

router.get("/daily-devotional/audio", async (req, res): Promise<void> => {
  const voiceParam = String(req.query["voice"] || DEFAULT_VOICE);
  const voice = (VOICES as readonly string[]).includes(voiceParam)
    ? (voiceParam as Voice)
    : DEFAULT_VOICE;

  try {
    let payload = cache?.payload;
    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_MS;
    if (!payload || !fresh) {
      try {
        payload = await fetchDevotional();
        cache = { fetchedAt: Date.now(), payload };
      } catch (err) {
        if (!payload) throw err;
      }
    }

    const cacheKey = `${payload!.url}::${voice}`;
    const cachedAudio = audioCache.get(cacheKey);
    if (cachedAudio && Date.now() - cachedAudio.createdAt < AUDIO_CACHE_MS) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(cachedAudio.buffer);
      return;
    }

    const speechText = `${payload!.title}. ${payload!.text}`;
    const buffer = await textToSpeech(speechText, voice, "mp3");

    audioCache.set(cacheKey, { buffer, createdAt: Date.now() });
    if (audioCache.size > 24) {
      const oldest = [...audioCache.entries()].sort(
        (a, b) => a[1].createdAt - b[1].createdAt
      )[0];
      if (oldest) audioCache.delete(oldest[0]);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (err) {
    res
      .status(502)
      .json({ error: (err as Error).message || "Failed to generate audio" });
  }
});

export default router;
