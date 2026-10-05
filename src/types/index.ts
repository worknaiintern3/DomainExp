export interface User {
  id: string;
  email: string;
  displayName: string | null;
  organization?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  session: AuthSession;
  user: User;
}

export interface DomainItem {
  id: string;
  name: string;
  tld: string;
  registrar: string;
  autoRenew: boolean;
  registrationDate?: string;
  expiresAt: string;
  daysRemaining: number;
  renewalPrice: number;
  currency: string;
  status: 'safe' | 'warning' | 'critical';
  dnsProvider?: string;
  sslStatus?: 'active' | 'expiring' | 'expired' | 'none';
  httpStatus?: string;
  rdapStatus?: string;
  nameservers?: string[];
  tags?: string[];
  notes?: string;
  logoUrl?: string;
}

export interface ServerItem {
  id: string;
  name: string;
  provider: string;
  region?: string;
  ipAddress?: string;
  cpu?: string;
  memory?: string;
  os?: string;
  status: 'healthy' | 'warning' | 'offline';
  uptime?: string;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  diskUsagePercent?: number;
  connectedDomains?: string[];
}

export interface ApplicationItem {
  id: string;
  name: string;
  environment: 'Production' | 'Staging' | 'Development';
  status: 'healthy' | 'warning' | 'error';
  url?: string;
  serverName?: string;
  updatedAt?: string;
  packageId?: string;
  version?: string;
  developerName?: string;
  playStoreUrl?: string;
  iconUrl?: string;
  installs?: string;
  rating?: number;
  releaseTrack?: string;
}

export interface WebsiteItem {
  id: string;
  name: string;
  url: string;
  category?: 'Production' | 'Staging' | 'Personal' | 'Client' | 'Tools';
  status?: 'healthy' | 'warning' | 'error';
  sslStatus?: 'active' | 'expiring' | 'none';
  httpStatus?: string;
  responseTimeMs?: number;
  logoUrl?: string;
  tags?: string[];
  notes?: string;
  createdAt?: string;
  lastCheckedAt?: string;
}

export interface InventorySummary {
  domains: number;
  servers: number;
  cloudResources?: number;
  applications: number;
  alerts: number;
  criticalExpirations: number;
  warningExpirations: number;
  safeDomains: number;
  upcomingRenewals: number;
  estimatedRenewalCost: number;
  currency: string;
}

export interface DomainSearchResult {
  domain: string;
  tld: string;
  available: boolean;
  price?: number;
  currency?: string;
  premium?: boolean;
  whoisSummary?: {
    registrar?: string;
    creationDate?: string;
    expirationDate?: string;
  };
}

export interface RegistrarPricing {
  registrarId: string;
  registrarName: string;
  tld: string;
  registrationPrice: number;
  renewalPrice: number;
  transferPrice: number;
  currency: string;
  freePrivacy: boolean;
  freeDns: boolean;
  recommended?: boolean;
}

export interface AlertItem {
  id: string;
  domainId?: string;
  domainName: string;
  title: string;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  timeAgo?: string;
  timeframeBadge?: string;
}
