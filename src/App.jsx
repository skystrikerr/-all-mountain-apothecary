import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-apothecary-cream font-sans">

      {/* Navbar */}
      <nav className="bg-apothecary-forest text-apothecary-cream px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-wide">All Mountain Apothecary</span>
        <div className="flex gap-8 text-sm">
          <a href="#" className="hover:text-apothecary-clay transition-colors">Shop</a>
          <a href="#" className="hover:text-apothecary-clay transition-colors">Our Philosophy</a>
          <a href="#" className="hover:text-apothecary-clay transition-colors">Cart (0)</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-apothecary-forest text-apothecary-cream py-24 px-8 text-center">
        <p className="text-apothecary-clay uppercase tracking-widest text-sm mb-4">
          All Natural Remedies
        </p>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Handcrafted Elixirs &amp; Herbs
        </h1>
        <p className="max-w-xl mx-auto text-apothecary-cream/80 text-lg mb-10">
          Sourced from the heart of the mountains. Pure, potent, and mindfully
          crafted to restore natural balance to your body and spirit.
        </p>
        <a
          href="#"
          className="inline-block bg-apothecary-clay text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Explore the Collection
        </a>
      </section>

      {/* Featured Products Placeholder */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-apothecary-forest text-center mb-12">
          Featured Elixirs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {['Pine Resin Tincture', 'Wild Rose Hip Syrup', 'Elderberry Elixir'].map((name) => (
            <div
              key={name}
              className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-24 h-24 rounded-full bg-apothecary-moss/20 flex items-center justify-center">
                <span className="text-3xl">🌿</span>
              </div>
              <h3 className="text-apothecary-forest font-semibold">{name}</h3>
              <p className="text-sm text-gray-500 text-center">
                Small-batch crafted with wild-harvested mountain botanicals.
              </p>
              <button className="mt-auto text-sm text-apothecary-clay font-semibold hover:underline">
                Learn More →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-apothecary-forest text-apothecary-cream/60 text-center text-sm py-8 mt-auto">
        © {new Date().getFullYear()} All Mountain Apothecary. Crafted with care.
      </footer>

    </div>
  );
}
