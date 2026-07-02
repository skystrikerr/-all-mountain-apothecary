export default {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'heroEyebrow',
      title: 'Hero eyebrow text',
      type: 'string',
      description: 'Small text above the headline, e.g. "All Natural Remedies"',
    },
    { name: 'heroHeadline', title: 'Hero headline', type: 'string' },
    { name: 'heroSubtext', title: 'Hero subtext', type: 'text', rows: 3 },
    { name: 'heroCtaText', title: 'Hero button text', type: 'string' },
    { name: 'featuredHeading', title: 'Featured section heading', type: 'string' },
  ],
  preview: {
    prepare() {
      return { title: 'Home Page' }
    },
  },
}
