/**
 * Calculates pricing details for a product variant.
 * If an explicit MRP exists and is higher than the selling price, it uses that.
 * Otherwise, computes a realistic grocery retail reference MRP (5-8% savings)
 * so that staples showcase Zepto-style savings (e.g. ₹33.00 ~~₹35~~ 6% OFF).
 */
export function calculatePricing(price, customMrp) {
  const numPrice = Number(price) || 0;
  let mrp = Number(customMrp);

  if (!mrp || mrp <= numPrice) {
    if (numPrice <= 30) {
      mrp = numPrice + 2;
    } else if (numPrice <= 100) {
      mrp = Math.round(numPrice * 1.06);
      if (mrp <= numPrice) mrp = numPrice + 2;
    } else if (numPrice <= 500) {
      mrp = Math.round(numPrice * 1.07);
      if (mrp <= numPrice) mrp = numPrice + 15;
    } else {
      mrp = Math.round(numPrice * 1.08);
      if (mrp <= numPrice) mrp = numPrice + 25;
    }
  }

  const savings = Math.max(0, mrp - numPrice);
  const discountPercent = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

  return {
    price: numPrice,
    mrp,
    savings,
    discountPercent
  };
}
