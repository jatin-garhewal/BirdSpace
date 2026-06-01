// BirdSpace — Express Backend
// Run: npm install express cors && node server.js

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend (index.html) as static files
app.use(express.static(path.join(__dirname)));

// ─── In-memory data (acts as our database) ───────────────────────────────────
let products = [
  { id: 1, name: "Wireless Noise-Cancelling Headphones", category: "Electronics", price: 3499, oldPrice: 4999, rating: 4.8, reviews: 342, emoji: "🎧", badge: "Best Seller", stock: 15, desc: "Premium sound quality with 30hr battery. Fold-flat design, comfortable ear cushions." },
  { id: 2, name: "Leather Minimalist Wallet",            category: "Accessories",  price: 899,  oldPrice: 1299, rating: 4.5, reviews: 189, emoji: "👜", badge: "Sale",        stock: 40, desc: "Slim genuine leather wallet, fits 8 cards and cash. RFID-blocking technology." },
  { id: 3, name: "Stainless Steel Water Bottle",         category: "Home & Kitchen", price: 649, oldPrice: null, rating: 4.7, reviews: 512, emoji: "🍶", badge: null,         stock: 60, desc: "Double-wall vacuum insulated. Keeps cold 24h, hot 12h. BPA-free, leak-proof lid." },
  { id: 4, name: "Mechanical Gaming Keyboard",           category: "Electronics", price: 5999, oldPrice: 7499, rating: 4.9, reviews: 278, emoji: "⌨️", badge: "New",          stock: 8,  desc: "TKL layout, Cherry MX Red switches, per-key RGB backlighting, aluminum frame." },
  { id: 5, name: "Bamboo Cutting Board Set",             category: "Home & Kitchen", price: 1249, oldPrice: null, rating: 4.6, reviews: 93, emoji: "🪵", badge: null,         stock: 25, desc: "Set of 3 eco-friendly bamboo boards. Juice groove, hanging hole, dishwasher safe." },
  { id: 6, name: "Polarized Sunglasses",                 category: "Accessories",  price: 1799, oldPrice: 2499, rating: 4.4, reviews: 211, emoji: "🕶️", badge: "Sale",        stock: 30, desc: "UV400 protection, lightweight TR90 frame, polarized lenses reduce glare by 99%." },
  { id: 7, name: "Yoga Mat Pro",                         category: "Sports",       price: 2199, oldPrice: 2999, rating: 4.7, reviews: 445, emoji: "🧘", badge: null,          stock: 20, desc: "6mm thick non-slip surface, eco-friendly TPE, includes carry strap. 183×61cm." },
  { id: 8, name: "Ceramic Pour-Over Coffee Set",         category: "Home & Kitchen", price: 1899, oldPrice: null, rating: 4.8, reviews: 167, emoji: "☕", badge: "New",       stock: 12, desc: "Includes dripper, carafe, and filters. Hand-crafted ceramic, heat-resistant glass." },
  { id: 9, name: "Resistance Band Set (5 levels)",       category: "Sports",       price: 699,  oldPrice: 999,  rating: 4.5, reviews: 338, emoji: "💪", badge: "Best Seller", stock: 50, desc: "5 resistance levels from 5–40 lbs. Latex-free, includes door anchor and handles." },
  { id: 10, name: "Desk Wireless Charger Pad",           category: "Electronics", price: 1299, oldPrice: 1799, rating: 4.6, reviews: 124, emoji: "🔋", badge: null,          stock: 35, desc: "15W fast charging, compatible with all Qi devices. Slim 8mm profile, LED indicator." },
  { id: 11, name: "Travel Neck Pillow",                  category: "Accessories",  price: 549,  oldPrice: 799,  rating: 4.3, reviews: 678, emoji: "🛫", badge: "Sale",        stock: 45, desc: "Memory foam, ergonomic U-shape. Washable velvet cover, compact carry pouch included." },
  { id: 12, name: "Adjustable Dumbbell Set",             category: "Sports",       price: 8999, oldPrice: 12999, rating: 4.9, reviews: 91, emoji: "🏋️", badge: "New",         stock: 6,  desc: "Replaces 15 dumbbells, 2.5–25 kg per hand. Quick-adjust dial, compact storage stand." },
];

let orders = [];   // simple in-memory order store
let nextOrderId = 1;

// ─── Helper ───────────────────────────────────────────────────────────────────
const respond = (res, data, status = 200) => res.status(status).json(data);

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET /api/products — list all, with optional filters
// ?category=Electronics&search=wireless&sort=price_asc|price_desc|rating
app.get("/api/products", (req, res) => {
  let result = [...products];
  const { category, search, sort } = req.query;

  if (category) result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
  if (search)   result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (sort === "price_asc")  result.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") result.sort((a, b) => b.price - a.price);
  if (sort === "rating")     result.sort((a, b) => b.rating - a.rating);

  respond(res, { success: true, count: result.length, products: result });
});

// GET /api/products/:id — single product
app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return respond(res, { success: false, message: "Product not found" }, 404);
  respond(res, { success: true, product });
});

// GET /api/categories — distinct categories
app.get("/api/categories", (req, res) => {
  const cats = [...new Set(products.map(p => p.category))];
  respond(res, { success: true, categories: cats });
});

// POST /api/orders — place an order
// Body: { items: [{ productId, qty }], customer: { name, email } }
app.post("/api/orders", (req, res) => {
  const { items, customer } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return respond(res, { success: false, message: "Order must contain at least one item" }, 400);
  }
  if (!customer?.name || !customer?.email) {
    return respond(res, { success: false, message: "Customer name and email are required" }, 400);
  }

  // Validate stock and calculate total
  let total = 0;
  const orderItems = [];
  for (const { productId, qty } of items) {
    const product = products.find(p => p.id === productId);
    if (!product) return respond(res, { success: false, message: `Product ${productId} not found` }, 404);
    if (product.stock < qty) return respond(res, { success: false, message: `Insufficient stock for "${product.name}"` }, 409);
    total += product.price * qty;
    orderItems.push({ productId, name: product.name, price: product.price, qty });
  }

  // Deduct stock
  orderItems.forEach(({ productId, qty }) => {
    products.find(p => p.id === productId).stock -= qty;
  });

  const order = {
    id: nextOrderId++,
    customer,
    items: orderItems,
    total,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  respond(res, { success: true, message: "Order placed successfully!", order }, 201);
});

// GET /api/orders — list all orders (admin)
app.get("/api/orders", (req, res) => {
  respond(res, { success: true, count: orders.length, orders });
});

// GET /api/health — health check
app.get("/api/health", (req, res) => {
  respond(res, { success: true, status: "BirdSpace API is running 🚀", timestamp: new Date().toISOString() });
});

// 404 fallback for unknown API routes
app.use("/api/*", (req, res) => {
  respond(res, { success: false, message: "Route not found" }, 404);
});

// Serve index.html for all non-API routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✅ BirdSpace server running at http://localhost:${PORT}`);
  console.log(`   API base: http://localhost:${PORT}/api`);
  console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
});
