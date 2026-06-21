import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Helmet>
        <title>Terms of Service | RK Saree &amp; Fashion Hub</title>
        <meta name="description" content="Read the Terms of Service of RK Saree & Fashion Hub before using our website or placing an order." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-300 text-sm">Last updated: June 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 sm:p-12 space-y-8">

          <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
            <p className="text-primary-800 text-sm leading-relaxed">
              By accessing and using the RK Saree &amp; Fashion Hub website, you agree to these Terms of Service. Please read them carefully before placing an order. If you disagree with any part of these terms, please do not use our website.
            </p>
          </div>

          {[
            {
              title: "1. About Us",
              content: [
                "RK Saree Center is a family-run clothing store based in Yogapatti, Bihar, India. We sell sarees, lehengas, kurtis, and ethnic wear online through this website.",
                "Contact: rksareecenter32@gmail.com | +91 9708756854"
              ]
            },
            {
              title: "2. Products & Pricing",
              content: [
                "All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes where stated.",
                "We reserve the right to change prices at any time. The price at the time of order confirmation is the price you pay.",
                "Product images are for representation. Actual colors may vary slightly due to screen calibration and photography lighting.",
                "We make every effort to ensure product descriptions are accurate, but we do not warrant that descriptions are error-free."
              ]
            },
            {
              title: "3. Orders & Payment",
              content: [
                "An order confirmation email confirms receipt of your order — not acceptance. We reserve the right to cancel orders in cases of stock unavailability, pricing errors, or suspected fraud.",
                "We accept payments via Razorpay (credit/debit cards, UPI, net banking) and Cash on Delivery (COD) where available.",
                "COD orders must be paid in full to the delivery agent upon receipt.",
                "If a COD order is returned undelivered due to customer unavailability, re-delivery charges may apply."
              ]
            },
            {
              title: "4. Shipping & Delivery",
              content: [
                "We offer free delivery on orders above ₹2,000. A flat shipping fee of ₹100 applies to orders below this amount.",
                "Standard delivery typically takes 5–10 business days. Delivery timelines may vary due to location, courier availability, or unforeseen circumstances.",
                "We are not responsible for delays caused by courier partners, natural disasters, or government restrictions.",
                "Risk of loss and title pass to you upon delivery to the carrier."
              ]
            },
            {
              title: "5. Returns & Refunds",
              content: [
                "We accept return requests within 7 days of delivery for items that are defective, damaged, or significantly different from description.",
                "Items must be unused, unwashed, and in original packaging with all tags attached.",
                "To initiate a return, go to My Orders → View Details → Request Return.",
                "Once we receive and inspect the returned item, we will process a refund to your original payment method within 5–7 business days.",
                "Sarees, innerwear, and customized items are not eligible for return unless defective.",
                "COD orders will receive refunds via bank transfer — please share your bank details when initiating the return."
              ]
            },
            {
              title: "6. Cancellations",
              content: [
                "You may cancel an order before it has been shipped by contacting us at rksareecenter32@gmail.com or calling +91 9708756854.",
                "Once an order is shipped, it cannot be cancelled — please use the return process instead.",
                "Prepaid orders that are cancelled before shipping will be fully refunded within 5–7 business days."
              ]
            },
            {
              title: "7. User Accounts",
              content: [
                "You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account.",
                "You agree to provide accurate and complete information when creating your account.",
                "We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity."
              ]
            },
            {
              title: "8. Prohibited Activities",
              content: [
                "Placing fraudulent orders or using stolen payment methods",
                "Submitting false or misleading product reviews",
                "Scraping, crawling, or harvesting data from our website",
                "Attempting to gain unauthorized access to our systems",
                "Using our platform for any illegal purpose"
              ]
            },
            {
              title: "9. Intellectual Property",
              content: [
                "All content on this website including text, images, logos, and design is the property of RK Saree & Fashion Hub.",
                "You may not reproduce, distribute, or create derivative works without our written permission."
              ]
            },
            {
              title: "10. Limitation of Liability",
              content: [
                "To the maximum extent permitted by law, RK Saree & Fashion Hub shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or products.",
                "Our liability shall not exceed the amount you paid for the specific order giving rise to the claim."
              ]
            },
            {
              title: "11. Governing Law & Disputes",
              content: [
                "These terms are governed by the laws of India.",
                "Any disputes shall be subject to the exclusive jurisdiction of courts in Bihar, India.",
                "We encourage you to contact us first to resolve any disputes amicably before pursuing legal action."
              ]
            },
            {
              title: "12. Changes to Terms",
              content: [
                "We may update these terms at any time. Continued use of our website after changes constitutes acceptance of the updated terms.",
                "We will indicate the 'Last Updated' date at the top of this page when changes are made."
              ]
            },
            {
              title: "13. Contact",
              content: [
                "For any questions about these terms:",
                "📧 Email: rksareecenter32@gmail.com",
                "📞 Phone: +91 9708756854",
                "📍 RK Saree Center, Yogapatti Main Road, Bihar 845452, India",
                "⏰ Store Hours: Mon–Sat 10AM–8PM | Sun 11AM–8PM"
              ]
            }
          ].map(({ title, content }) => (
            <section key={title}>
              <h2 className="font-outfit text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
              <ul className="space-y-2">
                {content.map((point, i) => (
                  <li key={i} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                    <span className="text-primary-500 mt-1 flex-shrink-0">•</span>
                    <span>{point}</span>
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

export default TermsOfService;
