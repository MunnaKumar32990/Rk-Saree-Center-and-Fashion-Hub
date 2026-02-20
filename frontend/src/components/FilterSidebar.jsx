import { useState } from "react";
import { FiFilter, FiX, FiChevronDown } from "react-icons/fi";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const CATEGORIES = ["All", "Men", "Women", "Kids", "Sarees", "Suits", "Kurtis", "Lehengas"];
const RATINGS = [4, 3, 2, 1];

const FilterSidebar = ({ filters, onChange }) => {
    const [priceMax, setPriceMax] = useState(filters.maxPrice || 10000);
    const [openSections, setOpenSections] = useState({
        category: true,
        price: true,
        size: true,
        rating: true,
    });

    const toggleSection = (section) =>
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

    const handleCategory = (cat) =>
        onChange({ ...filters, category: cat === "All" ? "" : cat });

    const handleSize = (size) =>
        onChange({ ...filters, size: filters.size === size ? "" : size });

    const handleRating = (rating) =>
        onChange({ ...filters, rating: filters.rating === rating ? "" : rating });

    const handlePriceCommit = () =>
        onChange({ ...filters, maxPrice: priceMax });

    const clearAll = () => {
        setPriceMax(10000);
        onChange({ category: "", size: "", rating: "", minPrice: "", maxPrice: "" });
    };

    const hasFilters = filters.category || filters.size || filters.rating || filters.maxPrice;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <FiFilter className="w-4 h-4 text-primary-600" />
                    <span className="font-outfit font-bold text-gray-900">Filters</span>
                </div>
                {hasFilters && (
                    <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                        <FiX className="w-3.5 h-3.5" /> Clear all
                    </button>
                )}
            </div>

            <div className="divide-y divide-gray-100">
                {/* Category */}
                <div className="p-5">
                    <button onClick={() => toggleSection("category")} className="flex items-center justify-between w-full mb-3">
                        <span className="text-sm font-semibold text-gray-800">Category</span>
                        <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openSections.category ? "" : "-rotate-90"}`} />
                    </button>
                    {openSections.category && (
                        <div className="space-y-2">
                            {CATEGORIES.map((cat) => {
                                const isActive = cat === "All" ? !filters.category : filters.category === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategory(cat)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? "bg-primary-100 text-primary-700"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Price Range */}
                <div className="p-5">
                    <button onClick={() => toggleSection("price")} className="flex items-center justify-between w-full mb-3">
                        <span className="text-sm font-semibold text-gray-800">Price Range</span>
                        <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openSections.price ? "" : "-rotate-90"}`} />
                    </button>
                    {openSections.price && (
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span>₹0</span>
                                <span className="font-semibold text-primary-600">₹{priceMax.toLocaleString("en-IN")}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={20000}
                                step={500}
                                value={priceMax}
                                onChange={(e) => setPriceMax(Number(e.target.value))}
                                onMouseUp={handlePriceCommit}
                                onTouchEnd={handlePriceCommit}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>₹0</span>
                                <span>₹20,000</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sizes */}
                <div className="p-5">
                    <button onClick={() => toggleSection("size")} className="flex items-center justify-between w-full mb-3">
                        <span className="text-sm font-semibold text-gray-800">Size</span>
                        <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openSections.size ? "" : "-rotate-90"}`} />
                    </button>
                    {openSections.size && (
                        <div className="flex flex-wrap gap-2">
                            {SIZES.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handleSize(size)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filters.size === size
                                            ? "bg-primary-600 text-white border-primary-600"
                                            : "border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600"
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rating */}
                <div className="p-5">
                    <button onClick={() => toggleSection("rating")} className="flex items-center justify-between w-full mb-3">
                        <span className="text-sm font-semibold text-gray-800">Min Rating</span>
                        <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openSections.rating ? "" : "-rotate-90"}`} />
                    </button>
                    {openSections.rating && (
                        <div className="space-y-2">
                            {RATINGS.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => handleRating(r)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${filters.rating === r
                                            ? "bg-primary-50 text-primary-700"
                                            : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex text-yellow-400">
                                        {Array(r).fill(0).map((_, i) => (
                                            <span key={i}>★</span>
                                        ))}
                                        {Array(5 - r).fill(0).map((_, i) => (
                                            <span key={i} className="text-gray-200">★</span>
                                        ))}
                                    </div>
                                    <span className="text-xs">& up</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterSidebar;
