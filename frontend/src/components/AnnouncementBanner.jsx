import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { FiX, FiRadio, FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Colour themes per announcement type
const TYPE_STYLES = {
    offer: { bar: "bg-gradient-to-r from-rose-600 to-pink-500", text: "text-white" },
    success: { bar: "bg-gradient-to-r from-emerald-600 to-teal-500", text: "text-white" },
    warning: { bar: "bg-gradient-to-r from-amber-500 to-orange-400", text: "text-white" },
    info: { bar: "bg-gradient-to-r from-blue-600 to-indigo-500", text: "text-white" },
};

const SESSION_KEY = "rk_announcements_dismissed";

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [current, setCurrent] = useState(0);
    const [visible, setVisible] = useState(true);
    const [fade, setFade] = useState(true);

    // Fetch active announcements
    useEffect(() => {
        // If already dismissed this session, skip
        if (sessionStorage.getItem(SESSION_KEY)) return;

        const fetchAnnouncements = async () => {
            try {
                const { data } = await api.get("/announcements/active");
                if (data && data.length > 0) {
                    setAnnouncements(data);
                    setVisible(true);
                }
            } catch {
                // silently fail — announcement bar is non-critical
            }
        };
        fetchAnnouncements();
    }, []);

    // Auto-rotate when multiple announcements
    const goTo = useCallback((idx) => {
        setFade(false);
        setTimeout(() => {
            setCurrent(idx);
            setFade(true);
        }, 250);
    }, []);

    useEffect(() => {
        if (announcements.length <= 1) return;
        const timer = setInterval(() => {
            goTo((current + 1) % announcements.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [announcements.length, current, goTo]);

    const dismiss = () => {
        setVisible(false);
        sessionStorage.setItem(SESSION_KEY, "1");
    };

    const prev = () => goTo((current - 1 + announcements.length) % announcements.length);
    const next = () => goTo((current + 1) % announcements.length);

    if (!visible || announcements.length === 0) return null;

    const ann = announcements[current];
    const style = ann.bgColor
        ? { background: ann.bgColor }
        : undefined;
    const theme = TYPE_STYLES[ann.type] || TYPE_STYLES.info;

    return (
        <div
            className={`relative flex items-center justify-center text-center px-10 py-2.5 text-sm font-semibold tracking-wide shadow-sm transition-all duration-300 ${ann.bgColor ? "" : theme.bar} ${theme.text}`}
            style={style}
        >
            {/* Megaphone icon */}
            <FiRadio className="w-4 h-4 mr-2 flex-shrink-0 opacity-90" />

            {/* Message */}
            <span
                className={`transition-opacity duration-250 ${fade ? "opacity-100" : "opacity-0"}`}
            >
                {ann.message}
            </span>

            {/* Navigation dots & arrows (only if multiple) */}
            {announcements.length > 1 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 flex items-center gap-1 pointer-events-none">
                    {announcements.map((_, i) => (
                        <span
                            key={i}
                            className={`w-1 h-1 rounded-full transition-all ${i === current ? "bg-white w-3" : "bg-white/50"}`}
                        />
                    ))}
                </div>
            )}

            {announcements.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Previous announcement"
                    >
                        <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-8 p-1 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Next announcement"
                    >
                        <FiChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Dismiss */}
            <button
                onClick={dismiss}
                className="absolute right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss announcement"
            >
                <FiX className="w-4 h-4" />
            </button>
        </div>
    );
};

export default AnnouncementBanner;
