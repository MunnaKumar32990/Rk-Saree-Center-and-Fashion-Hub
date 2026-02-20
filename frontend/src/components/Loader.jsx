// Skeleton card loader
export const SkeletonCard = () => (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        <div className="skeleton aspect-[3/4] w-full" />
        <div className="p-4 space-y-2.5">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-5 w-24 rounded" />
        </div>
    </div>
);

// Full-page spinner
export const PageLoader = ({ text = "Loading..." }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin" />
        </div>
        <p className="text-gray-500 text-sm font-medium">{text}</p>
    </div>
);

// Inline spinner
export const Spinner = ({ size = "md" }) => {
    const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
    return (
        <div
            className={`${sizeClasses[size]} rounded-full border-2 border-primary-100 border-t-primary-600 animate-spin`}
        />
    );
};

export default PageLoader;
