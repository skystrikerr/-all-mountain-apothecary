import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="py-24 px-8 max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold text-apothecary-forest mb-4">Page not found</h1>
      <p className="text-gray-500 mb-8">
        The page you're looking for doesn't exist.
      </p>
      <Link href="/" className="text-apothecary-clay font-semibold hover:underline">
        Back to home →
      </Link>
    </div>
  )
}
