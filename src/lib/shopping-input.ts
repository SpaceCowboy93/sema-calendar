/** Quantity entry accepts decimal digits only, without exponent notation. */
export const isShoppingQuantity = (value: string) => /^\d*$/.test(value)

/** Use the first attached item photo, with the legacy single-photo fallback. */
export function firstShoppingPhoto(item: { photo?: string; photos?: readonly string[] }): string | undefined {
  return item.photos?.find(photo => typeof photo === 'string' && photo.trim().length > 0)
    ?? (item.photo?.trim() ? item.photo : undefined)
}
