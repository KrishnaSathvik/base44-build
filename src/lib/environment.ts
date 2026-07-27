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

export function collectEnvironmentContext(): EnvironmentContext {
  const parsed = parseUserAgent(navigator.userAgent, navigator.platform);
  // A product may pass its current path as ?page=/chat. Never use referrer:
  // it can reveal unrelated browsing history. Fall back to this portal path.
  const suppliedPage = new URLSearchParams(window.location.search).get('page');
  const pageUrl = suppliedPage || window.location.pathname;
  return {
    ...parsed,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pageUrl,
  };
}
