# UI_UX_PLAN.md

# Phase 5: UI/UX Plan - SHRI SIDDHIVINAYAK TRADING

## 1. Design System & Aesthetics
To create a premium grocery buying experience, the platform will utilize a curated color palette, modern typography, and responsive screen spacing.

### 1.1 Palette & Typography
- **Core Font:** `Outfit` (Primary headings, clean and friendly look) & `Inter` (Body copy, high readability on small screens).
- **Primary Color:** Forest Emerald (`#065F46` / `hsl(163, 88%, 20%)`) - represents freshness and organic grocery quality.
- **Secondary/Accent Color:** Warm Amber (`#D97706` / `hsl(35, 92%, 44%)`) - highlights CTA buttons, ratings, and price tags.
- **Base Neutral Light:** Soft Alabaster (`#F9FAFB` / `hsl(210, 20%, 98%)`) - background for clean cards.
- **Neutral Dark:** Charcoal Grey (`#111827` / `hsl(221, 39%, 11%)`) - provides crisp typography contrast.

### 1.2 Micro-Animations
- **Hover Transitions:** Scale items upward (`scale-102`) and darken background on buttons by `transition: all 0.2s ease-in-out`.
- **Cart Add Effect:** Brief bounce animation (using keyframe scales) on the header shopping cart icon when an item is added.
- **Progressive Image Load:** Blur-up effect using low-resolution placeholders until full-sized product assets load.
- **Loading State:** Shimmer skeletons for product list cards during catalog fetching.

---

## 2. Customer Views (Mobile-First Layout)

### 2.1 Home Page
- **Header:** Location selection, search button, cart icon with badge, and active status indicator of the store (Open/Closed).
- **Hero Banner Carousel:** High-quality sliding banners highlighting "Free doorstep delivery across Panvel" and "Trusted since 2007".
- **Category Grid:** Rounded circular icons for fast navigation (Groceries, Dairy, Snacks, Beverages, Household).
- **Featured Section:** Horizontal scrolling cards for top-selling items showing name, price, variant, and an immediate "Add" button.

### 2.2 Product Listing Page
- **Navigation:** Back button and persistent search bar at the top.
- **Filters Bar:** Sticky horizontal pill selectors for Subcategories and Brands.
- **Sorting Toggle:** Clean dropdown selector (Price: Low to High, Price: High to Low, Popularity).
- **Grid Layout:** 2-column mobile-optimized cards displaying product image, brand name, item name, default variant dropdown, price, and an add-to-cart stepper counter if already in cart.

### 2.3 Product Details Page
- **Visuals:** Swipeable large single image, back navigation link, and category path breadcrumb.
- **Core Info:** Title, brand label, price, and instock/out-of-stock badge.
- **Variant Selector:** Horizontal pill selector showing options (e.g., "1 Kg - ₹175", "5 Kg - ₹850"). Selecting a variant immediately updates the price, stock status, and add-to-cart buttons.
- **Collapsible Specs:** Rich descriptions, storage instructions, and local store assurance notes.

### 2.4 Cart Page
- **Item Cards:** Vertical list of selected items displaying thumbnail, title, selected variant text, single unit price, a quantity decrement/increment stepper, and a trash icon.
- **Summary Section:** Subtotal calculation, free delivery banner, and overall total.
- **Checkout CTA:** Sticky bottom drawer with user total and prominent "Proceed to Checkout" button. If the store is currently closed, this drawer is replaced with a warning banner stating "Orders disabled until store opens".

### 2.5 Checkout Page
- **Address Selection:** Circular radio buttons listing stored addresses, with a clean "+ Add New Address" drawer launcher.
- **Payment Selection:** Segmented control toggling:
  - Cash on Delivery (COD).
  - Pay via UPI (displays a static store QR code with instructions to pay and proceed).
- **Order Summary Card:** Collapsible list of items and final billing calculations.
- **Confirmation Button:** Sticky "Place Order" button that changes to a loading spinner during database validation.

