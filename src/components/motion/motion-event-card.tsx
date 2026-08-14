"use client";

import { motion, useReducedMotion } from "motion/react";

type MotionEventCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Adds a restrained entrance and layout transition to event cards while
 * leaving their server-rendered content and interactions unchanged.
 */
export function MotionEventCard({ children, className }: MotionEventCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className={className}
      layout={prefersReducedMotion ? false : "position"}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.article>
  );
}
