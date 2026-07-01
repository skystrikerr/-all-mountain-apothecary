import Stripe from 'stripe'

// Server-only. Never import this from a client component.
// No explicit apiVersion — defaults to the version pinned by the installed
// stripe SDK, which is the safest choice unless a specific version is needed.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
