import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminInventory from './AdminInventory';
import AdminOrderDashboard from './AdminOrderDashboard';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const navigate = useNavigate();

  // --- CONFIGURATION ---
  const SESSION_DURATION = 5 * 60 * 1000; // 5 Minutes Session
  const RELOAD_INTERVAL = 30 * 1000;      // 30 Seconds Auto-Reload

  const handleLogout = () => {
    localStorage.removeItem('klubnikaAdminToken');
    localStorage.removeItem('adminSessionStart');
    navigate('/admin');
  };

  // --- EFFECT 1: Global Session Timeout (Runs once on mount) ---
  useEffect(() => {
    const initSession = () => {
      const now = Date.now();
      let startTime = localStorage.getItem('adminSessionStart');

      // Initialize session start if missing
      if (!startTime) {
        startTime = now.toString();
        localStorage.setItem('adminSessionStart', startTime);
      }

      const elapsed = now - parseInt(startTime, 10);

      // Check if session is already expired
      if (elapsed >= SESSION_DURATION) {
        setShowTimeoutModal(true);
        return;
      }

      // Schedule the "Time's Up" popup
      const remainingTime = SESSION_DURATION - elapsed;
      const logoutTimeout = setTimeout(() => {
        setShowTimeoutModal(true);
      }, remainingTime);

      return () => clearTimeout(logoutTimeout);
    };

    return initSession();
  }, []); // Empty dependency = Runs once per page load

  // --- EFFECT 2: Auto-Reload (Runs ONLY when activeTab changes) ---
  useEffect(() => {
    let reloadTimer;

    // Only start the reload timer if we are on the 'orders' tab
    if (activeTab === 'orders') {
      reloadTimer = setInterval(() => {
        // Double check session hasn't expired before reloading
        const currentElapsed = Date.now() - parseInt(localStorage.getItem('adminSessionStart') || '0', 10);
        
        if (currentElapsed < SESSION_DURATION) {
          window.location.reload();
        }
      }, RELOAD_INTERVAL);
    }

    // Cleanup: If user switches to 'inventory', this clears the timer immediately
    return () => {
      if (reloadTimer) clearInterval(reloadTimer);
    };
  }, [activeTab]); // Dependency: Re-runs whenever activeTab changes

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      
      {/* --- TIMEOUT POPUP --- */}
      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-red-600 text-center max-w-md w-full">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-3xl font-bold mb-2">Session Timed Out</h2>
            <p className="text-gray-400 mb-8">
              Your session has expired for security reasons. Please login again.
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition text-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* --- DASHBOARD CONTENT --- */}
      <div className={`max-w-7xl mx-auto ${showTimeoutModal ? 'blur-sm' : ''}`}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold">Admin Dashboard</h1>
          
          <div className="flex items-center gap-4">
             <span className={`text-xs px-2 py-1 rounded border uppercase tracking-widest ${
               activeTab === 'orders' 
                 ? 'text-green-400 border-green-400' 
                 : 'text-gray-500 border-gray-600'
             }`}>
               {activeTab === 'orders' ? 'Auto-Refresh: ON (30s)' : 'Auto-Refresh: PAUSED'}
            </span>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              Logout Now
            </button>
          </div>
        </div>
        
        {/* --- Tab Navigation --- */}
        <div className="flex space-x-4 border-b border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-6 text-xl font-semibold ${
              activeTab === 'orders' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Live Orders
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-6 text-xl font-semibold ${
              activeTab === 'inventory' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Inventory
          </button>
        </div>

        {/* --- Tab Content --- */}
        {activeTab === 'orders' ? <AdminOrderDashboard /> : <AdminInventory />}
      </div>
    </div>
  );
};

export default AdminDashboard;