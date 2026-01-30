// Utilities for text extraction and hashing

export async function computeContext() {
  const url = new URL(window.location.href);
  // Normalize: remove fragment, tracking params (utm_*, etc)
  // MVP: just use hostname + pathname
  // If we need stricter normalization (e.g. remove query params completely for articles),
  // we can use url.pathname. For now, assume pathname is good ID.
  const cleanUrl = url.origin + url.pathname;
  const domain = url.hostname;

  const domainHash = await sha256(domain);
  const urlHash = await sha256(cleanUrl);

  return { domainHash, urlHash, cleanUrl, domain };
}

async function sha256(message: string) {
  // Graceful fallback if crypto.subtle is not available (e.g. http)
  if (!window.crypto?.subtle) {
      console.warn('Crypto API not available, using fallback/mock hash for local dev/http');
      // Simple mock hash (adler-32 or similar) - DO NOT USE IN PROD FOR SECURITY
      // For MVP dev on localhost/http it might be needed.
      // But for production extension (https mainly), crypto.subtle is fine.
      // We'll return a simple string derived from input.
      return btoa(message).substring(0, 32); 
  }
  
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function extractPageText(): string {
  // Prefer viewport or main article
  // Simple heuristic: Get all P tags, filter noisy ones, join
  const paragraphs = Array.from(document.querySelectorAll('p'));
  
  // Filter out short/navigational
  const viable = paragraphs.filter(p => {
    const text = p.textContent?.trim() || '';
    return text.length > 60 && p.offsetParent !== null; // Visible
  });

  // Simple Reading Order (DOM order usually suffices)
  
  let combined = viable.map(p => p.textContent?.trim()).join('\n\n');
  
  // Cap at 2000 chars, ideal 800-1500
  if (combined.length > 2000) {
    combined = combined.substring(0, 2000);
    // trim to last period to avoid cut-off sentences
    const lastDot = combined.lastIndexOf('.');
    if (lastDot > 1500) combined = combined.substring(0, lastDot + 1);
  }

  return combined;
}
