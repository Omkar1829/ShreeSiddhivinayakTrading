import { toast } from './toast';

export const downloadInvoicePdf = (order) => {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    toast.warning('Please allow popups to download/print the invoice.');
    return;
  }

  const subtotal = order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const grandTotal = Number(order.totalAmount);

  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 12px 8px; font-weight: 600; color: #1f2937; text-align: left;">
        ${item.productName}
        <div style="font-size: 10px; color: #6b7280; font-weight: normal; margin-top: 2px;">${item.variantName}</div>
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #4b5563;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: right; color: #4b5563;">₹${Number(item.price).toFixed(2)}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #111827;">₹${(Number(item.price) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #374151;
            background-color: #ffffff;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 20px;
            font-weight: 900;
            color: #111827;
            letter-spacing: -0.05em;
          }
          .store-info {
            text-align: right;
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
          }
          .title {
            font-size: 24px;
            font-weight: 900;
            color: #111827;
            margin-bottom: 24px;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 10px;
          }
          .details-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            font-size: 12px;
          }
          .details-section h4 {
            margin: 0 0 8px 0;
            color: #9ca3af;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.05em;
          }
          .details-section p {
            margin: 0;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 30px;
          }
          th {
            background-color: #f9fafb;
            color: #4b5563;
            font-weight: bold;
            padding: 10px 8px;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
          }
          .totals-table {
            width: 300px;
            margin-left: auto;
            font-size: 12px;
            border-collapse: collapse;
          }
          .totals-table tr td {
            padding: 6px 8px;
          }
          .grand-total {
            font-size: 16px;
            font-weight: 900;
            color: #111827;
            border-top: 2px solid #e5e7eb;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            line-height: 1.5;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="logo">SHRI SIDDHIVINAYAK TRADING</div>
              <p style="font-size: 11px; color: #4b5563; margin: 4px 0 0 0; font-weight: 600;">Kirana & Dairy Merchant</p>
            </div>
            <div class="store-info">
              <strong>Shri Siddhivinayak Trading</strong><br/>
              Shop No. 4, Uran Naka, Near Krishna Tower<br/>
              Panvel, Navi Mumbai, MH - 410206<br/>
              Phone: +91 9876543210
            </div>
          </div>

          <div class="title">INVOICE</div>

          <div class="details-grid">
            <div class="details-section">
              <h4>Billed To</h4>
              <p>
                <strong>${order.recipientName}</strong><br/>
                Phone: ${order.recipientPhone}<br/>
                Address: ${order.deliveryAddress}
              </p>
            </div>
            <div class="details-section" style="text-align: right;">
              <h4>Invoice Details</h4>
              <p>
                <strong>Order ID:</strong> ${order.orderNumber}<br/>
                <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}<br/>
                <strong>Payment Method:</strong> ${order.paymentMethod}<br/>
                <strong>Status:</strong> ${order.status}
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                <th style="text-align: left; padding: 8px;">Item Details</th>
                <th style="text-align: center; padding: 8px; width: 80px;">Qty</th>
                <th style="text-align: right; padding: 8px; width: 100px;">Price</th>
                <th style="text-align: right; padding: 8px; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #6b7280; text-align: left;">Subtotal</td>
              <td style="text-align: right; font-weight: 600; width: 120px;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; text-align: left;">Delivery Charge</td>
              <td style="text-align: right; font-weight: 600;">₹${deliveryCharge.toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td style="font-weight: bold; padding-top: 12px; text-align: left;">Grand Total</td>
              <td style="text-align: right; font-weight: 900; padding-top: 12px; font-size: 16px;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </table>

          <div class="footer">
            Thank you for shopping with Shri Siddhivinayak Trading!<br/>
            For any queries or support, contact Yatish or Manas at +91 9876543210.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
