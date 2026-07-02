export default {
  name: 'ourStoryPage',
  title: 'Our Story Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'subtitle', title: 'Subtitle', type: 'string' },
    { name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] },
    {
      name: 'stats',
      title: 'Stats row',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'stat',
          fields: [
            { name: 'value', title: 'Value', type: 'string', description: 'e.g. "2019" or "<200"' },
            { name: 'label', title: 'Label', type: 'string', description: 'e.g. "Founded · Pennsylvania Ridge"' },
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        },
      ],
    },
  ],
  preview: {
    prepare() {
      return { title: 'Our Story Page' }
    },
  },
}
