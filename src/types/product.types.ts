export interface ProductRating {
  id: number
  name: string
  description: string
}

export interface ProductAccessoryData {
  id: number
  name: string
}

export interface ProductAccessory {
  id: number
  price: number
  data: ProductAccessoryData
}

export interface ProductData {
  id: number
  erpIndex?: string
  name: string
  offerType?: 1 | 2 | 3 | 4
}

export interface AppraisalProduct {
  id: number
  data: ProductData
  idVerto: string
  serialNumber: string | null
  declaredRating: ProductRating
  verifiedRating: ProductRating | null
  declaredAccessories: ProductAccessory[]
  verifiedAccessories: ProductAccessory[] | null
  accessoryComment: string
  priceTransfer: number | null
  priceGiftCard: number | null
  priceAllegro: number | null
  priceMinForClient: number | null
  priceFrontAfterExpertise: number | null
  hasPriceInDatabase: boolean
  internalNote: string
  warranty: boolean
  hasBox: boolean
  virtualProductName: string | null
}

export interface PriceDatabase {
  idVerto: string
  productName: string
  prices: {
    ratingId: number
    priceTransfer: number
    priceGiftCard: number
  }[]
}
