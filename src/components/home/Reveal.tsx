"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** 8px rise + fade, once, on entering the viewport. Inert under reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  const Plain = as === "li" ? "li" : "div";

  if (reduced) return <Plain className={className}>{children}</Plain>;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
