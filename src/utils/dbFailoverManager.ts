import { getFirestoreStatus } from './firestoreStatus';

export interface DatabaseNode {
  name: string;
  type: 'firestore' | 'mongodb' | 'localstorage';
  status: 'active' | 'standby' | 'exhausted' | 'error';
  latencyMs: number;
  description: string;
}

class DatabaseFailoverManager {
  private activeDb: 'firestore' | 'mongodb' | 'localstorage' = 'firestore';
  private quotaExceededCount = 0;
  private listeners: Set<(active: string, nodes: DatabaseNode[]) => void> = new Set();

  constructor() {
    // Check firestore status periodically
    setInterval(() => {
      const fsStatus = getFirestoreStatus();
      if (fsStatus.isQuotaExceeded && this.activeDb === 'firestore') {
        this.quotaExceededCount++;
        console.warn(`⚠️ Primary Database (Firestore) quota exhausted! Switching to Backup Database (MongoDB Atlas / Local Cache). Count: ${this.quotaExceededCount}`);
        this.activeDb = 'mongodb';
        this.notifyListeners();
      }
    }, 5000);
  }

  public getActiveDatabase(): 'firestore' | 'mongodb' | 'localstorage' {
    const fsStatus = getFirestoreStatus();
    if (fsStatus.isQuotaExceeded) {
      return 'mongodb';
    }
    return this.activeDb;
  }

  public getDatabaseNodes(): DatabaseNode[] {
    const fsStatus = getFirestoreStatus();
    return [
      {
        name: 'Primary Cloud DB (Firestore)',
        type: 'firestore',
        status: fsStatus.isQuotaExceeded ? 'exhausted' : (fsStatus.hasError ? 'error' : 'active'),
        latencyMs: fsStatus.isQuotaExceeded ? 9999 : 45,
        description: 'Main production database for real-time sync & auth'
      },
      {
        name: 'Backup Cloud DB (MongoDB Atlas)',
        type: 'mongodb',
        status: fsStatus.isQuotaExceeded ? 'active' : 'standby',
        latencyMs: 65,
        description: 'Automatic failover backup database (shustodb)'
      },
      {
        name: 'Offline Fallback (LocalStorage / IndexedDB)',
        type: 'localstorage',
        status: 'active',
        latencyMs: 2,
        description: 'Client-side emergency cache to prevent any data loss'
      }
    ];
  }

  public subscribe(listener: (active: string, nodes: DatabaseNode[]) => void) {
    this.listeners.add(listener);
    listener(this.getActiveDatabase(), this.getDatabaseNodes());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const active = this.getActiveDatabase();
    const nodes = this.getDatabaseNodes();
    this.listeners.forEach(fn => fn(active, nodes));
  }
}

export const dbFailoverManager = new DatabaseFailoverManager();
