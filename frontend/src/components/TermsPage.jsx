// src/components/TermsPage.jsx
import React from "react";
import PolicyLayout from "./PolicyLayout"; // Assuming you will create this
import { motion } from "framer-motion";

const TermsPage = () => {
  return (
    <PolicyLayout title="Terms and Conditions">
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
          <h3 className="text-xl font-semibold mb-2 text-rose-400">1. Acceptance of Terms</h3>
          <p>
            By accessing and using the Klubnika Café website, you agree to be bound by these Terms and Conditions and all terms incorporated by reference. If you do not agree to all of these terms, do not use this website.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">2. Ordering and Payment</h3>
          <p>
            All orders placed through the website are subject to availability and confirmation of the order price. Payment must be made at the time of placing the order. We use Razorpay for processing payments.
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">3. User Conduct</h3>
          <p>
            You agree not to use the website for any unlawful purpose or in any way that interrupts, damages, or impairs the service. Misuse, including abusive reviews or fraudulent orders, will result in account termination.
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-semibold mb-2 text-rose-400">4. Changes to Terms</h3>
          <p>
            Klubnika Café reserves the right to change these terms at any time. Your continued use of the site following any changes constitutes your acceptance of the new terms.
          </p>
        </section>
      </motion.div>
    </PolicyLayout>
  );
};

export default TermsPage;

// NOTE: You will need to create a simple PolicyLayout component to wrap all these pages.
// If you don't have it, use the structure from the next file's import.
// For now, assume this is what PolicyLayout gives you:
/*
const PolicyLayout = ({ title, children }) => (
  <div className="min-h-[60vh] pt-28 pb-10 px-4 sm:px-6 lg:px-8 bg-neutral-900">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-rose-500 text-center">{title}</h2>
      <div className="bg-neutral-800 p-6 sm:p-10 rounded-lg shadow-xl text-neutral-300">
        {children}
      </div>
    </div>
  </div>
);
*/