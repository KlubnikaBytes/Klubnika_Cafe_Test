import React from 'react';

const getStatusInfo = (status) => {
  switch (status) {
    case 'Pending':
      return { text: 'Waiting for confirmation...', color: 'text-yellow-400', time: 'Est. 30 mins' };
    case 'Confirmed':
      return { text: 'Your order is confirmed.', color: 'text-blue-400', time: 'Est. 25 mins' };
    case 'Preparing':
      return { text: 'The kitchen is preparing your food.', color: 'text-orange-400', time: 'Est. 20 mins' };
    case 'Out for Delivery':
      return { text: 'On its way to you!', color: 'text-green-400', time: 'Est. 10 mins' };
    case 'Delivered':
      return { text: 'Delivered. Enjoy your meal!', color: 'text-green-500', time: '' };
    case 'Cancelled':
      return { text: 'Order cancelled.', color: 'text-red-500', time: '' };
    default:
      return { text: status, color: 'text-gray-400', time: '' };
  }
};

const OrderCard = ({ order }) => {
  const statusInfo = getStatusInfo(order.status);
  const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg p-6 text-white">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Order #{order._id.slice(-6)}</h2>
          <p className="text-sm text-gray-400">{orderDate}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${statusInfo.color}`}>
            {statusInfo.text}
          </p>
          <p className="text-sm text-gray-300">{statusInfo.time}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Items</h3>
        {order.items.map(item => (
          <div key={item.title} className="flex justify-between text-gray-300">
            <span>{item.quantity} x {item.title}</span>
            <span>{item.price}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700 pt-4">
        <p className="text-lg font-semibold mb-2">Delivery To:</p>
        <p className="text-gray-300">{order.deliveryAddress}</p>
        <div className="flex justify-between text-xl font-bold mt-4">
          <span>Total Paid</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>
    </div>
  );
};

// --- THIS LINE FIXES THE ERROR ---
export default OrderCard;