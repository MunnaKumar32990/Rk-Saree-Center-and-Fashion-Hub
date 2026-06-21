import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FilterSidebar";
import Pagination from "../components/Pagination";
import { SkeletonCard } from "../components/Loader";
import { FiSliders, FiSearch } from "react-icons/fi";

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
];

const Category = () => {
  const { categoryName } = useParams();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: categoryName || "",
    size: "",
    rating: "",
    minPrice: "",
    maxPrice: "",
  });

  // Reset on route change
  useEffect(() => {
    setFilters((prev) => ({ ...prev, category: categoryName || "" }));
    setPage(1);
  }, [categoryName]);

  // Reset page when keyword changes
  useEffect(() => {
    setPage(1);
  }, [keyword]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 12, sort });
        if (keyword) params.set("keyword", keyword);
        if (filters.category) params.set("category", filters.category);
        if (filters.size) params.set("size", filters.size);
        if (filters.rating) params.set("rating", filters.rating);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);

        const { data } = await api.get(`/products?${params}`);
        setProducts(data.products || data);
        setPages(data.pages || 1);
        setTotal(data.total || (data.products || data).length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [filters, sort, page, keyword]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  // Dynamic page title
  const pageTitle = keyword
    ? `Search: "${keyword}"`
    : categoryName
    ? categoryName
    : "All Products";

  const seoTitle = keyword
    ? `Search results for "${keyword}" | RK Saree & Fashion Hub`
    : categoryName
    ? `${categoryName}'s Collection | RK Saree & Fashion Hub`
    : "All Products | RK Saree & Fashion Hub";

  return (
    <div className="min-h-screen bg-brand-bg">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={`Shop ${pageTitle} at RK Saree & Fashion Hub. Free delivery above ₹2,000.`} />
      </Helmet>

      {/* Page Header */}
      <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {keyword && (
            <div className="flex items-center gap-2 text-primary-300 text-sm mb-2">
              <FiSearch className="w-4 h-4" />
              <span>Search results for</span>
            </div>
          )}
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-white mb-2">
            {pageTitle}
          </h1>
          <p className="text-gray-300 text-sm">
            {!loading && <span>{total} products found</span>}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar – Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar filters={filters} onChange={handleFilterChange} />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-primary-500"
              >
                <FiSliders className="w-4 h-4" /> Filters
              </button>

              <p className="text-sm text-gray-500 hidden sm:block">
                Showing <span className="font-semibold text-gray-900">{total}</span> products
              </p>

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-600 hidden sm:block">Sort by:</label>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white font-medium"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Filter Panel */}
            {showFilters && (
              <div className="lg:hidden mb-6">
                <FilterSidebar filters={filters} onChange={handleFilterChange} />
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((p, i) => (
                    <ProductCard key={p._id} product={p} delay={i * 50} />
                  ))}
                </div>
                <Pagination page={page} pages={pages} onPageChange={setPage} />
              </>
            ) : (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-outfit text-xl font-bold text-gray-800 mb-2">No products found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;