export function configuredHostedUrlReason({ file, match, surrounding, appBaseUrl }) {
  if (match === 'vensaos' && /(?:https:\/\/)?(?:www\.)?vensaos\.com(?:[\s/?#`"'<>]|$)/.test(surrounding)) {
    return 'approved canonical or redirect hostname';
  }
  if (file !== 'dist/index.html' || !appBaseUrl) return '';
  try {
    const hostname = new URL(appBaseUrl).hostname;
    if (hostname.includes(match) && surrounding.includes(hostname)) {
      return 'configured Base44 hosted application URL';
    }
  } catch {
    // Production URL validation is handled by the build configuration.
  }
  return '';
}
