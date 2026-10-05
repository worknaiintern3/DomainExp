import { getUserItem, setUserItem, STORAGE_KEYS } from './storage';
import { apiGet, apiPost, apiDelete } from './api';
import type { DomainItem } from '../types';

const DUMMY_DOMAINS = new Set([
  'domainpulse.io',
  'pulsecloud.dev',
  'apigateway.net',
  'securevault.org',
  'example.com',
  'api.example.com',
  'test.com',
]);

async function getStoredDomains(): Promise<DomainItem[]> {
  try {
    const raw = await getUserItem(STORAGE_KEYS.DOMAINS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((d) => d && typeof d.name === 'string' && d.name.trim().length > 0)
          .map((d) => ({
            ...d,
            logoUrl: d.logoUrl || getDomainLogoUrl(d.name),
            currency: '₹',
            renewalPrice:
              d.renewalPrice && d.renewalPrice >= 100
                ? d.renewalPrice
                : d.tld === '.ai'
                ? 5800
                : d.tld === '.io'
                ? 3200
                : d.tld === '.in'
                ? 499
                : 899,
          }));
      }
    }
  } catch {}
  return [];
}

async function saveStoredDomains(items: DomainItem[]): Promise<void> {
  try {
    await setUserItem(STORAGE_KEYS.DOMAINS_LIST, JSON.stringify(items));
  } catch {}
}

export async function fetchDomainsList(): Promise<DomainItem[]> {
  const localList = await getStoredDomains();
  return localList;
}

import { fetchLiveDomainDetails, getDomainLogoUrl } from './liveDomainLookup';

export async function createDomain(data: {
  name: string;
  registrar?: string;
  autoRenew?: boolean;
}): Promise<DomainItem> {
  const cleanName = data.name.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const ext = cleanName.includes('.') ? `.${cleanName.split('.').pop()}` : '.com';
  const logoUrl = getDomainLogoUrl(cleanName);

  const realRegistrar = data.registrar?.trim() || 'Authoritative Registry';
  const realExpDate = new Date(Date.now() + 365 * 86400000).toISOString();
  const daysRemaining = 365;

  const newDomain: DomainItem = {
    id: `dom-${Date.now()}`,
    name: cleanName,
    tld: ext,
    registrar: realRegistrar,
    autoRenew: data.autoRenew ?? true,
    registrationDate: new Date().toISOString().split('T')[0],
    expiresAt: realExpDate,
    daysRemaining,
    renewalPrice: ext === '.ai' ? 5800 : ext === '.io' ? 3200 : ext === '.in' ? 499 : 899,
    currency: '₹',
    status: 'safe',
    dnsProvider: 'Authoritative DNS',
    sslStatus: 'active',
    httpStatus: '200 OK',
    rdapStatus: 'Synchronized',
    nameservers: [],
    tags: ['Live'],
    logoUrl,
  };

  const current = await getStoredDomains();
  const updated = [newDomain, ...current.filter((d) => d.name.toLowerCase() !== cleanName)];
  await saveStoredDomains(updated);

  // Background non-blocking live RDAP/DNS telemetry sync
  (async () => {
    try {
      const live = await fetchLiveDomainDetails(cleanName);
      let updatedRegistrar = newDomain.registrar;
      if (live.registrar && (!data.registrar?.trim() || newDomain.registrar === 'Authoritative Registry')) {
        updatedRegistrar = live.registrar;
      }
      const updatedRegDate = live.registrationDate || newDomain.registrationDate;
      const updatedExpDate = live.expirationDate ? new Date(live.expirationDate).toISOString() : newDomain.expiresAt;
      const expTime = updatedExpDate ? new Date(updatedExpDate).getTime() : NaN;
      const calculatedDays = isNaN(expTime)
        ? newDomain.daysRemaining
        : Math.max(0, Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24)));

      const freshDomain: DomainItem = {
        ...newDomain,
        registrar: updatedRegistrar,
        registrationDate: updatedRegDate,
        expiresAt: updatedExpDate,
        daysRemaining: calculatedDays,
        nameservers: live.nameservers && live.nameservers.length > 0 ? live.nameservers : newDomain.nameservers,
      };

      await updateDomainRecord(newDomain.id, freshDomain);
    } catch {}
  })();

  // Background API sync
  apiPost<any>('/domains', data).catch(() => {});

  return newDomain;
}

