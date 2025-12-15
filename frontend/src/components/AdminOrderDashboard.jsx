// frontend/src/components/AdminOrderDashboard.jsx
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

    console.log("Admin Dashboard: Listening for updates...");

    // OPTIONAL: join an "admins" room if you want to separate user/admin events
    socket.emit("adminJoin"); // backend will put this socket in 'admins' room

    const handleNewOrder = (newOrder) => {
      console.log("🔔 New Order Received (admin):", newOrder);
      setOrders((prev) => [newOrder, ...prev]);
    };

    const handleStatusUpdate = (payload) => {
      console.log("🔔 Order Status Updated (admin):", payload);
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

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const updatedOrder = await res.json();

      // Optimistic local update (server will still emit orderStatusUpdate)
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-white mt-10">Loading orders...</div>
    );
  }

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
        />
      ))}
    </div>
  );
};

const AdminOrderCard = ({ order, onUpdateStatus }) => {
  const { status } = order;
  const displayPayment = order.paymentMethod
    ? order.paymentMethod.toUpperCase()
    : "ONLINE";

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col animate-fadeIn">
      <div className="border-b border-gray-700 pb-3 mb-3">
        <h3 className="text-xl font-bold text-white">
          Order #{order._id.slice(-6)}
        </h3>
        <p className="text-sm text-gray-400">
          {order.user?.name || "Customer"}
        </p>
        <p className="text-sm text-gray-400">
          {order.user?.mobile || "No mobile"}
        </p>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-semibold text-primary">Address:</h4>
          <span className="text-xs font-bold bg-gray-700 text-green-400 px-2 py-1 rounded">
            {displayPayment}
          </span>
        </div>
        <p className="text-gray-300 text-sm">{order.deliveryAddress}</p>
      </div>

      <div className="mb-4 flex-grow">
        <h4 className="font-semibold text-primary">Items:</h4>
        <ul className="list-disc list-inside text-gray-300 text-sm">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity} x {item.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto space-y-2">
        <p className="text-lg font-bold text-center">
          Status: <span className="text-yellow-400">{status}</span>
        </p>

        {status === "Pending" && (
          <button
            onClick={() => onUpdateStatus(order._id, "Confirmed")}
            className="w-full py-2 px-4 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700"
          >
            Confirm Order
          </button>
        )}
        {status === "Confirmed" && (
          <button
            onClick={() => onUpdateStatus(order._id, "Preparing")}
            className="w-full py-2 px-4 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700"
          >
            Start Preparing
          </button>
        )}
        {status === "Preparing" && (
          <button
            onClick={() => onUpdateStatus(order._id, "Out for Delivery")}
            className="w-full py-2 px-4 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-600"
          >
            Out for Delivery
          </button>
        )}
        {status === "Out for Delivery" && (
          <button
            onClick={() => onUpdateStatus(order._id, "Delivered")}
            className="w-full py-2 px-4 bg-green-600 rounded-lg font-semibold hover:bg-green-700"
          >
            Mark as Delivered
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDashboard;
