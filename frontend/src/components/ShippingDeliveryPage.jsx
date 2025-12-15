// src/components/ShippingDeliveryPage.jsx
import React from "react";
import PolicyLayout from "./PolicyLayout";
import { motion } from "framer-motion";

const ShippingDeliveryPage = () => {
  return (
    <PolicyLayout title="Shipping and Delivery Policy">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <p className="text-neutral-400">
          **Last Updated: 12th December 2025**
        </p>

        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Delivery Area and Times</h3>
          <p>
            We currently deliver to the following areas: [List your delivery areas or state a radius, e.g., within a 5km radius of the restaurant]. Delivery service is available from **10:00 AM to 10:00 PM** daily.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Delivery Timeframe</h3>
          <p className="font-bold text-lg text-white">
            Food is typically delivered within **45-60 minutes** from the time the order is confirmed.
          </p>
          <p className="mt-2">
            Please note that delivery times are estimates and may vary during peak hours, inclement weather, or due to high traffic volume. We will notify you via the app or SMS if we anticipate a significant delay.
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Delivery Charges</h3>
          <p>
            A delivery fee of **₹50** is applied to all orders below ₹500. Delivery is free for orders above ₹500.
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Order Tracking</h3>
          <p>
            You can track the status of your order, including real-time location (if available by our delivery partner), on the "My Orders" page after placing your order.
          </p>
        </section>
      </motion.div>
    </PolicyLayout>
  );
};

export default ShippingDeliveryPage;