/**
 * Responsive breakpoint constants aligned with Ant Design's grid system
 *
 * Breakpoints:
 * - xs: 0-575px (Mobile portrait)
 * - sm: 576-767px (Mobile landscape)
 * - md: 768-991px (Tablet)
 * - lg: 992-1199px (Desktop) - matches existing DashboardLayout Sider breakpoint
 * - xl: 1200-1599px (Large desktop)
 * - xxl: 1600px+ (Extra large desktop)
 */

export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

export const MEDIA_QUERIES = {
  xs: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px) and (max-width: ${BREAKPOINTS.xxl - 1}px)`,
  xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,

  // Semantic queries for common use cases
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,    // < 768px
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,  // 768-991px
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,       // >= 992px
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
export type MediaQuery = keyof typeof MEDIA_QUERIES;
