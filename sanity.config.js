import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemaTypes'

// Hardcoded rather than pulled from sanity/env.js: this file builds via
// Sanity's own Vite-based CLI (sanity dev / sanity deploy), which doesn't
// inline Next.js's NEXT_PUBLIC_ env vars — those only get replaced by
// Next.js's own build. The project ID isn't a secret, so a literal here
// is simpler than wiring up a second, Studio-specific env convention.
const projectId = 'meyw672s'
const dataset = 'production'
const apiVersion = '2024-01-01'

export default defineConfig({
  name: 'default',
  title: 'All Mountain Apothecary',

  projectId,
  dataset,

  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],

  schema: {
    types: schemaTypes,
  },
})
