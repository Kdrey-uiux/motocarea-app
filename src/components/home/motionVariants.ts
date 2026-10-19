/** Shared easing for landing-page animations */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Grid wrapper whose children animate in one after another */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
