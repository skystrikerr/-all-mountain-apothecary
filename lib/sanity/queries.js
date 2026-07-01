// Shared field projection for shop grid / featured cards.
const productCardFields = `
  _id,
  name,
  "slug": slug.current,
  tagline,
  category,
  images,
  retailPrice
`

export const featuredProductsQuery = `
  *[_type == "product" && isActive == true && isFeatured == true] | order(sortOrder asc) {
    ${productCardFields}
  }
`

export const activeProductsQuery = `
  *[_type == "product" && isActive == true] | order(sortOrder asc) {
    ${productCardFields}
  }
`

export const productBySlugQuery = `
  *[_type == "product" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    category,
    description,
    botanicals,
    images,
    volume,
    baseInfo,
    shelfLife,
    casePackSize,
    retailPrice,
    seo
  }
`

export const productSlugsQuery = `
  *[_type == "product" && isActive == true][].slug.current
`
