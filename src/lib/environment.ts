export interface EnvironmentContext {
  browserName?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  pageUrl?: string;
}

export function parseUserAgent(userAgent: string, platform = ''): Pick<EnvironmentContext, 'browserName' | 'browserVersion' | 'operatingSystem' | 'deviceType'> {
  const browser = userAgent.match(/Edg\/([\d.]+)/) ? ['Edge', RegExp.$1]
    : userAgent.match(/OPR\/([\d.]+)/) ? ['Opera', RegExp.$1]
    : userAgent.match(/CriOS\/([\d.]+)/) ? ['Chrome', RegExp.$1]
    : userAgent.match(/Chrome\/([\d.]+)/) ? ['Chrome', RegExp.$1]
    : userAgent.match(/FxiOS\/([\d.]+)/) ? ['Firefox', RegExp.$1]
    : userAgent.match(/Firefox\/([\d.]+)/) ? ['Firefox', RegExp.$1]
    : userAgent.match(/Version\/([\d.]+).*Safari/) ? ['Safari', RegExp.$1] : [undefined, undefined];
  const operatingSystem = /iPhone|iPad|iPod/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Mac OS X|Macintosh/.test(userAgent) || /Mac/.test(platform) ? 'macOS'
    : /Linux/.test(userAgent) ? 'Linux' : undefined;
  const deviceType = /iPhone/.test(userAgent) ? 'iPhone'
    : /iPad/.test(userAgent) ? 'iPad'
    : /Android.*Mobile/.test(userAgent) ? 'Android phone'
    : /Android/.test(userAgent) ? 'Android tablet' : 'Desktop';
  return { browserName: browser[0], browserVersion: browser[1]?.split('.').slice(0, 2).join('.'), operatingSystem, deviceType };
}

/**
 * Collects non-identifying reproduction context.
 * Page comes only from an explicit `?page=` param (products can deep-link into the portal).
 * Never use the feedback portal path or document.referrer — those are either useless or invasive.
 */
export function collectEnvironmentContext(search = typeof window !== 'undefined' ? window.location.search : ''): EnvironmentContext {
  const parsed = parseUserAgent(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
    typeof navigator !== 'undefined' ? navigator.platform : '',
  );
  const suppliedPage = new URLSearchParams(search).get('page')?.trim() || undefined;
  return {
    ...parsed,
    screenWidth: typeof window !== 'undefined' ? window.screen?.width : undefined,
    screenHeight: typeof window !== 'undefined' ? window.screen?.height : undefined,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
    pageUrl: suppliedPage,
  };
}
