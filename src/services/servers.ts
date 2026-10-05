import { getUserItem, setUserItem, STORAGE_KEYS } from './storage';
import { apiGet, apiPost, apiDelete } from './api';
import type { ServerItem } from '../types';

const DEFAULT_MOCK_NAMES = new Set([
  'hostinger-vps-main',
  'hetzner-app-edge',
  'aws-route53-cluster',
  'digitalocean-sfo3',
]);

const DEFAULT_MOCK_IPS = new Set([
  '194.195.112.45',
  '159.69.214.88',
  '54.210.88.19',
  '138.68.240.112',
]);

const DEFAULT_MOCK_IDS = new Set([
  'srv-hostinger-01',
  'srv-hetzner-01',
  'srv-aws-01',
  'srv-do-01',
]);

function isMockServer(s: ServerItem): boolean {
  if (!s) return true;
  if (s.id && DEFAULT_MOCK_IDS.has(s.id)) return true;
  if (s.name && DEFAULT_MOCK_NAMES.has(s.name.toLowerCase().trim())) return true;
  if (s.ipAddress && DEFAULT_MOCK_IPS.has(s.ipAddress.trim())) return true;
  return false;
}

async function getStoredServers(): Promise<ServerItem[]> {
  try {
    const raw = await getUserItem(STORAGE_KEYS.SERVERS_LIST);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out all default mock servers
        const cleaned = parsed.filter((s: ServerItem) => !isMockServer(s));
        return cleaned;
      }
    }
  } catch {}
  return [];
}

async function saveStoredServers(items: ServerItem[]): Promise<void> {
  try {
    const cleanItems = items.filter((s: ServerItem) => !isMockServer(s));
    await setUserItem(STORAGE_KEYS.SERVERS_LIST, JSON.stringify(cleanItems));
  } catch {}
}

export async function clearAllServers(): Promise<void> {
  await setUserItem(STORAGE_KEYS.SERVERS_LIST, JSON.stringify([]));
}

export async function fetchServersList(): Promise<ServerItem[]> {
  const localList = await getStoredServers();
  return localList;
}

export async function createServer(data: Partial<ServerItem>): Promise<ServerItem> {
  const newServer: ServerItem = {
    id: `srv-${Date.now()}`,
    name: data.name || 'new-server-node',
    provider: data.provider || 'Hostinger',
    region: data.region || 'Mumbai (IN-South-01)',
    ipAddress: data.ipAddress || '192.168.1.1',
    cpu: data.cpu || '4 vCPU',
    memory: data.memory || '8 GB',
    os: data.os || 'Ubuntu 24.04 LTS',
    status: (data.status as any) || 'healthy',
    uptime: '100%',
    cpuUsagePercent: Math.floor(Math.random() * 30) + 10,
    memoryUsagePercent: Math.floor(Math.random() * 40) + 20,
    diskUsagePercent: Math.floor(Math.random() * 30) + 15,
    connectedDomains: data.connectedDomains || [],
  };

  const current = await getStoredServers();
  const updated = [newServer, ...current];
  await saveStoredServers(updated);
  apiPost<any>('/servers', newServer).catch(() => {});
  return newServer;
}

export async function deleteServer(id: string): Promise<void> {
  const current = await getStoredServers();
  const updated = current.filter((s) => s.id !== id);
  await saveStoredServers(updated);
  apiDelete(`/servers/${id}`).catch(() => {});
}

