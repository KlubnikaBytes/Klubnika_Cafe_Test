const User = require('../models/User.js');
const Product = require('../models/Product.js');

// --- HELPER FUNCTION ---
const getEnrichedCart = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const cartItems = user.cart;
  if (cartItems.length === 0) return [];

  // CLEAN TITLES for Stock Check
  // "Extra Cheese (Paneer Pizza)" -> "Extra Cheese"
  const itemTitles = cartItems.map(item => {
    if (item.title.startsWith("Extra Cheese (")) {
      return "Extra Cheese";
    }
    return item.title;
  });

  const products = await Product.find({ name: { $in: itemTitles } });

  const stockMap = new Map();
  products.forEach(p => {
    stockMap.set(p.name, p.isInStock);
  });

  const enrichedCart = cartItems.map(item => {
    let cleanTitle = item.title;
    if (item.title.startsWith("Extra Cheese (")) {
      cleanTitle = "Extra Cheese";
    }

    const isInStock = stockMap.get(cleanTitle) ?? false;
    
    return {
      ...item.toObject(),
      isInStock: isInStock 
    };
  });
  
  return enrichedCart;
};


// @desc    Get user's cart
exports.getCart = async (req, res) => {
  try {
    const enrichedCart = await getEnrichedCart(req.user.id);
    res.json(enrichedCart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Add item to cart
exports.addToCart = async (req, res) => {
  const { title, price, image } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const existingItem = user.cart.find((item) => item.title === title);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const newItem = { title, price, image, quantity: 1 };
      user.cart.push(newItem);
    }

    await user.save();
    const enrichedCart = await getEnrichedCart(req.user.id);
    res.json(enrichedCart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Decrease item quantity in cart
exports.decreaseQuantity = async (req, res) => {
  const { title } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const existingItem = user.cart.find((item) => item.title === title);

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    if (existingItem.quantity > 1) {
      existingItem.quantity -= 1;
    } else {
      // If quantity hits 0, remove the item
      user.cart = user.cart.filter((item) => item.title !== title);
      
      // LOGIC: If we removed a Pizza, remove its Cheese too
      // If the removed title was "Chicken Pizza", we look for "Extra Cheese (Chicken Pizza)"
      const associatedCheeseTitle = `Extra Cheese (${title})`;
      user.cart = user.cart.filter((item) => item.title !== associatedCheeseTitle);
    }

    await user.save();
    const enrichedCart = await getEnrichedCart(req.user.id);
    res.json(enrichedCart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Remove item from cart completely
exports.removeFromCart = async (req, res) => {
  const { title } = req.body;

  try {
    const user = await User.findById(req.user.id);

    // 1. Remove the main item (The Pizza)
    user.cart = user.cart.filter((item) => item.title !== title);

    // 2. AUTOMATICALLY Remove the associated cheese
    // Construct the cheese title: "Extra Cheese (Pizza Name)"
    const associatedCheeseTitle = `Extra Cheese (${title})`;
    user.cart = user.cart.filter((item) => item.title !== associatedCheeseTitle);

    await user.save();
    const enrichedCart = await getEnrichedCart(req.user.id);
    res.json(enrichedCart);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Clear the entire cart
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = [];
    await user.save();
    res.json([]); 
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Merge guest cart
exports.mergeCart = async (req, res) => {
  const { guestCart } = req.body; 

  if (!guestCart || !Array.isArray(guestCart)) {
    return res.status(400).json({ error: 'Invalid guest cart data' });
  }

  try {
    const user = await User.findById(req.user.id);
    const dbCart = user.cart;

    for (const guestItem of guestCart) {
      const dbItemIndex = dbCart.findIndex(
        (item) => item.title === guestItem.title
      );

      if (dbItemIndex > -1) {
        dbCart[dbItemIndex].quantity += guestItem.quantity;
      } else {
        dbCart.push(guestItem);
      }
    }

    user.cart = dbCart;
    await user.save();
    const enrichedCart = await getEnrichedCart(req.user.id);
    res.json(enrichedCart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};