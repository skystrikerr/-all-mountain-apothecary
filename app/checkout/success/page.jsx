import { Suspense } from 'react'
import CheckoutSuccessContent from '../../../components/CheckoutSuccessContent'

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
