export default {
  name: 'disclaimerPage',
  title: 'Terms of Use / Disclaimer',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'subtitle', title: 'Subtitle', type: 'string' },
    { name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] },
  ],
  preview: {
    prepare() {
      return { title: 'Terms of Use / Disclaimer' }
    },
  },
}
