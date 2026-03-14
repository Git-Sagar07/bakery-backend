const express  = require("express");
const router   = express.Router();

// ── Static product catalog (seeded from frontend's products.json)
// Images reference Unsplash fallbacks so they always load on any host
const PRODUCTS = [
  { id: "cake1",    name: "Chocolate Truffle Cake",   category: "cake",    price: 499, unit: "per cake",  image: "/assets/images/cake1.jpg",  description: "Rich dark chocolate layered cake topped with premium chocolate ganache." },
  { id: "cake2",    name: "Classic Vanilla Cake",      category: "cake",    price: 449, unit: "per cake",  image: "/assets/images/cake2.jpg",  description: "Moist vanilla sponge layered with smooth whipped cream, perfect for any celebration." },
  { id: "cake3",    name: "Red Velvet Cake",            category: "cake",    price: 599, unit: "per cake",  image: "/assets/images/cake3.jpg",  description: "Soft velvety layers with cream cheese frosting." },
  { id: "pastry1",  name: "Fresh Cream Pastries",       category: "pastry",  price: 60,  unit: "per piece", image: "/assets/images/pastry1.jpg",  description: "Assorted pastries including Black Forest, Butterscotch & Strawberry." },
  { id: "pastry2",  name: "Oreo Pastry",                category: "pastry",  price: 70,  unit: "per piece", image: "/assets/images/pastry2.jpg",  description: "Creamy pastry made with Oreo crumbs and rich whipped cream." },
  { id: "cookie1",  name: "Chocolate Chip Cookies",     category: "cookies", price: 199, unit: "250g",      image: "/assets/images/cookie1.jpg",  description: "Crispy edges with a soft center packed with chocolate chips." },
  { id: "cookies2", name: "Nankhatai",                   category: "cookies", price: 150, unit: "200g",      image: "/assets/images/cookie2.jpg",  description: "Traditional cardamom-flavoured shortbread biscuits." },
  { id: "cookies3", name: "Cake Rusk",                   category: "cookies", price: 120, unit: "per pack",  image: "/assets/images/cookie3.jpg",  description: "Crunchy twice-baked cake slices—perfect with tea." },
  { id: "cookies4", name: "Jeera Biscuits",              category: "cookies", price: 100, unit: "200g",      image: "/assets/images/cookie4.jpg",  description: "Crispy biscuits infused with roasted cumin seeds." },
  { id: "bread1",   name: "Fruit & Cheese Danishes",     category: "bread",   price: 70,  unit: "per piece", image: "/assets/images/bread1.jpg",  description: "Flaky pastry filled with fruit jam or sweet cream cheese." },
  { id: "bread2",   name: "Fresh Buns",                  category: "bread",   price: 25,  unit: "per piece", image: "/assets/images/bread2.jpg",  description: "Soft, fluffy buns—available in sweet and savory options." },
  { id: "bread3",   name: "Garlic Bread",                category: "bread",   price: 90,  unit: "per piece", image: "/assets/images/bread3.jpg",  description: "Freshly baked bread infused with garlic and herbs." },
  { id: "snack1",   name: "Specialty Bakery Snacks",     category: "snack",   price: 120, unit: "per pack",  image: "/assets/images/snack1.jpg",  description: "Handcrafted bakery snacks including khari, toast, and more." },
  { id: "snack2",   name: "Assorted Muffins",            category: "snack",   price: 150, unit: "3 pcs",     image: "/assets/images/snack2.jpg",  description: "Fluffy muffins in chocolate, blueberry and vanilla flavours." },
  { id: "snack3",   name: "Shankarpali",                 category: "snack",   price: 130, unit: "250g",      image: "/assets/images/snack3.jpg",  description: "Crispy diamond-shaped festive snack made with ghee." },
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
