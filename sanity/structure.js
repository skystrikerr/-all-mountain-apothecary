// Custom desk structure: page-content singletons get a fixed single entry
// (no list, no way to accidentally create a second "Home Page") while
// Products keep the normal create/list/delete document type behavior.
const SINGLETONS = [
  { id: 'homePage', title: 'Home Page' },
  { id: 'ourStoryPage', title: 'Our Story Page' },
  { id: 'wholesalePage', title: 'Wholesale Page' },
]

export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Products')
        .schemaType('product')
        .child(S.documentTypeList('product').title('Products')),
      S.divider(),
      ...SINGLETONS.map(({ id, title }) =>
        S.listItem()
          .title(title)
          .child(S.document().schemaType(id).documentId(id))
      ),
    ])
