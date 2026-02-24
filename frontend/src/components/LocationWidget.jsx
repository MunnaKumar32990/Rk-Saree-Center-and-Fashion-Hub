import { useState, useEffect, useRef } from "react";
import { FiMapPin, FiRefreshCw, FiX, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

const STORAGE_KEY = "rk_user_location";

const LocationWidget = () => {
    const [location, setLocation] = useState(null);   // { city, area, pincode, full }
    const [status, setStatus] = useState("idle");      // idle | loading | success | error | denied
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const dropdownRef = useRef(null);

    // Load persisted location on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setLocation(JSON.parse(saved));
                setStatus("success");
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const fetchLocation = () => {
        if (!navigator.geolocation) {
            setStatus("error");
            setErrorMsg("Geolocation is not supported by your browser.");
            return;
        }
        setStatus("loading");
        setErrorMsg("");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                        { headers: { "Accept-Language": "en" } }
                    );
                    if (!res.ok) throw new Error("Geocoding failed");
                    const data = await res.json();
                    const addr = data.address || {};

                    const city =
                        addr.city ||
                        addr.town ||
                        addr.village ||
                        addr.county ||
                        addr.state_district ||
                        addr.state ||
                        "Your Location";

                    const area =
                        addr.suburb ||
                        addr.neighbourhood ||
                        addr.road ||
                        addr.hamlet ||
                        "";

                    const pincode = addr.postcode || "";
                    const full = data.display_name || "";

                    const locationData = { city, area, pincode, full, lat: latitude, lon: longitude };
                    setLocation(locationData);
                    setStatus("success");
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData));
                } catch {
                    setStatus("error");
                    setErrorMsg("Could not fetch address. Please try again.");
                }
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setStatus("denied");
                    setErrorMsg("Location access denied. Please allow location in your browser settings.");
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setStatus("error");
                    setErrorMsg("Location unavailable. Please check your device settings.");
                } else {
                    setStatus("error");
                    setErrorMsg("Location request timed out. Please try again.");
                }
            },
            { timeout: 10000, enableHighAccuracy: false }
        );
    };

    const handleClear = (e) => {
        e.stopPropagation();
        localStorage.removeItem(STORAGE_KEY);
        setLocation(null);
        setStatus("idle");
        setDropdownOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative hidden md:block flex-shrink-0">
            {/* Trigger Button */}
            <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-start gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors group max-w-[160px]"
                title="Detect my location"
            >
                <FiMapPin
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-colors ${status === "success"
                            ? "text-primary-600"
                            : status === "loading"
                                ? "text-amber-500 animate-pulse"
                                : "text-gray-500 group-hover:text-primary-600"
                        }`}
                />
                <div className="text-left leading-tight">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
                        Deliver to
                    </p>
                    {status === "loading" ? (
                        <p className="text-xs font-semibold text-amber-600 truncate">Detecting…</p>
                    ) : status === "success" && location ? (
                        <p className="text-xs font-bold text-gray-800 truncate">
                            {location.city}
                            {location.pincode ? ` ${location.pincode}` : ""}
                        </p>
                    ) : (
                        <p className="text-xs font-semibold text-primary-600 truncate">
                            Detect location
                        </p>
                    )}
                </div>
            </button>

            {/* Dropdown Panel */}
            {dropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-slide-down">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <FiMapPin className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-bold text-gray-800">Delivery Location</span>
                        </div>
                        <button
                            onClick={() => setDropdownOpen(false)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4">
                        {/* Current Location Display */}
                        {status === "success" && location && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{location.city}</p>
                                        {location.area && (
                                            <p className="text-xs text-gray-500 mt-0.5">{location.area}</p>
                                        )}
                                        {location.pincode && (
                                            <p className="text-xs text-gray-500">Pincode: {location.pincode}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleClear}
                                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                        title="Clear location"
                                    >
                                        <FiX className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error / Denied Message */}
                        {(status === "error" || status === "denied") && errorMsg && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                                <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-600">{errorMsg}</p>
                            </div>
                        )}

                        {/* Detect / Refresh Button */}
                        <button
                            onClick={fetchLocation}
                            disabled={status === "loading"}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${status === "loading"
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:shadow-brand active:scale-95"
                                }`}
                        >
                            {status === "loading" ? (
                                <>
                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                    Detecting location…
                                </>
                            ) : status === "success" ? (
                                <>
                                    <FiRefreshCw className="w-4 h-4" />
                                    Update Location
                                </>
                            ) : (
                                <>
                                    <FiMapPin className="w-4 h-4" />
                                    Use My Current Location
                                </>
                            )}
                        </button>

                        <p className="mt-3 text-center text-[11px] text-gray-400">
                            We use your location to show delivery availability
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationWidget;
