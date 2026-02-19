import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface CatalogProduct {
  name: string
  accessories: string[]
}

// Universal accessories shown when product is NOT in the database
export const UNIVERSAL_ACCESSORIES = [
  'Ładowarka',
  'Bateria',
  'Kabel USB',
  'Pudełko',
  'Instrukcja',
  'Karta gwarancyjna',
  'Pasek',
  'Etui / Pokrowiec',
  'Dekiel przedni',
  'Dekiel tylny'
]

export const useProductCatalogStore = defineStore('productCatalog', () => {
  // --- State ---
  const products = ref<CatalogProduct[]>([])
  const loaded = ref(false)

  // --- Getters ---
  const productNames = computed(() => products.value.map((p) => p.name))

  // --- Actions ---
  async function loadCatalog(): Promise<void> {
    if (loaded.value) return
    try {
      const module = await import('@/mock/data/product-catalog.json')
      products.value = module.default as CatalogProduct[]
      loaded.value = true
    } catch {
      products.value = []
    }
  }

  /**
   * Search products by query string.
   * Matches anywhere in the product name, case-insensitive.
   * Returns max `limit` results, sorted by relevance:
   *  1. Starts with query (prefix match)
   *  2. Contains query (substring match)
   */
  function searchProducts(query: string, limit = 15): CatalogProduct[] {
    if (!query || query.length < 2) return []

    const q = query.toLowerCase().trim()
    const prefixMatches: CatalogProduct[] = []
    const substringMatches: CatalogProduct[] = []

    for (const product of products.value) {
      const nameLower = product.name.toLowerCase()
      if (nameLower.startsWith(q)) {
        prefixMatches.push(product)
      } else if (nameLower.includes(q)) {
        substringMatches.push(product)
      }
    }

    // Also search by individual words in query (e.g. "canon 5d" matches "Aparat Canon EOS 5D Mark IV Body")
    if (prefixMatches.length === 0 && substringMatches.length === 0) {
      const words = q.split(/\s+/).filter((w) => w.length >= 2)
      if (words.length > 1) {
        for (const product of products.value) {
          const nameLower = product.name.toLowerCase()
          if (words.every((w) => nameLower.includes(w))) {
            substringMatches.push(product)
          }
        }
      }
    }

    return [...prefixMatches, ...substringMatches].slice(0, limit)
  }

  /**
   * Find a product by exact name match (case-insensitive).
   */
  function findProduct(name: string): CatalogProduct | undefined {
    const nameLower = name.toLowerCase().trim()
    return products.value.find((p) => p.name.toLowerCase() === nameLower)
  }

  /**
   * Get accessories for a product.
   * If found in catalog → returns product-specific accessories.
   * If not found → returns universal accessories.
   */
  function getAccessoriesForProduct(name: string): { accessories: string[]; isFromCatalog: boolean } {
    const product = findProduct(name)
    if (product) {
      return { accessories: product.accessories, isFromCatalog: true }
    }
    return { accessories: [...UNIVERSAL_ACCESSORIES], isFromCatalog: false }
  }

  return {
    // State
    products,
    loaded,
    // Getters
    productNames,
    // Actions
    loadCatalog,
    searchProducts,
    findProduct,
    getAccessoriesForProduct
  }
})
