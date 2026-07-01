import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '../../sanity/env'

// Server-only client, CDN disabled, for anything that must read a price
// that was just edited (checkout session creation). Never import this
// from a client component.
export const serverClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
})
