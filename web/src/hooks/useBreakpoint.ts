import { useMediaQuery } from './useMediaQuery';
import { MEDIA_QUERIES } from '../utils/breakpoints';

/**
 * Breakpoint state interface
 */
export interface BreakpointState {
  /** True if viewport is < 768px (xs or sm) */
  isMobile: boolean;
  /** True if viewport is 768-991px (md) */
  isTablet: boolean;
  /** True if viewport is >= 992px (lg+) */
  isDesktop: boolean;

  /** True if viewport is 0-575px */
  xs: boolean;
  /** True if viewport is 576-767px */
  sm: boolean;
  /** True if viewport is 768-991px */
  md: boolean;
  /** True if viewport is 992-1199px */
  lg: boolean;
  /** True if viewport is 1200-1599px */
  xl: boolean;
  /** True if viewport is >= 1600px */
  xxl: boolean;

  /** Current active breakpoint */
  current: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

/**
 * Hook to get current responsive breakpoint state
 *
 * @returns BreakpointState object with boolean flags and current breakpoint
 *
 * @example
 * const { isMobile, isTablet, isDesktop, current } = useBreakpoint();
 *
 * // Use semantic flags
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 *
 * // Use specific breakpoints
 * if (xs || sm) {
 *   return <CompactView />;
 * }
 *
 * // Switch on current breakpoint
 * switch (current) {
 *   case 'xs': return <TinyView />;
 *   case 'sm': return <SmallView />;
 *   default: return <NormalView />;
 * }
 *
 * @performance
 * Call this hook once at the component root and pass values as props to children.
 * Avoid calling it in multiple child components (creates multiple media query listeners).
 */
export function useBreakpoint(): BreakpointState {
  // Semantic queries (most commonly used)
  const isMobile = useMediaQuery(MEDIA_QUERIES.mobile);
  const isTablet = useMediaQuery(MEDIA_QUERIES.tablet);
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop);

  // Specific breakpoint queries
  const xs = useMediaQuery(MEDIA_QUERIES.xs);
  const sm = useMediaQuery(MEDIA_QUERIES.sm);
  const md = useMediaQuery(MEDIA_QUERIES.md);
  const lg = useMediaQuery(MEDIA_QUERIES.lg);
  const xl = useMediaQuery(MEDIA_QUERIES.xl);
  const xxl = useMediaQuery(MEDIA_QUERIES.xxl);

  // Determine current breakpoint (priority order: xs > sm > md > lg > xl > xxl)
  let current: BreakpointState['current'] = 'lg';
  if (xs) current = 'xs';
  else if (sm) current = 'sm';
  else if (md) current = 'md';
  else if (xl) current = 'xl';
  else if (xxl) current = 'xxl';

  return {
    isMobile,
    isTablet,
    isDesktop,
    xs,
    sm,
    md,
    lg,
    xl,
    xxl,
    current,
  };
}
