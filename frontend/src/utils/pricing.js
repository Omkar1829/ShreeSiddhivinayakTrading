/**
 * Calculates pricing details for a product variant.
 * Strictly respects:
 * 1. Active store offers assigned to this product (from storeSettings.store_offers)
 * 2. Explicit custom MRP if provided in the database (customMrp > sellingPrice)
 * If NO offer and NO custom MRP exists, displays exact regular price with NO fake savings or random percentages.
 */
export function calculatePricing(price, customMrp, productId, activeOffers = []) {
  const numPrice = Number(price) || 0;
  let parsedOffers = [];

  if (typeof activeOffers === 'string') {
    try {
      parsedOffers = JSON.parse(activeOffers);
    } catch (e) {
      parsedOffers = [];
    }
  } else if (Array.isArray(activeOffers)) {
    parsedOffers = activeOffers;
  }

  // 1. Check if this product has an active offer
  let applicableOffer = null;
  if (productId && Array.isArray(parsedOffers)) {
    applicableOffer = parsedOffers.find(
      (offer) =>
        offer.active !== false &&
        Array.isArray(offer.productIds) &&
        offer.productIds.includes(productId)
    );
  }

  if (applicableOffer) {
    const discountPercent = Number(applicableOffer.discountPercent) || 0;
    const flatDiscount = Number(applicableOffer.flatDiscount) || 0;

    let discountedPrice = numPrice;
    let mrp = Number(customMrp) || numPrice;

    if (discountPercent > 0) {
      discountedPrice = Math.max(1, Math.round(numPrice * (1 - discountPercent / 100)));
      mrp = numPrice;
      const savings = mrp - discountedPrice;
      return {
        price: discountedPrice,
        originalPrice: numPrice,
        mrp: mrp,
        savings,
        discountPercent,
        hasDiscount: true,
        offerTitle: applicableOffer.title || `${discountPercent}% OFF Offer`
      };
    } else if (flatDiscount > 0) {
      discountedPrice = Math.max(1, numPrice - flatDiscount);
      mrp = numPrice;
      const savings = flatDiscount;
      const pct = Math.round((savings / mrp) * 100);
      return {
        price: discountedPrice,
        originalPrice: numPrice,
        mrp: mrp,
        savings,
        discountPercent: pct,
        hasDiscount: true,
        offerTitle: applicableOffer.title || `₹${flatDiscount} OFF Offer`
      };
    }
  }

  // 2. Check if explicit MRP was provided and is higher than selling price
  const numMrp = Number(customMrp);
  if (numMrp && numMrp > numPrice) {
    const savings = numMrp - numPrice;
    const discountPercent = Math.round((savings / numMrp) * 100);
    return {
      price: numPrice,
      originalPrice: numPrice,
      mrp: numMrp,
      savings,
      discountPercent,
      hasDiscount: discountPercent > 0,
      offerTitle: null
    };
  }

  // 3. Standard clean pricing (NO random or fake discounts!)
  return {
    price: numPrice,
    originalPrice: numPrice,
    mrp: numPrice,
    savings: 0,
    discountPercent: 0,
    hasDiscount: false,
    offerTitle: null
  };
}
