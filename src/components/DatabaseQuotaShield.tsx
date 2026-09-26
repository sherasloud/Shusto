import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, AlertTriangle, RefreshCw, Server, HardDrive, CheckCircle2 } from 'lucide-react';
import { dbFailoverManager, DatabaseNode } from '../utils/dbFailoverManager';
import { useFirestoreStatus } from '../utils/firestoreStatus';

export function DatabaseQuotaShield() {
  const [activeDb, setActiveDb] = useState<string>('firestore');
  const [nodes, setNodes] = useState<DatabaseNode[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const fsStatus = useFirestoreStatus();

  useEffect(() => {
    const unsubscribe = dbFailoverManager.subscribe((active, newNodes) => {
      setActiveDb(active);
      setNodes(newNodes);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Floating Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-lg border transition-all text-xs font-bold ${
          fsStatus.isQuotaExceeded 
            ? 'bg-amber-500 text-white border-amber-600 animate-pulse' 
            : 'bg-white/95 backdrop-blur text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
        title="Multi-Database Quota Shield & Failover Status"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${fsStatus.isQuotaExceeded ? 'bg-white animate-ping' : 'bg-emerald-500'}`} />
        <Database size={14} className={fsStatus.isQuotaExceeded ? 'text-white' : 'text-sky-600'} />
        <span>Multi-DB Quota Shield: {fsStatus.isQuotaExceeded ? 'Backup MongoDB Active' : 'Primary Firestore Active'}</span>
      </button>

      {/* Expanded Modal / Panel */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Multi-DB Quota Shield</h3>
                <p className="text-[10px] text-slate-500">Zero-downtime automatic failover system</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-800 leading-relaxed">
              আপনার ডেটা সুরক্ষিত রাখতে একাধিক ব্যাকআপ ডাটাবেস (Firestore + MongoDB + Local Cache) সংযুক্ত আছে। কোটা শেষ হলে সিস্টেম স্বয়ংক্রিয়ভাবে ব্যাকআপ ডাটাবেসে সুইচ করবে।
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Databases</span>
            {nodes.map((node, idx) => {
              const isCurrentActive = (activeDb === node.type) || (node.type === 'localstorage');
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isCurrentActive 
                      ? 'bg-emerald-50/60 border-emerald-200 shadow-sm' 
                      : 'bg-slate-50/60 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isCurrentActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {node.type === 'firestore' ? <Server size={16} /> : node.type === 'mongodb' || node.type === 'mysql' ? <Database size={16} /> : <HardDrive size={16} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{node.name}</h4>
                      <p className="text-[10px] text-slate-500">{node.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      node.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : node.status === 'exhausted' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {node.status}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5">{node.latencyMs}ms latency</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Failover status: <strong className="text-emerald-600">Active & Ready</strong></span>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold"
            >
              <RefreshCw size={12} /> Sync DB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
