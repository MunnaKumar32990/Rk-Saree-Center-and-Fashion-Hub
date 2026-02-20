import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const Pagination = ({ page, pages, onPageChange }) => {
    if (pages <= 1) return null;

    const pageNumbers = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(pages - 1, page + delta);

    pageNumbers.push(1);
    if (left > 2) pageNumbers.push("...");
    for (let i = left; i <= right; i++) pageNumbers.push(i);
    if (right < pages - 1) pageNumbers.push("...");
    if (pages > 1) pageNumbers.push(pages);

    return (
        <div className="flex items-center justify-center gap-2 mt-10">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <FiChevronLeft className="w-5 h-5" />
            </button>

            {pageNumbers.map((num, i) =>
                num === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm">
                        …
                    </span>
                ) : (
                    <button
                        key={num}
                        onClick={() => onPageChange(num)}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${page === num
                                ? "bg-primary-600 text-white shadow-brand"
                                : "border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50"
                            }`}
                    >
                        {num}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === pages}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <FiChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Pagination;
