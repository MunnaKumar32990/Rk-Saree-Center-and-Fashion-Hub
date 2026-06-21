import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Helmet>
        <title>Privacy Policy | RK Saree &amp; Fashion Hub</title>
        <meta name="description" content="Read the Privacy Policy of RK Saree & Fashion Hub to understand how we collect, use, and protect your personal data." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-300 text-sm">Last updated: June 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 sm:p-12 space-y-8">

          {/* Intro */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
            <p className="text-primary-800 text-sm leading-relaxed">
              RK Saree &amp; Fashion Hub ("we", "us", "our") is committed to protecting your personal information and your right to privacy. This policy explains what information we collect, how we use it, and what rights you have in relation to it.
            </p>
          </div>

          {[
            {
              title: "1. Information We Collect",
              content: [
                "**Account Information:** When you register, we collect your name, email address, phone number, and password (stored in encrypted form).",
                "**Order Information:** When you place an order, we collect your shipping address, billing details, and payment transaction reference (we do not store full card details — payments are processed securely by Razorpay).",
                "**Usage Data:** We may collect information about how you interact with our website, including pages visited, search queries, and device/browser information.",
                "**Communications:** If you contact us via email or WhatsApp, we retain those communications to assist you."
              ]
            },
            {
              title: "2. How We Use Your Information",
              content: [
                "To process and fulfill your orders",
                "To send order confirmation and shipping update emails",
                "To provide customer support",
                "To improve our website and product listings",
                "To detect and prevent fraudulent transactions",
                "To comply with legal obligations under Indian law"
              ]
            },
            {
              title: "3. Payment Security",
              content: [
                "All online payments are processed through Razorpay, a PCI-DSS compliant payment gateway. We do not store your credit/debit card information on our servers.",
                "Razorpay's privacy policy applies to all payment transactions: razorpay.com/privacy"
              ]
            },
            {
              title: "4. Data Sharing",
              content: [
                "We do NOT sell, trade, or rent your personal information to third parties.",
                "We may share your delivery address and name with our courier/logistics partners solely to deliver your order.",
                "We may disclose information if required by law or to protect the rights, property, or safety of RK Saree & Fashion Hub or our customers."
              ]
            },
            {
              title: "5. Cookies",
              content: [
                "Our website uses essential cookies to maintain your login session and shopping cart.",
                "We do not use tracking or advertising cookies without your consent.",
                "You can disable cookies in your browser settings, though this may affect website functionality."
              ]
            },
            {
              title: "6. Data Retention",
              content: [
                "We retain your account information as long as your account is active.",
                "Order history is retained for 7 years for accounting and tax compliance purposes under Indian GST laws.",
                "You may request deletion of your account and personal data by contacting us at rksareecenter32@gmail.com."
              ]
            },
            {
              title: "7. Your Rights",
              content: [
                "**Access:** You can view your personal information in your account Profile page at any time.",
                "**Correction:** You can update your name, phone, and address in your Profile.",
                "**Deletion:** You can request account deletion by emailing us.",
                "**Opt-out:** You can unsubscribe from promotional emails using the link in any email we send."
              ]
            },
            {
              title: "8. Data Security",
              content: [
                "Passwords are stored using bcrypt hashing — they are never stored in plain text.",
                "All data transmission is encrypted using HTTPS/TLS.",
                "We use JWT tokens with expiry for authentication sessions.",
                "We implement rate limiting to prevent brute-force attacks.",
                "Despite these measures, no system is 100% secure. Please use a strong, unique password."
              ]
            },
            {
              title: "9. Children's Privacy",
              content: [
                "Our website is not directed at children under 13 years of age. We do not knowingly collect personal information from children."
              ]
            },
            {
              title: "10. Contact Us",
              content: [
                "For any privacy-related questions, requests, or complaints, please contact us:",
                "📧 Email: rksareecenter32@gmail.com",
                "📞 Phone: +91 9708756854",
                "📍 Address: RK Saree Center, Yogapatti Main Road, Bihar 845452, India"
              ]
            }
          ].map(({ title, content }) => (
            <section key={title}>
              <h2 className="font-outfit text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
              <ul className="space-y-2">
                {content.map((point, i) => (
                  <li key={i} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                    <span className="text-primary-500 mt-1 flex-shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="pt-6 border-t border-gray-100 text-center">
            <Link to="/" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
