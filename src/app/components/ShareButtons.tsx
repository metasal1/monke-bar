"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";

function buildShareText(path: string, title?: string) {
  const base = "https://monke.bar";
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const label = title?.trim() || "monke.bar — THE MONKE BAR";
  return { url, text: `${label}\n${url}` };
}

function twitterIntent(url: string, text: string) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", text.split("\n")[0] || "monke.bar");
  u.searchParams.set("url", url);
  return u.toString();
}

function telegramIntent(url: string, text: string) {
  const u = new URL("https://t.me/share/url");
  u.searchParams.set("url", url);
  u.searchParams.set("text", text.split("\n")[0] || "monke.bar");
  return u.toString();
}

export default function ShareButtons({
  title,
  path: pathProp,
  className = "",
}: {
  title?: string;
  path?: string;
  className?: string;
}) {
  const [path, setPath] = useState(pathProp || "/");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pathProp) {
      setPath(pathProp);
      return;
    }
    if (typeof window === "undefined") return;
    const sync = () => setPath(window.location.pathname + window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    const id = window.setInterval(sync, 800);
    return () => {
      window.removeEventListener("popstate", sync);
      window.clearInterval(id);
    };
  }, [title, pathProp]);

  const { url, text } = buildShareText(path, title);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("share", { method: "copy", path });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [url, path]);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      role="group"
      aria-label="Share"
    >
      <span className="text-[9px] text-muted sm:text-[10px]">Share</span>
      <a
        href={twitterIntent(url, text)}
        target="_blank"
        rel="noopener noreferrer"
        className="border-2 border-border bg-wood px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana sm:text-[10px]"
        onClick={() => track("share", { method: "twitter", path })}
      >
        X
      </a>
      <a
        href={telegramIntent(url, text)}
        target="_blank"
        rel="noopener noreferrer"
        className="border-2 border-border bg-wood px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana sm:text-[10px]"
        onClick={() => track("share", { method: "telegram", path })}
      >
        TG
      </a>
      <button
        type="button"
        onClick={() => void copy()}
        className="border-2 border-border bg-wood px-3 py-2 text-[9px] text-banana pixel-btn hover:border-banana sm:text-[10px]"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}
