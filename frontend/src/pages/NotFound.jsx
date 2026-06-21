import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <Helmet>
        <title>Page Not Found | RK Saree &amp; Fashion Hub</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="text-center max-w-lg animate-fade-in">
        {/* Big decorative number */}
        <div className="relative mb-6">
          <p className="font-outfit text-[10rem] font-black text-primary-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl">🥻</span>
          </div>
        </div>

        <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-3">
          This page got lost in the fabric
        </h1>
        <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto leading-relaxed">
          The page you're looking for doesn't exist, may have been moved, or the link is incorrect.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            to="/"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl hover:shadow-brand-lg transition-all hover:scale-105 active:scale-95"
          >
            🏠 Back to Home
          </Link>
          <Link
            to="/category/Sarees"
            className="w-full sm:w-auto px-8 py-3.5 border-2 border-primary-500 text-primary-600 font-bold rounded-2xl hover:bg-primary-50 transition-all"
          >
            Browse Sarees
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          {[
            { label: "🛍️ All Products", to: "/category/all" },
            { label: "📦 My Orders", to: "/myorders" },
            { label: "📞 Contact Us", to: "/contact" },
          ].map(({ label, to }) => (
            <Link key={to} to={to} className="hover:text-primary-600 transition-colors font-medium">
              {label}
            </Link>
          ))}
        </div>

        {/* WhatsApp help */}
        <a
          href="https://wa.me/919708756854?text=Hi! I couldn't find what I was looking for on your website. Can you help?"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-8 text-green-700 text-sm font-semibold hover:underline"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Can't find it? Chat with us on WhatsApp
        </a>
      </div>
    </div>
  );
};

export default NotFound;
