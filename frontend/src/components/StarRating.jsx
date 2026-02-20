import { FiStar } from "react-icons/fi";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";

const StarRating = ({ rating = 0, numReviews, size = "sm", interactive = false, onRate }) => {
    const stars = [1, 2, 3, 4, 5];

    const sizeClasses = {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
                {stars.map((star) => {
                    let StarIcon;
                    if (rating >= star) {
                        StarIcon = FaStar;
                    } else if (rating >= star - 0.5) {
                        StarIcon = FaStarHalfAlt;
                    } else {
                        StarIcon = FiStar;
                    }

                    return (
                        <button
                            key={star}
                            onClick={() => interactive && onRate && onRate(star)}
                            disabled={!interactive}
                            className={`${sizeClasses[size]} text-yellow-400 ${interactive ? "cursor-pointer hover:scale-125 transition-transform" : "cursor-default"
                                }`}
                        >
                            <StarIcon className="w-full h-full" />
                        </button>
                    );
                })}
            </div>
            {numReviews !== undefined && (
                <span className="text-xs text-gray-500 ml-1">({numReviews})</span>
            )}
        </div>
    );
};

export default StarRating;
