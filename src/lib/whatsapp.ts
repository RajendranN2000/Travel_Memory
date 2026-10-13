/**
 * WhatsApp enquiry link (wa.me): free, no API and no account needed. Set
 * NEXT_PUBLIC_WHATSAPP_NUMBER to the number in international format, digits
 * only (for example 919876543210). Returns null when it isn't configured.
 */
export function whatsappLink(message: string): string | null {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (number.length < 8 || number.length > 15) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
