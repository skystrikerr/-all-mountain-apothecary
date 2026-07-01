import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '../../sanity/env'

// Storefront reads. CDN-backed (~60s cache) — fast, cheap, fine for browsing.
// Never use this client to price a checkout session; see serverClient.js.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})
