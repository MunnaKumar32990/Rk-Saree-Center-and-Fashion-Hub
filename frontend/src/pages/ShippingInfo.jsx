import { Link } from "react-router-dom";

const ShippingInfo = () => {
  const shippingInfo = [
    {
      title: "Shipping Methods",
      content: [
        "We offer standard shipping and express shipping options for all orders.",
        "Standard shipping typically takes 5-7 business days.",
        "Express shipping is available for urgent orders and takes 2-3 business days.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: "Shipping Charges",
      content: [
        "Free shipping on orders above ₹2,000.",
        "Standard shipping charges: ₹100 for orders below ₹2,000.",
        "Express shipping charges: ₹200 (additional to standard charges).",
        "Shipping charges are calculated at checkout based on your order total.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Delivery Areas",
      content: [
        "We currently deliver to all major cities and towns across India.",
        "Remote areas may take additional 2-3 business days for delivery.",
        "For international shipping, please contact us directly for rates and availability.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Order Processing",
      content: [
        "Orders are typically processed within 1-2 business days.",
        "You will receive an email confirmation once your order is placed.",
        "A tracking number will be sent to your email once your order ships.",
        "You can track your order status in the 'My Orders' section of your account.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Delivery Time",
      content: [
        "Standard delivery: 5-7 business days from order confirmation.",
        "Express delivery: 2-3 business days from order confirmation.",
        "Delivery times may vary during festivals and peak seasons.",
        "We'll notify you if there are any delays in processing or shipping your order.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Tracking Your Order",
      content: [
        "Once your order ships, you'll receive a tracking number via email.",
        "Use the tracking number to monitor your package's journey.",
        "You can also check order status in your account's 'My Orders' section.",
        "For any delivery issues, please contact our customer service team.",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Shipping Information
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about our shipping policies, delivery times, and charges.
          </p>
        </div>

        {/* Shipping Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {shippingInfo.map((info, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-purple-100 rounded-lg p-3 flex-shrink-0 text-purple-700">
                  {info.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{info.title}</h2>
                  <ul className="space-y-2">
                    {info.content.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-gray-600">
                        <span className="text-purple-600 mt-1.5 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Important Notes */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl shadow-lg p-6 sm:p-8 border-l-4 border-purple-600 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Important Notes</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <strong>Business Days:</strong> Our business days are Monday through Saturday, excluding public holidays.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <strong>Address Accuracy:</strong> Please ensure your shipping address is correct. We are not responsible for delays due to incorrect addresses.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <strong>Delivery Attempts:</strong> Our courier partners will make up to 3 delivery attempts. If unsuccessful, the package will be returned to us.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <strong>Contact Us:</strong> For any shipping-related queries or concerns, please contact our customer service team. We're here to help!
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-gray-600 mb-4">Have questions about shipping?</p>
          <Link
            to="/contact"
            className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;

