import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMapPin, FiPhone, FiHome, FiArrowRight, FiArrowLeft, FiShoppingBag, FiCheck, FiLoader, FiInfo } from "react-icons/fi";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import TrustBar, { DeliveryPromise, PaymentMarks } from "../components/TrustBar";
import {
  calculateOrderTotals,
  getShippingMethod,
  amountToFreeShipping,
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_METHODS,
} from "../utils/pricing";
import api from "../services/api";
import { writeJSON, readJSON, KEYS } from "../utils/storage";
import { getWhatsAppUrl } from "../utils/contact";

const STEPS = ["Cart", "Shipping", "Payment"];

/**
 * Accessible input.
 *
 * The original InputField had three separate problems:
 *  - `<label>` with no `htmlFor`, so clicking it didn't focus the field and
 *    screen readers had no association (WCAG 1.3.1 / 4.1.2).
 *  - `className` was spread from props AND concatenated, so the base classes
 *    could be overridden away.
 *  - No `autocomplete` attributes anywhere, which disables browser autofill —
 *    a real cost on mobile, where retyping an address is the single biggest
 *    source of form abandonment.
 */
const InputField = ({ label, icon: Icon, id, hint, error, optional, ...props }) => {
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {optional && <span className="font-normal text-gray-400 ml-1">(optional)</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          {...props}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px] ${
            error ? "border-red-400 bg-red-50/40" : "border-gray-200 focus:border-primary-500"
          } ${props.className || ""}`}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 mt-1.5" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-500 mt-1.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Checkout — Step 2 of 3.
 *
 * What changed and why:
 *
 * 1. **PIN code goes first.** Research on Indian D2C checkout abandonment is
 *    specific that the PIN code should be the first address field because it
 *    auto-fills city and state, cutting form errors substantially. It was last.
 *
 * 2. **Live serviceability check.** "We don't deliver to your PIN" discovered at
 *    the payment step is a top abandonment cause, and unserviceable PINs are the
 *    #1 source of failed COD deliveries. Now checked as they type, with city and
 *    state auto-filled from the lookup.
 *
 * 3. **Real shipping options.** ShippingInfo.jsx advertised "Express (2-3 days,
 *    ₹200)" but no such option existed in code — the site promised something it
 *    couldn't deliver. Express is now selectable and actually charged.
 *
 * 4. **Delivery date commitment.** A vague "ships in 2-5 days" converts roughly
 *    half as well as a real date range.
 *
 * 5. **Gift options and delivery instructions.** The order model already had
 *    `orderNotes`, `isGift`, `giftNote` and `giftWrap` fields and the admin
 *    order screen already rendered them — the form simply never collected them.
 *
 * 6. **Editing the address on the next step no longer silently discards it.**
 *    The old initialiser rebuilt `form` from `userInfo.address` every mount, so
 *    returning from /placeorder to fix a typo threw away everything typed.
 *
 * 7. **Saved addresses** — the address is offered once and then reused, instead
 *    of being retyped on every single order.
 */
const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, outOfStockItems } = useCart();
  const { userInfo, updateUser } = useAuth();

  const [form, setForm] = useState(() => {
    // Resume an in-progress checkout rather than throwing the work away.
    const saved = readJSON(KEYS.ADDRESS, null);
    const profile = userInfo?.address || {};
    return {
      fullName: saved?.fullName || userInfo?.name || "",
      address: saved?.address || profile.street || "",
      city: saved?.city || profile.city || "",
      state: saved?.state || profile.state || "",
      postalCode: saved?.postalCode || profile.postalCode || "",
      landmark: saved?.landmark || profile.landmark || "",
      phone: saved?.phone || profile.phone || userInfo?.phone || "",
      country: "India",
    };
  });

  const [shippingMethod, setShippingMethod] = useState(
    () => readJSON(KEYS.ADDRESS, {})?.shippingMethod || "standard"
  );
  const [giftWrap, setGiftWrap] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);

  const [pinState, setPinState] = useState({ status: "idle", data: null });
  const [codInfo, setCodInfo] = useState(null);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const savedAddresses = useMemo(() => {
    if (Array.isArray(userInfo?.addresses) && userInfo.addresses.length > 0) {
      return userInfo.addresses;
    }
    if (userInfo?.address?.street) {
      return [
        {
          _id: "default-legacy",
          label: "Home",
          fullName: userInfo.address.fullName || userInfo.name || "",
          street: userInfo.address.street,
          city: userInfo.address.city,
          state: userInfo.address.state,
          postalCode: userInfo.address.postalCode || userInfo.address.pinCode,
          landmark: userInfo.address.landmark || "",
          phone: userInfo.address.phone || userInfo.phone || "",
          isDefault: true,
        },
      ];
    }
    return [];
  }, [userInfo]);

  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const handleSelectSavedAddress = (addr, id) => {
    setSelectedAddressId(id);
    setForm({
      fullName: addr.fullName || userInfo?.name || "",
      address: addr.street || addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      postalCode: (addr.postalCode || addr.pinCode || "").replace(/\D/g, "").slice(0, 6),
      landmark: addr.landmark || "",
      phone: (addr.phone || userInfo?.phone || "").replace(/\D/g, "").slice(0, 10),
      country: "India",
    });
    setTouched({
      fullName: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
    });
  };

  useEffect(() => {
    if (cartItems.length === 0) navigate("/", { replace: true });
  }, [cartItems.length, navigate]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0),
    [cartItems]
  );

  const totals = useMemo(
    () => calculateOrderTotals(subtotal, 0, shippingMethod),
    [subtotal, shippingMethod]
  );
  const toFreeShipping = amountToFreeShipping(subtotal);
  const chosenMethod = getShippingMethod(shippingMethod);

  const set = useCallback((field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setTouched((t) => ({ ...t, [field]: true }));
  }, []);

  // ── PIN code lookup, debounced ─────────────────────────────────────────────
  useEffect(() => {
    const pin = form.postalCode.replace(/\D/g, "");

    if (pin.length !== 6) {
      setPinState({ status: pin.length ? "incomplete" : "idle", data: null });
      return undefined;
    }

    let cancelled = false;
    setPinState({ status: "checking", data: null });

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/contact/check-pincode", { pincode: pin });
        if (cancelled) return;

        if (data?.serviceable === false) {
          setPinState({ status: "unserviceable", data });
          toast.error(data.message || "We don't deliver to this PIN code yet");
          return;
        }
        setPinState({ status: data?.serviceable ? "ok" : "unknown", data });

        // Auto-fill city/state — saves the shopper typing two more fields and
        // removes the most common source of address-form error.
        if (data?.city || data?.state) {
          setForm((f) => ({
            ...f,
            city: data.city || f.city,
            state: data.state || f.state,
          }));
        }
      } catch {
        if (!cancelled) setPinState({ status: "unknown", data: null });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.postalCode]);

  // ── COD eligibility for this PIN + cart value ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post("/orders/quote", {
          subtotal: totals.total,
          postalCode: form.postalCode.replace(/\D/g, ""),
          shippingMethod,
        });
        if (!cancelled) setCodInfo(data?.cod || null);
      } catch {
        /* not worth blocking on */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [totals.total, form.postalCode, shippingMethod]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Enter the name for delivery";
    if (!form.address.trim() || form.address.trim().length < 6) e.address = "Enter your full address";
    if (!form.city.trim()) e.city = "Enter your city";
    if (!form.state.trim()) e.state = "Enter your state";
    if (!/^[1-9]\d{5}$/.test(form.postalCode)) e.postalCode = "Enter a valid 6-digit PIN code";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, ""))) {
      e.phone = "Enter a valid 10-digit mobile number";
    }
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const blockedByStock = outOfStockItems.length > 0;
  const blockedByPin = pinState.status === "unserviceable";

  const submitHandler = async (e) => {
    e.preventDefault();

    if (blockedByStock) {
      toast.error(
        `Please update your cart — ${outOfStockItems.length} item(s) no longer have enough stock`
      );
      navigate("/cart");
      return;
    }
    if (!isValid) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      toast.error("Please complete the highlighted fields");
      return;
    }
    if (blockedByPin) {
      toast.error("We can't deliver to this PIN code yet");
      return;
    }

    setSubmitting(true);

    const payload = {
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.replace(/\D/g, ""),
      country: "India",
      landmark: form.landmark.trim(),
      phone: form.phone.replace(/\D/g, ""),
      shippingMethod,
      notes: notes.trim(),
      isGift,
      giftNote: giftNote.trim(),
      giftWrap,
    };

    try {
      writeJSON(KEYS.ADDRESS, payload);

      // Save to the profile so the next order is a one-tap address, not a retype.
      if (saveAddress && userInfo?.token) {
        try {
          const currentAddresses = Array.isArray(userInfo?.addresses) ? userInfo.addresses : [];
          const exists = currentAddresses.some(
            (a) => a.street?.trim() === payload.address && a.postalCode?.trim() === payload.postalCode
          );
          const updatedAddresses = exists
            ? currentAddresses
            : [
                ...currentAddresses,
                {
                  label: "Home",
                  fullName: payload.fullName,
                  street: payload.address,
                  city: payload.city,
                  state: payload.state,
                  postalCode: payload.postalCode,
                  landmark: payload.landmark,
                  phone: payload.phone,
                  country: "India",
                  isDefault: currentAddresses.length === 0,
                },
              ];

          const { data } = await api.put("/users/profile", {
            addresses: updatedAddresses,
            address: {
              fullName: payload.fullName,
              street: payload.address,
              city: payload.city,
              state: payload.state,
              postalCode: payload.postalCode,
              landmark: payload.landmark,
              phone: payload.phone,
              country: "India",
            },
            phone: payload.phone,
          });
          if (data?.token) updateUser(data);
        } catch {
          // Non-fatal — never block checkout on a profile write.
        }
      }
    } finally {
      navigate("/placeorder");
    }
  };

  if (cartItems.length === 0) return null;

  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const showPinError = touched.postalCode && errors.postalCode;

  return (
    <>
      <Seo
        title="Delivery Address"
        description="Enter your delivery address and choose a shipping speed."
        url="/checkout"
        noindex
      />

      <div className="min-h-screen bg-brand-bg py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Checkout progress" className="mb-8">
            <ol className="flex items-center justify-center gap-1 sm:gap-2">
              {STEPS.map((s, i) => {
                const state = i === 0 ? "done" : i === 1 ? "current" : "todo";
                return (
                  <li key={s} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <span
                        aria-current={state === "current" ? "step" : undefined}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          state === "done"
                            ? "bg-primary-600 text-white"
                            : state === "current"
                              ? "bg-primary-600 text-white ring-4 ring-primary-100"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {state === "done" ? <FiCheck className="w-4 h-4" aria-hidden="true" /> : i + 1}
                      </span>
                      <span
                        className={`text-[11px] sm:text-xs mt-1 font-medium ${
                          state === "todo" ? "text-gray-400" : "text-primary-700"
                        }`}
                      >
                        {s}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`h-0.5 w-8 sm:w-16 mt-[-14px] mx-1 ${
                          state === "done" ? "bg-primary-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {blockedByStock && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
            >
              <p className="font-semibold mb-1">Some items need your attention</p>
              <ul className="list-disc list-inside space-y-0.5">
                {outOfStockItems.map((i) => (
                  <li key={i.cartKey}>
                    {i.name} — only {i.countInStock || 0} left, you wanted {i.qty}
                  </li>
                ))}
              </ul>
              <Link to="/cart" className="inline-block mt-2 font-semibold underline">
                Adjust cart
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-3">
              <form
                onSubmit={submitHandler}
                noValidate
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-7"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <FiMapPin className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="font-outfit font-bold text-gray-900 text-xl">Delivery details</h1>
                    <p className="text-gray-500 text-sm">Where should we send it?</p>
                  </div>
                </div>

                {/* 1-Click Saved Addresses Picker */}
                {savedAddresses.length > 0 && (
                  <div className="mb-6 p-4 bg-primary-50/50 border border-primary-200/70 rounded-2xl">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-primary-950 uppercase tracking-wider flex items-center gap-1.5">
                        <FiMapPin className="w-3.5 h-3.5 text-primary-600" />
                        Saved Addresses
                      </span>
                      <span className="text-xs text-primary-700 font-semibold">1-tap autofill</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {savedAddresses.map((addr, idx) => {
                        const id = addr._id || idx;
                        const isSelected = selectedAddressId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr, id)}
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                              isSelected
                                ? "bg-white border-primary-600 shadow-sm ring-2 ring-primary-500/20"
                                : "bg-white/80 border-gray-200 hover:border-primary-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                {addr.label || "Address"}
                              </span>
                              {isSelected && (
                                <span className="text-primary-600 text-xs font-bold flex items-center gap-1">
                                  <FiCheck className="w-3.5 h-3.5" /> Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-gray-900 truncate">{addr.fullName || userInfo?.name}</p>
                            <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{addr.street || addr.address}</p>
                            <p className="text-[11px] font-medium text-gray-700">
                              {addr.city} - {addr.postalCode || addr.pinCode}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <InputField
                    id="fullName"
                    label="Full name"
                    icon={FiHome}
                    autoComplete="name"
                    placeholder="Who should we hand it to?"
                    required
                    value={form.fullName}
                    onChange={(e) => set("fullName")(e.target.value)}
                    error={touched.fullName ? errors.fullName : ""}
                  />

                  <div>
                    <InputField
                      id="postalCode"
                      label="PIN code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      placeholder="6 digits"
                      required
                      value={form.postalCode}
                      onChange={(e) => set("postalCode")(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      error={showPinError ? errors.postalCode : ""}
                      hint={
                        pinState.status === "checking"
                          ? undefined
                          : "We use this to check delivery and Cash on Delivery availability"
                      }
                    />
                    <div aria-live="polite" className="min-h-[20px]">
                      {pinState.status === "checking" && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1.5">
                          <FiLoader className="w-3 h-3 animate-spin" aria-hidden="true" />
                          Checking delivery to your area…
                        </p>
                      )}
                      {pinState.status === "ok" && pinState.data && (
                        <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1.5">
                          <FiCheck className="w-3 h-3" aria-hidden="true" />
                          Deliverable to {pinState.data.district || pinState.data.city || "your PIN"}
                          {codInfo?.eligible && " · Cash on Delivery available"}
                        </p>
                      )}
                      {pinState.status === "unserviceable" && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5">
                          <FiInfo className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            {pinState.data?.message || "We don't deliver to this PIN yet."}{" "}
                            <a
                              href={getWhatsAppUrl("Hi RK Saree Center, my PIN code is showing unserviceable, can you help deliver?")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium"
                            >
                              WhatsApp us
                            </a>{" "}
                            — we may be able to arrange a courier anyway.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <InputField
                    id="address"
                    label="Full address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="House/Flat no, building, street, area"
                    required
                    value={form.address}
                    onChange={(e) => set("address")(e.target.value)}
                    error={touched.address ? errors.address : ""}
                  />

                  <InputField
                    id="landmark"
                    label="Landmark"
                    type="text"
                    autoComplete="off"
                    optional
                    placeholder="Near the temple, opposite SBI bank…"
                    hint="Helps our courier find you first time — fewer failed deliveries"
                    value={form.landmark}
                    onChange={(e) => set("landmark")(e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      id="city"
                      label="City"
                      type="text"
                      autoComplete="address-level2"
                      required
                      value={form.city}
                      onChange={(e) => set("city")(e.target.value)}
                      error={touched.city ? errors.city : ""}
                    />
                    <InputField
                      id="state"
                      label="State"
                      type="text"
                      autoComplete="address-level1"
                      required
                      value={form.state}
                      onChange={(e) => set("state")(e.target.value)}
                      error={touched.state ? errors.state : ""}
                    />
                  </div>

                  <InputField
                    id="phone"
                    label="Mobile number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="10-digit number"
                    required
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    error={touched.phone ? errors.phone : ""}
                    hint="The delivery agent will call this before arriving"
                  />

                  <fieldset className="pt-2">
                    <legend className="text-sm font-semibold text-gray-700 mb-2.5">
                      How fast do you need it?
                    </legend>
                    <div className="space-y-2">
                      {SHIPPING_METHODS.map((m) => {
                        const cost = subtotal >= m.freeAbove ? 0 : m.price;
                        const selected = shippingMethod === m.id;
                        return (
                          <label
                            key={m.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all min-h-[56px] ${
                              selected
                                ? "border-primary-500 bg-primary-50/50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={m.id}
                              checked={selected}
                              onChange={() => setShippingMethod(m.id)}
                              className="mt-1 w-4 h-4 accent-primary-600 shrink-0"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="flex justify-between gap-2 items-baseline">
                                <span className="font-semibold text-gray-900 text-sm">{m.label}</span>
                                <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                  {cost === 0 ? (
                                    <span className="text-emerald-700">FREE</span>
                                  ) : (
                                    formatPrice(cost)
                                  )}
                                </span>
                              </span>
                              <span className="block text-xs text-gray-500 mt-0.5">
                                {m.daysLabel} · {m.description}
                              </span>
                              {m.id === "standard" && toFreeShipping > 0 && (
                                <span className="block text-xs text-primary-700 font-medium mt-1">
                                  Free when you spend {formatPrice(FREE_SHIPPING_THRESHOLD)} — add{" "}
                                  {formatPrice(toFreeShipping)} more
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <DeliveryPromise
                    methodId={shippingMethod}
                    codAmount={totals.total}
                    className="mt-2"
                  />

                  <div className="pt-2 border-t border-gray-100">
                    <InputField
                      id="notes"
                      label="Delivery instructions"
                      type="text"
                      autoComplete="off"
                      optional
                      maxLength={300}
                      placeholder="Gate code, best time to deliver, call before arriving…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isGift}
                          onChange={(e) => {
                            setIsGift(e.target.checked);
                            if (!e.target.checked) setGiftNote("");
                          }}
                          className="mt-0.5 w-4 h-4 accent-primary-600 shrink-0"
                        />
                        <span className="text-sm text-gray-700">
                          <strong className="text-gray-900">This is a gift</strong>
                          <span className="block text-xs text-gray-500">
                            We'll include a handwritten note and hide prices on the packing slip.
                          </span>
                        </span>
                      </label>

                      {isGift && (
                        <div className="pl-7 space-y-2.5">
                          <label htmlFor="giftNote" className="block text-sm font-medium text-gray-700">
                            Your message
                          </label>
                          <textarea
                            id="giftNote"
                            rows={3}
                            maxLength={500}
                            value={giftNote}
                            onChange={(e) => setGiftNote(e.target.value)}
                            placeholder="Happy Diwali, Meera! Wear it with joy — Ritu"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                          />
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={giftWrap}
                              onChange={(e) => setGiftWrap(e.target.checked)}
                              className="w-4 h-4 accent-primary-600"
                            />
                            <span className="text-sm text-gray-700">
                              Add gift wrapping <span className="text-emerald-700 font-medium">(free)</span>
                            </span>
                          </label>
                        </div>
                      )}

                      {userInfo?.token && (
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                            className="w-4 h-4 accent-primary-600"
                          />
                          <span className="text-sm text-gray-700">
                            Save this address for faster checkout next time
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {codInfo && !codInfo.eligible && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      {codInfo.reason}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/cart")}
                      className="flex items-center justify-center gap-2 sm:flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
                    >
                      <FiArrowLeft className="w-4 h-4" aria-hidden="true" />
                      Back to cart
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || blockedByStock || blockedByPin}
                      className="btn-shine flex items-center justify-center gap-2 sm:flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3.5 rounded-xl font-bold hover:shadow-brand transition-all active:scale-[.98] text-sm min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                    >
                      {submitting ? "Saving…" : "Review order"}
                      <FiArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <aside className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-6 lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4">
                  <FiShoppingBag className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  <h2 className="font-outfit font-bold text-gray-900 text-lg">Order summary</h2>
                  <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>

                <ul className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-4">
                  {cartItems.map((item) => (
                    <li key={item.cartKey} className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                        loading="lazy"
                        width={48}
                        height={48}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          Qty {item.qty}
                          {item.size && ` · ${item.size}`}
                          {item.color && ` · ${item.color}`}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                        {formatPrice(item.price * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="border-t border-gray-100 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold">{formatPrice(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <dt>{chosenMethod.label}</dt>
                    <dd className={`font-semibold ${totals.shipping === 0 ? "text-emerald-700" : ""}`}>
                      {totals.shipping === 0 ? "FREE" : formatPrice(totals.shipping)}
                    </dd>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                    <dt>Total</dt>
                    <dd>{formatPrice(totals.total)}</dd>
                  </div>
                </dl>

                <p className="mt-2 text-[11px] text-gray-400 text-center">
                  Taxes included. {chosenMethod.daysLabel}.
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <PaymentMarks />
                </div>
              </div>
            </aside>
          </div>

          <TrustBar variant="checkout" className="mt-8" />
        </div>
      </div>
    </>
  );
};

export default Checkout;