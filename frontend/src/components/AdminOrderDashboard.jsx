// src/components/AdminOrderDashboard.jsx
import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

const API_URL = import.meta.env.VITE_API_URL;

const AdminOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const socket = useSocket();
  const adminToken = localStorage.getItem("klubnikaAdminToken");

  // 1. Initial Fetch
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        setOrders(data || []);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };

    if (adminToken) fetchOrders();
  }, [adminToken]);

  // 2. Real-time Listeners
  useEffect(() => {
    if (!socket) return;
    socket.emit("adminJoin");

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    };

    const handleStatusUpdate = (payload) => {
      const updatedOrder = payload?.order || payload;
      if (!updatedOrder?._id) return;
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderStatusUpdate", handleStatusUpdate);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("orderStatusUpdate", handleStatusUpdate);
    };
  }, [socket]);

  // 3. Update Status Function
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updatedOrder = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  // 4. Cancel/Reject Function (Updated for Cash vs Online)
  const handleCancelOrder = async (orderId, paymentMethod) => {
    const reason = prompt("Enter rejection reason (will be sent to customer):", "Unfortunately we cannot fulfill this order.");
    if (!reason) return; 

    try {
        const res = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ reason }),
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to cancel");
        }
        
        // Custom Alert Logic based on Payment Method
        if (paymentMethod && paymentMethod.includes("Cash")) {
             alert("Order Cancelled. ⚠️ Please refund CASH to the customer manually.");
        } else {
             alert("Order Cancelled. Refund initiated via Razorpay.");
        }

    } catch (err) {
        alert("Error: " + err.message);
    }
  };

  if (loading) return <div className="text-center text-white mt-10">Loading orders...</div>;

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled"
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeOrders.length === 0 && (
        <p className="text-gray-400 text-xl col-span-full text-center">
          No active orders.
        </p>
      )}
      {activeOrders.map((order) => (
        <AdminOrderCard
          key={order._id}
          order={order}
          onUpdateStatus={handleUpdateStatus}
          onCancelOrder={handleCancelOrder}
        />
      ))}
    </div>
  );
};

const AdminOrderCard = ({ order, onUpdateStatus, onCancelOrder }) => {
  const { status } = order;
  const isDineIn = order.orderType === 'Dine-in';
  
  // Format Payment Method for Display
  const displayPayment = order.paymentMethod 
      ? (order.paymentMethod.length > 20 ? order.paymentMethod.slice(0, 18) + "..." : order.paymentMethod) 
      : "ONLINE";

  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (order.deliveryAddress) {
      navigator.clipboard.writeText(order.deliveryAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-lg shadow-lg p-5 flex flex-col animate-fadeIn border transition-colors ${isDineIn ? 'bg-gray-800 border-purple-500 hover:border-purple-400' : 'bg-gray-800 border-gray-700 hover:border-rose-500'}`}>
      
      {/* --- HEADER --- */}
      <div className="border-b border-gray-700 pb-3 mb-3 flex justify-between items-start">
        <div>
            <h3 className="text-xl font-bold text-white">#{order._id.slice(-6)}</h3>
            <p className="text-sm text-gray-400">{order.user?.name || "Customer"}</p>
            <p className="text-sm text-gray-400">{order.user?.mobile || "No mobile"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-bold px-2 py-1 rounded ${isDineIn ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                {isDineIn ? 'DINE-IN' : 'DELIVERY'}
            </span>
            <span className="text-xs text-gray-500 font-mono bg-gray-900 px-1 rounded">{displayPayment}</span>
        </div>
      </div>

      {/* --- LOCATION / TABLE DISPLAY --- */}
      <div className="mb-4 bg-gray-900 p-3 rounded-md relative group text-center">
        {isDineIn ? (
            // DINE-IN VIEW
            <>
                <h4 className="text-purple-400 text-xs uppercase font-bold tracking-wider mb-1">Table Number</h4>
                <p className="text-4xl font-extrabold text-white">{order.tableNumber}</p>
            </>
        ) : (
            // DELIVERY VIEW
            <>
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-primary text-xs uppercase tracking-wider">Delivery Address</h4>
                    <button 
                        onClick={handleCopyAddress}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                    >
                        {copied ? <span className="text-green-400 font-bold">✓ Copied!</span> : <span>Copy</span>}
                    </button>
                </div>
                
                <p className="text-gray-300 text-sm leading-snug break-words mb-2 text-left">
                    {order.deliveryAddress || "No address provided"}
                </p>

                {(order.googleMapsLink || order.location) && (
                    <a 
                        href={order.googleMapsLink || `http://maps.google.com/maps?q=${order.location?.lat},${order.location?.lng}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded transition-colors"
                    >
                        📍 Open in Google Maps
                    </a>
                )}
            </>
        )}
      </div>

      {/* --- ITEMS --- */}
      <div className="mb-4 flex-grow">
        <h4 className="font-semibold text-primary mb-1">Items:</h4>
        <ul className="list-disc list-inside text-gray-300 text-sm">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity} x {item.title}
            </li>
          ))}
        </ul>
      </div>

      {/* --- ACTION BUTTONS --- */}
      <div className="mt-auto space-y-2 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Status:</span>
            <span className={`font-bold ${status === 'Pending' ? 'text-yellow-400' : 'text-green-400'}`}>{status}</span>
        </div>

        {status === "Pending" && (
          <div className="flex gap-2">
             <button onClick={() => onUpdateStatus(order._id, "Confirmed")} className="flex-1 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 text-sm">Confirm</button>
             {/* Pass Payment Method to Cancel Handler */}
             <button onClick={() => onCancelOrder(order._id, order.paymentMethod)} className="flex-1 py-2 bg-red-600 rounded-lg font-semibold hover:bg-red-700 text-sm">Reject</button>
          </div>
        )}
        
        {status === "Confirmed" && (
          <div className="space-y-2">
            <button onClick={() => onUpdateStatus(order._id, "Preparing")} className="w-full py-2 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 text-sm">Start Preparing</button>
            <button onClick={() => onCancelOrder(order._id, order.paymentMethod)} className="w-full py-1 text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white text-xs">Emergency Cancel</button>
          </div>
        )}
        
        {status === "Preparing" && (
           <button 
             onClick={() => onUpdateStatus(order._id, "Out for Delivery")} 
             className="w-full py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-600 text-sm"
           >
             {isDineIn ? "Mark Ready to Serve" : "Out for Delivery"}
           </button>
        )}
        
        {status === "Out for Delivery" && (
           <button 
             onClick={() => onUpdateStatus(order._id, "Delivered")} 
             className="w-full py-2 bg-green-600 rounded-lg font-semibold hover:bg-green-700 text-sm"
           >
             {isDineIn ? "Mark Served / Paid" : "Mark Delivered"}
           </button>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDashboard;
