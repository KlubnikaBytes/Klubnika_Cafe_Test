// frontend/src/context/CartContext.jsx

import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext"; // Import useAuth to check auth state

// 1. Create the context
const CartContext = createContext();

// Get API URL from .env
const API_URL = import.meta.env.VITE_API_URL;
const LOCAL_STORAGE_KEY = "klubnikaGuestCart";

// Helper function to parse price string (e.g., "₹39")
const parsePrice = (priceString) => {
  if (typeof priceString === "number") return priceString;
  if (typeof priceString !== "string") return 0;
  return parseInt(priceString.replace("₹", ""));
};

// 2. Create the provider component
export const CartProvider = ({ children }) => {
  // --- 1. GET THE 'logout' FUNCTION ---
  const { isAuthenticated, token, logout } = useAuth(); // Get auth state AND logout
  const [cartItems, setCartItems] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false); // For cart operations

  // --- 2. THIS 'useEffect' IS NOW MORE ROBUST ---
  useEffect(() => {
    if (isAuthenticated) {
      // User is logged in, fetch cart from DB
      setLoading(true);
      fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => { // Made this async to handle error JSON
          if (!res.ok) {
            // --- 3. HANDLE FETCH ERRORS ---
            if (res.status === 401) {
              // Token is expired or invalid
              logout(); // Log the user out immediately
            }
            // Throw an error to be caught by .catch()
            throw new Error('Failed to fetch cart');
          }
          // Only parse JSON if the response was OK
          return res.json();
        })
        .then((data) => {
          // --- 4. ENSURE DATA IS ALWAYS AN ARRAY ---
          setCartItems(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch cart:", err.message);
          // --- 5. CRITICAL: SET TO EMPTY ARRAY ON *ANY* FAILURE ---
          // This prevents the .reduce() crash
          setCartItems([]); 
        })
        .finally(() => setLoading(false));
    } else {
      // User is a guest, load from localStorage
      try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        setCartItems(localData ? JSON.parse(localData) : []);
      } catch (error) {
        console.error("Failed to load guest cart:", error);
        setCartItems([]);
      }
    }
  }, [isAuthenticated, token, logout]); // <-- 6. ADDED 'logout' TO DEPENDENCIES

  // --- Add a toast notification ---
  const addToast = (item) => {
    const id = Date.now();
    const newToast = {
      id,
      title: item.title,
      price: item.price,
      image: item.image,
    };
    setToasts((prevToasts) => [...prevToasts, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 3000); // Remove after 3 seconds
  };
  
  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // --- MODIFIED: Add item to cart (handles both auth states) ---
  const addToCart = async (item, isAddOn = false) => {
    addToast(item); // Show toast immediately

    if (isAuthenticated) {
      // --- LOGGED-IN LOGIC ---
      try {
        const res = await fetch(`${API_URL}/cart/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error('Failed to add item'); // Error check
        const updatedCart = await res.json();
        setCartItems(updatedCart);
      } catch (err) {
        console.error("Failed to add to DB cart", err);
        if (err.response && err.response.status === 401) logout();
      }
    } else {
      // --- GUEST LOGIC ---
      setCartItems((prevItems) => {
        const existingItem = !isAddOn
          ? prevItems.find((i) => i.title === item.title)
          : null;

        if (existingItem) {
          return prevItems.map((i) =>
            i.title === item.title ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          return [...prevItems, { ...item, quantity: 1 }];
        }
      });
    }
  };

  // --- MODIFIED: Decrease item quantity ---
  const decreaseCartQuantity = async (title) => {
    if (isAuthenticated) {
      // --- LOGGED-IN LOGIC ---
      try {
        const res = await fetch(`${API_URL}/cart/decrease`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error('Failed to decrease item');
        const updatedCart = await res.json();
        setCartItems(updatedCart);
      } catch (err) {
        console.error("Failed to decrease DB cart item", err);
        if (err.response && err.response.status === 401) logout();
      }
    } else {
      // --- GUEST LOGIC ---
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((i) => i.title === title);
        if (existingItem?.quantity === 1) {
          return prevItems.filter((i) => i.title !== title);
        } else {
          return prevItems.map((i) =>
            i.title === title ? { ...i, quantity: i.quantity - 1 } : i
          );
        }
      });
    }
  };

  // --- MODIFIED: Remove item from cart completely ---
  const removeFromCart = async (title) => {
    if (isAuthenticated) {
      // --- LOGGED-IN LOGIC ---
      try {
        const res = await fetch(`${API_URL}/cart/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error('Failed to remove item');
        const updatedCart = await res.json();
        setCartItems(updatedCart);
      } catch (err) {
        console.error("Failed to remove DB cart item", err);
        if (err.response && err.response.status === 401) logout();
      }
    } else {
      // --- GUEST LOGIC ---
      setCartItems((prevItems) => prevItems.filter((i) => i.title !== title));
    }
  };
  
  // --- NEW: Clear cart (after payment) ---
  const clearCart = async () => {
    if (isAuthenticated) {
       // --- LOGGED-IN LOGIC ---
       try {
        const res = await fetch(`${API_URL}/cart/clear`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to clear cart');
        const updatedCart = await res.json();
        setCartItems(updatedCart); // Should be []
      } catch (err) {
        console.error("Failed to clear DB cart", err);
        if (err.response && err.response.status === 401) logout();
      }
    } else {
      // --- GUEST LOGIC ---
      setCartItems([]);
    }
  };

  // --- NEW: Function to merge cart on login ---
  const mergeAndFetchCart = async (loginToken) => {
    const guestCart = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    
    if (guestCart.length > 0) {
      try {
        // Send the guest cart to the backend to be merged
        const res = await fetch(`${API_URL}/cart/merge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginToken}`
          },
          body: JSON.stringify({ guestCart })
        });
        if (!res.ok) throw new Error('Failed to merge cart');
        const mergedCart = await res.json();
        setCartItems(mergedCart); // Set the new merged cart
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear the guest cart
      } catch (err) {
        console.error("Failed to merge cart", err);
        // If merge fails, just fetch the user's existing cart
        fetchCart(loginToken);
      }
    } else {
      // If no guest cart, just fetch the user's cart
      fetchCart(loginToken);
    }
  };

  // --- NEW: Helper to fetch cart (used by merge) ---
  const fetchCart = async (loginToken) => {
    try {
      const res = await fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      setCartItems(data || []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setCartItems([]); // Set to empty on fail
    }
  };

  // --- NEW: Function to clear cart on logout ---
  const clearCartOnLogout = () => {
    setCartItems([]); // Just clear the state. localStorage is handled by effects.
  };

  // Get total price
  const getCartTotal = () => {
    // Added safety check
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => {
      return total + parsePrice(item.price) * item.quantity;
    }, 0);
  };

  // Get total item count
  const getItemCount = () => {
    // Added safety check
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        toasts,
        loading,
        addToCart,
        decreaseCartQuantity,
        removeFromCart,
        clearCart,
        getCartTotal,
        getItemCount,
        removeToast,
        mergeAndFetchCart,
        clearCartOnLogout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// 3. Create a custom hook to use the context easily
export const useCart = () => {
  return useContext(CartContext);
};