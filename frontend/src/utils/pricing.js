/**
 * Calculates pricing details for a product variant.
 * Strictly respects:
 * 1. Direct per-variant offers configured in Product management (storeSettings.store_variant_offers)
 * 2. Active store offers assigned to this product (from storeSettings.store_offers)
 * 3. Explicit custom MRP if provided (customMrp > sellingPrice)
 * If NO offer and NO custom MRP exists, displays exact regular price with NO fake savings or random percentages.
 */
export function calculatePricing(
  price,
  customMrp,
  productId = null,
  activeOffers = [],
  variantId = null,
  storeVariantOffers = null
) {
  const numPrice = Number(price) || 0;

  // Parse storeVariantOffers if passed as JSON string
  let parsedVariantOffers = {};
  if (typeof storeVariantOffers === 'string') {
    try {
      parsedVariantOffers = JSON.parse(storeVariantOffers);
    } catch (e) {
      parsedVariantOffers = {};
    }
  } else if (typeof storeVariantOffers === 'object' && storeVariantOffers !== null) {
    parsedVariantOffers = storeVariantOffers;
  }

  // Check product-level offer badge in parsedVariantOffers
  let productBadge = null;
  if (productId && parsedVariantOffers[productId]?.offerBadge) {
    productBadge = parsedVariantOffers[productId].offerBadge;
  }

  // 1. Check direct per-variant offer configured in Product management
  if (variantId && parsedVariantOffers[variantId]) {
    const vOffer = parsedVariantOffers[variantId];
    const offerPrice = Number(vOffer.price) > 0 ? Number(vOffer.price) : numPrice;
    const offerMrp = Number(vOffer.mrp) > 0 ? Number(vOffer.mrp) : (Number(customMrp) || numPrice);
    if (offerMrp > offerPrice) {
      const savings = offerMrp - offerPrice;
      const discountPercent = vOffer.discountPercent || Math.round((savings / offerMrp) * 100);
      return {
        price: offerPrice,
        originalPrice: offerMrp,
        mrp: offerMrp,
        savings,
        discountPercent,
        hasDiscount: true,
        offerTitle: vOffer.offerBadge || productBadge || `${discountPercent}% OFF`
      };
    }
  }

  // 2. Check active store promotions (store_offers)
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

  // 3. Check if explicit MRP was provided and is higher than selling price
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
      offerTitle: productBadge || null
    };
  }

  // 4. Standard clean pricing (NO random or fake discounts!)
  return {
    price: numPrice,
    originalPrice: numPrice,
    mrp: numPrice,
    savings: 0,
    discountPercent: 0,
    hasDiscount: false,
    offerTitle: productBadge || null
  };
}
