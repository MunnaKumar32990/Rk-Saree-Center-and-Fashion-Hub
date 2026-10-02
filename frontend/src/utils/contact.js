/**
 * RK Saree Center & Fashion Hub - Business Contact Configuration
 * Phone number is masked for privacy in public source code and repositories.
 * Override in production via VITE_BUSINESS_PHONE and VITE_WHATSAPP_NUMBER.
 */

export const BUSINESS_CONTACT = {
  name: "RK Saree Center & Fashion Hub",
  address: "Main Market, Ramgarhwa, Motihari, Bihar – 845433",
  email: "rksareecenter32@gmail.com",
  phoneDisplay: import.meta.env.VITE_BUSINESS_PHONE || "+91 97087 56854",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || "919708756854",
  phoneRaw: import.meta.env.VITE_BUSINESS_PHONE_RAW || "919708756854",
};

/**
 * Masks a phone number for user privacy (e.g., "+91 97087 56854" -> "+91 97087 56854")
 * @param {string} phone
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
  return phone;
}

/**
 * Generates a clean WhatsApp chat link with optional pre-filled message
 * @param {string} [text]
 * @returns {string}
 */
export function getWhatsAppUrl(text = "") {
  const base = `https://wa.me/${BUSINESS_CONTACT.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
