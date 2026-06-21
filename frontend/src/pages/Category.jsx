import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const keyword = searchParams.get("keyword") || "";
  const subcategory = searchParams.get("sub") || "";
  const size = searchParams.get("size") || "";
  const color = searchParams.get("color") || "";
  const rating = searchParams.get("rating") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const page = Number(searchParams.get("page")) || 1;
  const sort = searchParams.get("sort") || "newest";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    category: categoryName || "",
    subcategory,
    size,
    color,
    rating,
    minPrice,
    maxPrice,
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 12, sort });
        if (keyword) params.set("keyword", keyword);
        if (categoryName) params.set("category", categoryName);
        if (subcategory) params.set("subcategory", subcategory);
        if (color) params.set("color", color);
        if (size) params.set("size", size);
        if (rating) params.set("rating", rating);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (minPrice) params.set("minPrice", minPrice);

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
  }, [categoryName, keyword, subcategory, size, color, rating, minPrice, maxPrice, page, sort]);

  const handleFilterChange = (newFilters) => {
    const targetCategory = newFilters.category;
    const currentCategory = categoryName || "";

    const params = new URLSearchParams();
    if (newFilters.subcategory) params.set("sub", newFilters.subcategory);
    if (newFilters.size) params.set("size", newFilters.size);
    if (newFilters.color) params.set("color", newFilters.color);
    if (newFilters.rating) params.set("rating", newFilters.rating);
    if (newFilters.minPrice) params.set("minPrice", newFilters.minPrice);
    if (newFilters.maxPrice) params.set("maxPrice", newFilters.maxPrice);
    if (keyword) params.set("keyword", keyword);
    params.set("page", "1");
    if (sort !== "newest") params.set("sort", sort);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    if (targetCategory !== currentCategory) {
      if (targetCategory) {
        navigate(`/category/${targetCategory}${queryStr}`);
      } else {
        navigate(`/search${queryStr}`);
      }
    } else {
      setSearchParams(params);
    }
  };

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSort);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    params.set("page", "1");
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    params.set("page", "1");
    setSearchParams(params);
  };

  const hasAnyFilter = subcategory || size || color || rating || (maxPrice && maxPrice !== "10000");

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
                  onChange={(e) => handleSortChange(e.target.value)}
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

            {/* Active Filter Chips */}
            {hasAnyFilter && (
              <div className="flex flex-wrap gap-2 mb-6 items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Filters:</span>
                {subcategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-100">
                    Subcategory: {subcategory}
                    <button onClick={() => removeFilter("sub")} className="hover:text-primary-900 focus:outline-none ml-1 text-sm font-bold">
                      &times;
                    </button>
                  </span>
                )}
                {size && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-100">
                    Size: {size}
                    <button onClick={() => removeFilter("size")} className="hover:text-primary-900 focus:outline-none ml-1 text-sm font-bold">
                      &times;
                    </button>
                  </span>
                )}
                {color && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-100">
                    Color: {color}
                    <button onClick={() => removeFilter("color")} className="hover:text-primary-900 focus:outline-none ml-1 text-sm font-bold">
                      &times;
                    </button>
                  </span>
                )}
                {rating && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-100">
                    Rating: {rating}★ & up
                    <button onClick={() => removeFilter("rating")} className="hover:text-primary-900 focus:outline-none ml-1 text-sm font-bold">
                      &times;
                    </button>
                  </span>
                )}
                {maxPrice && maxPrice !== "10000" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-100">
                    Max Price: ₹{Number(maxPrice).toLocaleString("en-IN")}
                    <button onClick={() => removeFilter("maxPrice")} className="hover:text-primary-900 focus:outline-none ml-1 text-sm font-bold">
                      &times;
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                >
                  Clear All
                </button>
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
                <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
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