import Stripe from 'stripe'

// Server-only. Never import this from a client component.
// Lazily constructed — constructing eagerly at module scope would throw
// during Next.js's build-time route analysis whenever STRIPE_SECRET_KEY
// isn't set (e.g. before Stripe is configured), breaking builds that
// don't even touch a Stripe route.
let _stripe

export function getStripe() {
  if (!_stripe) {
    // No explicit apiVersion — defaults to the version pinned by the
    // installed stripe SDK, the safest choice absent a specific need.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}
