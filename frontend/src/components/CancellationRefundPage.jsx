// src/components/CancellationRefundPage.jsx
import React from "react";
import PolicyLayout from "./PolicyLayout";
import { motion } from "framer-motion";

const CancellationRefundPage = () => {
  return (
    <PolicyLayout title="Cancellation and Refund Policy">
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
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Cancellation Policy</h3>
          <p>
            Orders can be cancelled **within 5 minutes** of being placed, provided the preparation of the food has not yet begun. To cancel, please contact us immediately via phone at **+91 98765 43210**. Orders that have moved to the 'Preparing' or 'Out for Delivery' status cannot be cancelled.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Refund Policy</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>**Cancelled Orders:** If an order is successfully cancelled within the 5-minute window, a full refund will be processed within 5-7 business days to the original payment method.</li>
            <li>**Missing or Incorrect Items:** If you receive an order with missing items, incorrect items, or items of poor quality, please contact us within **30 minutes** of delivery. We will review the claim and, at our discretion, offer a full or partial refund, or a credit for a future order.</li>
            <li>**General Dissatisfaction:** We strive for quality, but general dissatisfaction with taste or quantity does not qualify for a refund.</li>
          </ul>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">Contact for Refunds</h3>
          <p>
            For all cancellation and refund inquiries, please email us at **support@klubnikacafe.in** or call **+91 98765 43210**.
          </p>
        </section>
      </motion.div>
    </PolicyLayout>
  );
};

export default CancellationRefundPage;