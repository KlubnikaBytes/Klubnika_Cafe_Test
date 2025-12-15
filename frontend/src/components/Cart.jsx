import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "./LocationPicker";
import Loader from "./Loader";

const API_URL = import.meta.env.VITE_API_URL;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const loadRazorpayScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Cart = () => {
  const {
    cartItems,
    removeFromCart,
    getCartTotal,
    addToCart,
    decreaseCartQuantity,
    clearCart,
  } = useCart();
  const { isAuthenticated, user } = useAuth(); 
  const navigate = useNavigate();

  // --- LOADING STATE ---
  const [loading, setLoading] = useState(true);

  // --- Effect to handle initial Page Load ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // --- STATE FOR DELIVERY ---
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);

  // --- STRUCTURED ADDRESS STATE ---
  const [address, setAddress] = useState({
    houseNo: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    phone: user?.mobile || "",
  });

  // --- Handle Map Selection & Auto-fill ---
  const handleLocationSelect = (coords, inRange, addressDetails) => {
    setDeliveryCoords(coords);
    setIsWithinRange(inRange);

    if (addressDetails) {
      const matchedState = INDIAN_STATES.find(s =>
        addressDetails.state && s.toLowerCase() === addressDetails.state.toLowerCase()
      ) || addressDetails.state || "";

      setAddress((prev) => ({
        ...prev,
        houseNo: addressDetails.house_number || "",
        street: addressDetails.road || addressDetails.suburb || "",
        city: addressDetails.city || addressDetails.town || addressDetails.village || "",
        state: matchedState,
        pincode: addressDetails.postcode || "",
      }));
    }
  };

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const hasSoldOutItem = cartItems.some((item) => !item.isInStock);

  // --- VALIDATION ---
  const isAddressComplete =
    address.houseNo.trim() !== "" &&
    address.street.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim() !== "" &&
    address.pincode.trim() !== "" &&
    address.phone.trim() !== "";

  const canCheckout =
    isAuthenticated &&
    isWithinRange &&
    !hasSoldOutItem &&
    isAddressComplete;

  const handleCheckout = async () => {
    if (!canCheckout) {
      if (!isAuthenticated) return navigate("/auth");
      if (!isWithinRange) return alert("Your location is outside our delivery range.");
      if (hasSoldOutItem) return alert("Please remove sold-out items.");
      if (!isAddressComplete) return alert("Please fill in all required address fields.");
      return;
    }

    setLoading(true); 

    // 1. Retrieve token FRESH from localStorage ('klubnikaToken')
    const currentToken = localStorage.getItem('klubnikaToken');

    if (!currentToken) {
      alert("Your session has expired. Please login again.");
      setLoading(false);
      navigate("/auth");
      return;
    }

    const formattedAddress = `
      ${address.houseNo}, ${address.street}
      ${address.landmark ? "Landmark: " + address.landmark : ""}
      ${address.city}, ${address.state} - ${address.pincode}
      Phone: ${address.phone}
    `.trim();

    const res = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      alert("Failed to load payment gateway.");
      setLoading(false);
      return;
    }

    try {
      const amount = getCartTotal();
      
      // Create Order
      const orderRes = await fetch(`${API_URL}/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to create order");
      }
      const order = await orderRes.json();

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Klubnika Website",
        description: "Food & Beverage Order",
        order_id: order.id,

        // --- HANDLER FOR SUCCESSFUL PAYMENT ---
        handler: async function (response) {
          try {
            setLoading(true);
            
            // RE-FETCH TOKEN INSIDE HANDLER ('klubnikaToken')
            const freshToken = localStorage.getItem('klubnikaToken');
            
            if (!freshToken) {
               throw new Error("Authentication lost during payment. Please login.");
            }

            const verifyRes = await fetch(`${API_URL}/payment/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${freshToken}`, 
              },
              body: JSON.stringify({
                ...response,
                cartItems: cartItems.map((item) => ({
                  title: item.title,
                  price: item.price,
                  image: item.image,
                  quantity: item.quantity,
                })),
                deliveryAddress: formattedAddress,
                deliveryCoords: deliveryCoords,
                totalAmount: amount,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              alert("Payment successful! Your order is confirmed.");
              clearCart();
              navigate("/my-orders");
            } else {
              alert(verifyData.message || "Payment verification failed.");
            }
          } catch (err) {
            console.error(err);
            alert("Payment verification failed: " + err.message);
          } finally {
            setLoading(false);
          }
        },
        
        // --- FORCING THE USER DATA & DISABLING CACHE ---
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "", // Forces the logged-in user's mobile
        },
        readonly: {
          contact: true, // Users cannot edit the phone number in the popup
          email: true,   // Users cannot edit the email
        },
        remember_customer: false, // Attempts to disable Flash Checkout memory
        
        theme: {
          color: "#f43f5e",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
      rzp.on('payment.failed', function (response){
         setLoading(false); 
         alert("Payment Failed: " + response.error.description);
      });

    } catch (err) {
      alert(err.message || "Error starting payment. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto min-h-screen pt-32 pb-20 px-4">
      <h1 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-8 md:mb-12">
        Your Cart
      </h1>

      {cartItems.length === 0 ? (
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-6">Your cart is empty.</p>
          <Link to="/dishes" className="px-6 py-3 bg-primary text-white rounded-full font-semibold shadow hover:bg-opacity-90 transition cursor-pointer">
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          {/* --- Cart Items --- */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="bg-white rounded-2xl shadow-xl divide-y divide-gray-200">
              {cartItems.map((item) => {
                const isAvailable = item.isInStock;
                return (
                  <div key={item.title} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 gap-4 ${!isAvailable ? "opacity-50 bg-gray-50" : ""}`}>
                    
                    {/* Image & Details */}
                    <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-lg shadow-md shrink-0" 
                        onError={(e) => { e.target.src = 'https://placehold.co/400x400/27272a/737373?text=Image+Missing'; }} 
                      />
                      <div className="flex-1">
                        <h3 className="text-base md:text-xl font-bold text-gray-900 leading-tight">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-lg font-semibold text-primary">{item.price}</span>
                             {!isAvailable && <span className="text-red-600 font-bold text-xs border border-red-600 px-1 rounded">SOLD OUT</span>}
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 mt-1 md:mt-0">
                      <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                        <button onClick={() => decreaseCartQuantity(item.title)} disabled={!isAvailable} className="h-8 w-8 flex items-center justify-center bg-white text-gray-800 rounded-full font-bold text-lg shadow-sm hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">-</button>
                        <span className="text-lg font-semibold text-gray-900 w-6 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item)} disabled={!isAvailable} className="h-8 w-8 flex items-center justify-center bg-white text-gray-800 rounded-full font-bold text-lg shadow-sm hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">+</button>
                      </div>
                      
                      <button onClick={() => removeFromCart(item.title)} className="px-4 py-2 bg-red-100 text-red-600 rounded-full font-semibold text-sm hover:bg-red-600 hover:text-white transition cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- DELIVERY & ADDRESS SECTION --- */}
          <div className="max-w-3xl mx-auto mt-10 p-4 md:p-6 bg-gray-800 rounded-2xl shadow-lg">
            <LocationPicker onLocationSelect={handleLocationSelect} />
            
            <h3 className="text-xl font-semibold text-white mb-4 pt-4 border-t border-gray-700 mt-4">2. Delivery Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">House No / Flat No *</label>
                <input type="text" name="houseNo" value={address.houseNo} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" placeholder="e.g. 42-A" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Street / Area *</label>
                <input type="text" name="street" value={address.street} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" placeholder="e.g. Main Road" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Landmark (Optional)</label>
                <input type="text" name="landmark" value={address.landmark} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" placeholder="e.g. Near Park" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">City *</label>
                <input type="text" name="city" value={address.city} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pincode *</label>
                <input type="text" name="pincode" value={address.pincode} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">State *</label>
                <select 
                  name="state" 
                  value={address.state} 
                  onChange={handleAddressChange} 
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contact Phone *</label>
                <input type="text" name="phone" value={address.phone} onChange={handleAddressChange} className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-primary focus:outline-none" />
              </div>
            </div>
          </div>

          {/* --- SUMMARY & CHECKOUT --- */}
          <div className="max-w-3xl mx-auto mt-6 p-6 bg-gray-800 rounded-2xl shadow-lg mb-20">
            <h2 className="text-2xl font-bold text-white mb-4">Cart Summary</h2>
            <div className="flex justify-between items-center text-lg text-gray-300 mb-2">
              <span>Subtotal</span>
              <span className="font-semibold">₹{getCartTotal()}</span>
            </div>
            <div className="flex justify-between items-center text-lg text-gray-300 mb-6">
              <span>Shipping & Taxes</span>
              <span className="font-semibold">Calculated at checkout</span>
            </div>
            <div className="border-t border-gray-600 pt-6 flex justify-between items-center text-2xl font-bold text-white">
              <span>Total</span>
              <span>₹{getCartTotal()}</span>
            </div>

            {hasSoldOutItem && <p className="text-center text-red-400 mt-4">Please remove sold-out items to proceed.</p>}
            {!isWithinRange && deliveryCoords && <p className="text-center text-red-400 mt-4">Your location is outside our 1000km delivery range.</p>}
            {!isAddressComplete && isWithinRange && <p className="text-center text-yellow-400 mt-4">Please fill in all address details.</p>}

            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="mt-8 w-full py-4 bg-primary text-white rounded-full font-semibold text-lg shadow-lg hover:bg-rose-600 hover:scale-[1.02] transition-all disabled:bg-gray-600 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAuthenticated ? "Proceed to Checkout" : "Login to Checkout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;