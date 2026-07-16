import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-apothecary-forest text-apothecary-cream/60 text-center text-sm py-8 px-8">
      <p>© {new Date().getFullYear()} All Mountain Apothecary. Crafted with care.</p>
      <p className="mt-3">
        <Link href="/disclaimer" className="underline hover:text-apothecary-cream transition-colors">
          Terms of Use &amp; Disclaimer
        </Link>
      </p>
      <p className="mt-4 max-w-2xl mx-auto text-xs text-apothecary-cream/40">
        These statements have not been evaluated by the Food and Drug
        Administration. These products are not intended to diagnose, treat,
        cure, or prevent any disease.
      </p>
    </footer>
  )
}
