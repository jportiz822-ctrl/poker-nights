"use client";

import { useEffect, useState } from "react";

export function InstallHint() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hide-install-hint") === "1") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS-specific
      ((window.navigator as unknown as { standalone?: boolean }).standalone ?? false);
    if (standalone) return;
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIos(ios);
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="card border-chip-gold/40 space-y-2 relative">
      <button
        className="absolute top-2 right-3 text-felt-100/60 hover:text-white"
        onClick={() => {
          localStorage.setItem("hide-install-hint", "1");
          setShow(false);
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <p className="font-semibold">Add to home screen</p>
      {isIos ? (
        <p className="text-sm text-felt-100/80">
          Tap the <span className="font-semibold">Share</span> button in Safari, then{" "}
          <span className="font-semibold">Add to Home Screen</span>. The app launches full-screen
          like a real app.
        </p>
      ) : (
        <p className="text-sm text-felt-100/80">
          In your browser menu, tap <span className="font-semibold">Install app</span> or{" "}
          <span className="font-semibold">Add to Home Screen</span>.
        </p>
      )}
    </div>
  );
}
