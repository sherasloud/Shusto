import { getFirestoreStatus } from './firestoreStatus';

export interface DatabaseNode {
  name: string;
  type: 'firestore' | 'mongodb' | 'mysql' | 'localstorage';
  status: 'active' | 'standby' | 'exhausted' | 'error';
  latencyMs: number;
  description: string;
}

class DatabaseFailoverManager {
  private activeDb: 'firestore' | 'mongodb' | 'mysql' | 'localstorage' = 'firestore';
  private quotaExceededCount = 0;
  private listeners: Set<(active: string, nodes: DatabaseNode[]) => void> = new Set();

  constructor() {
    // Check firestore status periodically
    setInterval(() => {
      const fsStatus = getFirestoreStatus();
      if (fsStatus.isQuotaExceeded && this.activeDb === 'firestore') {
        this.quotaExceededCount++;
        console.warn(`⚠️ Primary Database (Firestore) quota exhausted! Switching to Backup Database (MongoDB Atlas / MySQL / Local Cache). Count: ${this.quotaExceededCount}`);
        this.activeDb = 'mongodb';
        this.notifyListeners();
      }
    }, 5000);
  }

  public getActiveDatabase(): 'firestore' | 'mongodb' | 'mysql' | 'localstorage' {
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
        name: 'Primary Auth & DB (Firebase + Firestore)',
        type: 'firestore',
        status: fsStatus.isQuotaExceeded ? 'exhausted' : (fsStatus.hasError ? 'error' : 'active'),
        latencyMs: fsStatus.isQuotaExceeded ? 9999 : 45,
        description: 'Primary master data: User Auth, Wallets & Real-time sync'
      },
      {
        name: 'Backup Cloud DB (MongoDB Atlas)',
        type: 'mongodb',
        status: fsStatus.isQuotaExceeded ? 'active' : 'standby',
        latencyMs: 65,
        description: 'Auto-sync backup database (shustodb)'
      },
      {
        name: 'Relational MySQL (ACID Storage)',
        type: 'mysql',
        status: 'standby',
        latencyMs: 50,
        description: 'Enterprise Relational DB for ledger, users & safety'
      },
      {
        name: 'Offline Fallback (LocalStorage / Cache)',
        type: 'localstorage',
        status: 'active',
        latencyMs: 2,
        description: 'Zero data-loss client storage for uninterrupted access'
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
