import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { HOME } from "@/components/home/home-copy";

// The same mark as the header, copied rather than imported: SiteHeader is frozen.
function Glyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h2l1.5-4 2 8 2-6 1.5 2H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const link =
  "text-[14px] text-silver transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy";

/**
 * Rendered at the end of each page's <main>, not in layout.tsx — the layout is
 * on the do-not-touch list. See NOTES.md.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const { email, github } = siteConfig.contact;

  return (
    <footer className="border-t border-line bg-abyss px-5 pb-10 pt-16 md:px-20 md:pb-12 md:pt-20">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <Glyph />
              <span className="text-[14px] font-semibold tracking-[-0.2px]">{siteConfig.name}</span>
            </Link>
            <p className="mono-label mt-4 text-dim">{HOME.footer.tagline}</p>
            <p className="mono-label mt-1 text-faint tabular-nums">{year}</p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-3 md:items-center">
            {siteConfig.nav.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className={link}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="md:text-right">
            <p className="mono-caps text-faint">Contact</p>
            <p className="mono-label mt-3 break-words text-dim">{email}</p>
            {github && (
              <p className="mt-2">
                <a href={github} target="_blank" rel="noreferrer noopener" className={`${link} font-mono text-[12px]`}>
                  GitHub ↗
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-5">
          <p className="mono-label text-faint">{HOME.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
