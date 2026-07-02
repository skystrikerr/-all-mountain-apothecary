export default {
  name: 'wholesalePage',
  title: 'Wholesale Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'subtitle', title: 'Subtitle', type: 'text', rows: 2 },
    {
      name: 'terms',
      title: 'Terms',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'term',
          fields: [
            { name: 'label', title: 'Label', type: 'string', description: 'e.g. "Minimum Order"' },
            { name: 'value', title: 'Value', type: 'string', description: 'e.g. "$300 wholesale"' },
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        },
      ],
    },
    { name: 'contactHeading', title: 'Contact heading', type: 'string' },
    { name: 'contactBody', title: 'Contact body', type: 'text', rows: 2 },
  ],
  preview: {
    prepare() {
      return { title: 'Wholesale Page' }
    },
  },
}
