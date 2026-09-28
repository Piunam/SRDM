import type { ReactNode } from "react";
import { DocsSectionBar, DocsSidebar, type DocsNavGroup } from "./DocsSidebar";
import { OnThisPage } from "./OnThisPage";

/**
 * Three columns inside the 1280px container, under the fixed 56px header:
 * numbered nav, reading column, and the current section's sub-headings.
 * The right rail is hidden below 1024px; the nav becomes a sticky bar.
 */
export function DocsLayout({
  intro,
  groups,
  children,
}: {
  intro: ReactNode;
  groups: readonly DocsNavGroup[];
  children: ReactNode;
}) {
  return (
    <div data-doc-root className="mx-auto w-full max-w-[1280px] px-5 md:px-6 lg:px-8">
      <DocsSectionBar groups={groups} />
      {intro}
      <div
        data-doc-grid
        className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)_170px] lg:gap-7 xl:grid-cols-[240px_minmax(0,1fr)_200px] xl:gap-10"
      >
        <DocsSidebar groups={groups} />
        {/* A container so blocks can respond to the reading width, which is
            narrowest at 1024px where all three columns are on screen. */}
        <div className="@container min-w-0 max-w-[720px] pt-12 lg:pt-0">{children}</div>
        <OnThisPage />
      </div>
    </div>
  );
}
