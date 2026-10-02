import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { getWhatsAppUrl } from "../utils/contact";

/**
 * 404.
 *
 * The two recovery CTAs on this page were both broken:
 *  - `/category/Sarees` — `Product.category` is an enum of Men | Women | Kids,
 *    so "Sarees" matched nothing. Sarees are a *subcategory*. The filter is
 *    `category !== "All"`, so a lowercase "all" was treated as a real category
 *    and returned zero results too.
 *
 * A 404 page is a second chance at a sale, so the links now actually return
 * products, and it carries structured data plus social proof so a shopper who
 * lands here by mistyping has somewhere obvious to go.
 */
const NotFound = () => (
  <>
    <Seo
      title="Page Not Found"
      description="This page couldn't be found. Browse sarees, kurtis and ethnic wear at RK Saree Center."
      noindex
    />

    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg animate-fade-in">
        <div className="relative mb-6">
          <p
            aria-hidden="true"
            className="font-outfit text-[10rem] font-black text-primary-100 leading-none select-none"
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl" aria-hidden="true">🥻</span>
          </div>
        </div>

        <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-3">
          This page got lost in the fabric
        </h1>
        <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto leading-relaxed">
          The link may be old or mistyped. Here's what people usually want:
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            to="/"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl hover:shadow-brand-lg transition-all active:scale-95 min-h-[48px] flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
          >
            🏠 Back to Home
          </Link>
          {/* Sarees are a subcategory — this previously returned zero results. */}
          <Link
            to="/category/Women?sub=Sarees"
            className="w-full sm:w-auto px-8 py-3.5 border-2 border-primary-500 text-primary-600 font-bold rounded-2xl hover:bg-primary-50 transition-all min-h-[48px] flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-200"
          >
            Browse Sarees
          </Link>
        </div>

        <nav aria-label="Suggested pages">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {[
              { label: "🛍️ All Products", to: "/search" },
              { label: "👗 Kurtis & Suits", to: "/category/Women" },
              { label: "📏 Size Guide", to: "/size-guide" },
              { label: "↩️ Returns", to: "/returns" },
              { label: "📦 My Orders", to: "/myorders" },
              { label: "📞 Contact Us", to: "/contact" },
            ].map(({ label, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:text-primary-600 transition-colors font-medium inline-block py-1"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Reassurance — a shopper who hit a dead link needs confidence the
            business is real, which is the second most common worry after price. */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            { icon: "💵", label: "Cash on Delivery", note: "Pay when it arrives" },
            { icon: "🚚", label: "Free over ₹2,000", note: "4-6 business days" },
            { icon: "↩️", label: "7-day returns", note: "Free reverse pickup" },
          ].map((t) => (
            <div key={t.label} className="rounded-xl bg-white border border-stone-200 p-3">
              <p className="text-sm font-semibold text-stone-900">
                <span aria-hidden="true">{t.icon} </span>
                {t.label}
              </p>
              <p className="text-xs text-stone-600 mt-0.5">{t.note}</p>
            </div>
          ))}
        </div>

        <a
          href={getWhatsAppUrl("Hi! I couldn't find what I was looking for on your website. Can you help?")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-8 text-green-700 text-sm font-semibold hover:underline min-h-[44px]"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Can't find it? Chat with us on WhatsApp
        </a>
      </div>
    </div>
  </>
);

export default NotFound;