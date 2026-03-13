const express  = require("express");
const router   = express.Router();

// ── Static product catalog (seeded from frontend's products.json)
// Images reference Unsplash fallbacks so they always load on any host
const PRODUCTS = [
  { id: "cake1",    name: "Chocolate Truffle Cake",   category: "cake",    price: 499, unit: "per cake",  image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80",  description: "Rich dark chocolate layered cake topped with premium chocolate ganache." },
  { id: "cake2",    name: "Classic Vanilla Cake",      category: "cake",    price: 449, unit: "per cake",  image: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400&q=80",  description: "Moist vanilla sponge layered with smooth whipped cream, perfect for any celebration." },
  { id: "cake3",    name: "Red Velvet Cake",            category: "cake",    price: 599, unit: "per cake",  image: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400&q=80",  description: "Soft velvety layers with cream cheese frosting." },
  { id: "pastry1",  name: "Fresh Cream Pastries",       category: "pastry",  price: 60,  unit: "per piece", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",  description: "Assorted pastries including Black Forest, Butterscotch & Strawberry." },
  { id: "pastry2",  name: "Oreo Pastry",                category: "pastry",  price: 70,  unit: "per piece", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80",  description: "Creamy pastry made with Oreo crumbs and rich whipped cream." },
  { id: "cookie1",  name: "Chocolate Chip Cookies",     category: "cookies", price: 199, unit: "250g",      image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80",  description: "Crispy edges with a soft center packed with chocolate chips." },
  { id: "cookies2", name: "Nankhatai",                   category: "cookies", price: 150, unit: "200g",      image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&q=80",  description: "Traditional cardamom-flavoured shortbread biscuits." },
  { id: "cookies3", name: "Cake Rusk",                   category: "cookies", price: 120, unit: "per pack",  image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80",  description: "Crunchy twice-baked cake slices—perfect with tea." },
  { id: "cookies4", name: "Jeera Biscuits",              category: "cookies", price: 100, unit: "200g",      image: "https://images.unsplash.com/photo-1582716401301-b2407dc7563d?w=400&q=80",  description: "Crispy biscuits infused with roasted cumin seeds." },
  { id: "bread1",   name: "Fruit & Cheese Danishes",     category: "bread",   price: 70,  unit: "per piece", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80",  description: "Flaky pastry filled with fruit jam or sweet cream cheese." },
  { id: "bread2",   name: "Fresh Buns",                  category: "bread",   price: 25,  unit: "per piece", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",  description: "Soft, fluffy buns—available in sweet and savory options." },
  { id: "bread3",   name: "Garlic Bread",                category: "bread",   price: 90,  unit: "per piece", image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400&q=80",  description: "Freshly baked bread infused with garlic and herbs." },
  { id: "snack1",   name: "Specialty Bakery Snacks",     category: "snack",   price: 120, unit: "per pack",  image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=80",  description: "Handcrafted bakery snacks including khari, toast, and more." },
  { id: "snack2",   name: "Assorted Muffins",            category: "snack",   price: 150, unit: "3 pcs",     image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80",  description: "Fluffy muffins in chocolate, blueberry and vanilla flavours." },
  { id: "snack3",   name: "Shankarpali",                 category: "snack",   price: 130, unit: "250g",      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80",  description: "Crispy diamond-shaped festive snack made with ghee." },
];

// ── GET /api/products  (optional ?category=cake) ─────────────
router.get("/", (req, res) => {
  const { category } = req.query;
  const result = category
    ? PRODUCTS.filter(p => p.category === category)
    : PRODUCTS;
  return res.json({ success: true, products: result });
});

// ── GET /api/products/:id ─────────────────────────────────────
router.get("/:id", (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  return res.json({ success: true, product });
});

module.exports = { router, PRODUCTS };
