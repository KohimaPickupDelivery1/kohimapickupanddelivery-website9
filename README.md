# KPD Delivery V2

A mobile-first KPD delivery website based on the V2 specification.

## Included
- Professional black/gold home page
- Book-a-delivery form
- Automatic Order IDs
- WhatsApp order generation to **+91 8416005303**
- Call and WhatsApp buttons
- Distance-based pricing explanation (no fake fixed rate)
- Parcel, shop, food/essentials and document services
- How-it-works section
- Business partnership CTA
- Customer accounts and order history
- Order tracking by Order ID
- Persistent order data in `data/orders.json`
- Admin dashboard at `/admin`
- Admin can set quote and update delivery status
- Driver field is supported in the data model for the next driver app
- Payment status is supported in the data model
- Responsive/mobile-first UI

## Run locally
1. Install Node.js 18+.
2. In this folder run `npm install`.
3. Set an admin password (recommended):
   - Windows PowerShell: `$env:KPD_ADMIN_PASSWORD="your-password"`
   - Linux/macOS: `export KPD_ADMIN_PASSWORD="your-password"`
4. Run `npm start`.
5. Open `http://localhost:3000`.
6. Admin: `http://localhost:3000/admin`.

## Important
The WhatsApp number is already set to **8416005303** with India country code. Change `KPD_WHATSAPP` if the business number changes.

The website's real WhatsApp handoff works immediately. The quote/tracking/account/admin features require the Node server to be running; they are not available by opening `index.html` directly as a file.

### Production upgrades still requiring a third-party credential/service
- Online card/UPI payments need a payment gateway account (for example Razorpay/Stripe) and API keys.
- Automated SMS/WhatsApp Business API notifications need a provider/API credentials.
- Production-grade authentication should use a managed database and HTTPS.
- Live GPS driver tracking requires a driver app/device location service.