export async function importDomainsBatch(
  items: Array<{ name: string; registrar?: string; autoRenew?: boolean }>,
  options?: { updateExisting?: boolean; addNewOnly?: boolean }
): Promise<{ added: number; updated: number; skipped: number; total: number }> {
  const current = await getStoredDomains();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  const currentMap = new Map<string, DomainItem>();
  for (const d of current) {
    currentMap.set(d.name.toLowerCase(), d);
  }

  const resultList: DomainItem[] = [...current];

  for (const item of items) {
    const cleanName = item.name.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!cleanName || !cleanName.includes('.')) {
      skipped++;
      continue;
    }

    const existing = currentMap.get(cleanName);
    if (existing) {
      if (options?.addNewOnly) {
        skipped++;
        continue;
      }
      if (options?.updateExisting !== false) {
        existing.registrar = item.registrar || existing.registrar;
        if (item.autoRenew !== undefined) existing.autoRenew = item.autoRenew;
        updated++;
      } else {
        skipped++;
      }
    } else {
      let realRegistrar = item.registrar?.trim() || 'Custom Registrar';
      let realRegDate = new Date().toISOString().split('T')[0];
      let realExpDate = new Date(Date.now() + 365 * 86400000).toISOString();
      let realNameservers: string[] = [];

      try {
        const live = await fetchLiveDomainDetails(cleanName);
        if (live.registrar && !item.registrar?.trim()) realRegistrar = live.registrar;
        if (live.registrationDate) realRegDate = live.registrationDate;
        if (live.expirationDate) realExpDate = new Date(live.expirationDate).toISOString();
        if (live.nameservers) realNameservers = live.nameservers;
      } catch {}

      const expTime = new Date(realExpDate).getTime();
      const days = isNaN(expTime) ? 365 : Math.max(0, Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24)));
      const ext = `.${cleanName.split('.').pop() || 'com'}`;

      const newDomain: DomainItem = {
        id: `dom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: cleanName,
        tld: ext,
        registrar: realRegistrar,
        autoRenew: item.autoRenew ?? true,
        registrationDate: realRegDate,
        expiresAt: realExpDate,
        daysRemaining: days,
        renewalPrice: ext === '.ai' ? 5800 : ext === '.io' ? 3200 : ext === '.in' ? 499 : 899,
        currency: '₹',
        status: (days <= 3 ? 'critical' : days <= 10 ? 'warning' : 'safe') as 'critical' | 'warning' | 'safe',
        dnsProvider: 'Healthy',
        sslStatus: 'active',
        httpStatus: '200 OK',
        rdapStatus: 'Synchronized',
        nameservers: realNameservers,
        tags: ['Imported'],
      };
      resultList.unshift(newDomain);
      currentMap.set(cleanName, newDomain);
      added++;
    }
  }

  await saveStoredDomains(resultList);
  return { added, updated, skipped, total: items.length };
}

export async function updateDomainRecord(id: string, patch: Partial<DomainItem>): Promise<void> {
  const current = await getStoredDomains();
  const index = current.findIndex((d) => d.id === id || d.name.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    current[index] = { ...current[index], ...patch };
    await saveStoredDomains(current);
  }
}

export async function deleteDomain(id: string): Promise<void> {
  const current = await getStoredDomains();
  const updated = current.filter((d) => d.id !== id);
  await saveStoredDomains(updated);
  apiDelete(`/domains/${id}`).catch(() => {});
}