### 2.6 Orders & Order Tracking Views
- **History List:** Tabbed display for "Active Orders" and "Past History". Each card shows Order ID, Date, Status Badge, Total Amount, and a "Reorder" button.
- **Reorder Action:** One-tap adds all active products in that order to the current cart. Unavailable products display a warning toast.
- **Tracking Progress Bar:** A stepped vertical list with status indicators (Pending -> Confirmed -> Packing -> Out for Delivery -> Delivered).
- **Out for Delivery Panel:** Once the status is active, a card expands showing the delivery agent's name, phone dialer link, and a secure verification QR code.
- **Store Contact Buttons:** Immediate direct triggers for "Call Store" (`tel:`) and "WhatsApp Chat" (`https://wa.me/`).

### 2.7 Profile Page
- **User Info:** Name and mobile number display, profile photo uploader.
- **Saved Addresses:** List view with "Edit", "Delete", and "Set Default" actions.
- **Logout Action:** Standard button to clear local storage credentials and redirect to home.

---

## 3. Admin Views (Responsive Web Dashboard)

### 3.1 Layout Structure
- **Sidebar Navigation:** Collapsible left drawer containing links to Dashboard, Products, Categories & Brands, Inventory, Orders, Audit Logs, and Store Settings.
- **Top Bar:** Notifications panel, logged-in admin identity profile, and emergency quick-toggle to close/open the store manually.

### 3.2 Dashboard View
- **Summary Metrics:** 4 primary widgets (Total Orders, Total Revenue, Customers Count, Low Stock Counts) with positive/negative trend percentages.
- **Visual Charts:** Line chart representing monthly sales revenue and bar chart representing order volumes by category.
- **Alert Panel:** Real-time stream of incoming orders (flashing yellow for Pending) and variants falling below the stock threshold.

### 3.3 Product Management View
- **Data Table:** Columns for image, name, SKU, brand, category, active variants count, and status toggle (Active/Inactive).
- **Product Modal:** Add/Edit form with inputs for metadata, brand, category, subcategory, image uploader, and variant definitions (Price, Stock, SKU, Barcode, Threshold).

### 3.4 Inventory Management View
- **Stock Grid:** List displaying SKU, product name, variant size, current stock, and a quick "Adjust" button.
- **Adjust Stock Drawer:** Pop-up displaying current stock and inputting +/- adjustments with selection lists for reason (e.g. Damage, Restocked, Manual Audit).

### 3.5 Orders Management View
- **Kanban Board or Tabbed List:** Columns for Pending, Confirmed, Processing, Packed, Out for Delivery.
- **Action Drawers:**
  - View details: Shows complete items list, totals, and address.
  - Assignments: Simple modal to enter Delivery Rider Name and Phone Number to trigger `OUT_FOR_DELIVERY` state and register QR tokens.
  - Manual Order: Simple form to lookup variants, select quantities, enter recipient phone/name, and click to complete immediate point-of-sale deduction.

### 3.6 Audit Logs View
- **Chronological Table:** Timestamps, Actor Name/ID, Table Modified, Action Type (Insert/Update/Delete), and a toggleable "View Changes" accordion which displays column comparison diffs in JSON structure.

---

## 4. Delivery Views (Unauthenticated Scanner)

### 4.1 Scanner Interface (`/delivery/scan`)
- **Camera Screen:** Black interface overlay with a centered green square scan bounds.
- **Instructional Label:** Text reading "Center the customer's order QR code within the box to verify delivery."
- **Camera Selection:** Dropdown selector to choose front/rear cameras on Android/iOS devices.

### 4.2 Verification Feedback Pages
- **Validation State:** Loading overlay displaying a spinner with message "Decrypting token and verifying signature..."
- **Success Screen:** Full-screen green overlay with a tick mark, order number, customer name, and message "Order DELIVERED successfully."
- **Error Screen:** Full-screen red overlay with an warning exclamation mark, indicating "Invalid Signature", "Expired Token", or "Order already delivered". Shows button to "Scan Again".
