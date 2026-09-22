import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LiveSession } from "@/components/live/LiveSession";
import { LockScreen } from "@/components/live/LockScreen";
import {
  isLiveConfigured,
  LIVE_COOKIE,
  verifySession,
} from "@/lib/live/session";
import "./live.css";

export const metadata: Metadata = {
  title: "Live session",
  description:
    "Connect the demonstration device and compare its input and output audio.",
  openGraph: {
    title: "Live session",
    description:
      "A dummy connection flow with input and output audio, SNR, STOI and PESQ.",
    images: [
      { url: "/og/live.png", width: 1200, height: 630, alt: "Live session" },
    ],
  },
  robots: { index: false, follow: false },
};

/**
 * The gate is checked here, on the server, so the session UI is never sent to a
 * visitor without the cookie. It is a demonstration gate, not a security
 * boundary — see .env.example and NOTES.md.
 */
export default async function LivePage() {
  const cookieStore = await cookies();
  const unlocked = verifySession(cookieStore.get(LIVE_COOKIE)?.value);

  return (
    <>
      <main className="bg-abyss">
        {unlocked ? (
          <LiveSession />
        ) : (
          <LockScreen configured={isLiveConfigured()} />
        )}
      </main>
      {/* The lock screen stays bare; the footer only joins the unlocked session. */}
      {unlocked && <SiteFooter />}
    </>
  );
}
