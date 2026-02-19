export const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined) return '—'
  let priceAsFloat = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(priceAsFloat)) return '—'
  let result: string
  if (Math.round(priceAsFloat) !== priceAsFloat) {
    result = priceAsFloat.toFixed(2)
  } else {
    result = priceAsFloat.toString()
  }
  return result.replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' zł'
}
