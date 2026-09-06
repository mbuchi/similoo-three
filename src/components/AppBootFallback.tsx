/**
 * The placeholder the Turnstile gate shows while it decides whether this
 * visitor is cleared.
 *
 * similoo-three has no shared AppShellSkeleton, so this mirrors the app's own
 * first paint: the landing view's background with a card-shaped skeleton where
 * the address search appears. It reuses the existing `.landing-view`,
 * `.landing-card` and `.skeleton` styles, so it is theme-aware and honors
 * prefers-reduced-motion for free. Skeleton, never a spinner, per the suite
 * standard.
 */
export function AppBootFallback() {
  return (
    <div className="landing-view" aria-busy="true" aria-live="polite">
      <div className="landing-card">
        <div className="skeleton" style={{ height: 34, width: '70%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 18, width: '90%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: '55%', marginBottom: 28 }} />
        <div className="skeleton" style={{ height: 48, width: '100%' }} />
      </div>
    </div>
  );
}
