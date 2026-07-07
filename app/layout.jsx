import './globals.css'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import SplashScreen from '../components/SplashScreen'
import { CartProvider } from '../components/CartContext'

export const metadata = {
  title: 'All Mountain Apothecary',
  description:
    'Small-batch herbal elixirs, wild-harvested and organically grown from the mountains of Pennsylvania.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-apothecary-cream font-sans flex flex-col">
        <SplashScreen />
        <CartProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
