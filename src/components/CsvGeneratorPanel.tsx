import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  CheckCircle2, 
  Users, 
  Stethoscope, 
  Pill, 
  Building, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  FileText,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CsvGeneratorPanelProps {
  users?: any[];
  doctors?: any[];
  medicines?: any[];
  providers?: any[];
}

export function CsvGeneratorPanel({
  users = [],
  doctors = [],
  medicines = [],
  providers = []
}: CsvGeneratorPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'play_testers' | 'app_export' | 'custom_csv'>('play_testers');
  
  // 1. Play Console Testers State
  const [testerEmailsText, setTesterEmailsText] = useState<string>(
    'shustobd@gmail.com\ntester1@gmail.com\ntester2@gmail.com'
  );
  const [testerFilename, setTesterFilename] = useState<string>('google_play_testers.csv');
  const [includeTesterHeader, setIncludeTesterHeader] = useState<boolean>(false);
  const [copiedTester, setCopiedTester] = useState<boolean>(false);

  // 2. Custom CSV Builder State
  const [customFilename, setCustomFilename] = useState<string>('custom_data.csv');
  const [customColumns, setCustomColumns] = useState<string[]>(['Name', 'Email', 'Role', 'Phone']);
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [customRows, setCustomRows] = useState<string[][]>([
    ['Dr. Sabbir Ahmed', 'sabbir@shusto.org', 'Doctor', '01700000000'],
    ['Admin Support', 'shustobd@gmail.com', 'Admin', '01800000000']
  ]);
  const [copiedCustom, setCopiedCustom] = useState<boolean>(false);

  // Helper function to trigger browser download of .csv file
  const downloadCsv = (content: string, filename: string) => {
    // UTF-8 BOM for Bengali & Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to escape CSV cell values
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  // 1. Handlers for Play Console Tester CSV
  const parseTesterEmails = (): string[] => {
    const raw = testerEmailsText
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));
    // Remove duplicates
    return Array.from(new Set(raw));
  };

  const handleGenerateTesterCsv = () => {
    const list = parseTesterEmails();
    if (list.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি ভ্যালিড ইমেইল আইডি দিন!');
      return;
    }
    let csvString = '';
    if (includeTesterHeader) {
      csvString += 'Email\n';
    }
    csvString += list.join('\n');
    downloadCsv(csvString, testerFilename);
  };

  const handleCopyTesterCsv = () => {
    const list = parseTesterEmails();
    const csvString = (includeTesterHeader ? 'Email\n' : '') + list.join('\n');
    navigator.clipboard.writeText(csvString);
    setCopiedTester(true);
    setTimeout(() => setCopiedTester(false), 2000);
  };

  const handleLoadUsersIntoTesters = () => {
    const existingEmails = new Set(parseTesterEmails());
    users.forEach(u => {
      if (u.email && u.email.includes('@')) {
        existingEmails.add(u.email.toLowerCase().trim());
      }
    });
    setTesterEmailsText(Array.from(existingEmails).join('\n'));
  };

  // 2. Handlers for Exporting App Collections
  const handleExportUsers = () => {
    if (!users || users.length === 0) {
      alert('কোন ইউজার ডাটা পাওয়া যায়নি!');
      return;
    }
    const headers = ['UID', 'Name', 'Email', 'Role', 'Phone', 'Created At'];
    const rows = users.map(u => [
      escapeCsv(u.uid || ''),
      escapeCsv(u.displayName || 'No Name'),
      escapeCsv(u.email || ''),
      escapeCsv(u.role || 'user'),
      escapeCsv(u.phoneNumber || ''),
      escapeCsv(u.createdAt || '')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csvContent, `shusto_users_${Date.now()}.csv`);
  };

  const handleExportDoctors = () => {
    if (!doctors || doctors.length === 0) {
      alert('কোন ডাক্তার ডাটা পাওয়া যায়নি!');
      return;
    }
    const headers = ['ID', 'Name', 'Specialty', 'BMDC Number', 'Fee', 'Email', 'Experience', 'Degree', 'District'];
    const rows = doctors.map(d => [
      escapeCsv(d.id || ''),
      escapeCsv(d.name || ''),
      escapeCsv(d.specialty || ''),
      escapeCsv(d.bmdcNumber || ''),
      escapeCsv(d.fee || 0),
      escapeCsv(d.email || ''),
      escapeCsv(d.experience || ''),
      escapeCsv(d.degree || ''),
      escapeCsv(d.district || '')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csvContent, `shusto_doctors_${Date.now()}.csv`);
  };

  const handleExportMedicines = () => {
    if (!medicines || medicines.length === 0) {
      alert('কোন ঔষধের তালিকা পাওয়া যায়নি!');
      return;
    }
    const headers = ['ID', 'Name', 'Category', 'Generic', 'Company', 'Price'];
    const rows = medicines.map(m => [
      escapeCsv(m.id || ''),
      escapeCsv(m.name || ''),
      escapeCsv(m.category || ''),
      escapeCsv(m.generic || ''),
      escapeCsv(m.company || ''),
      escapeCsv(m.price || 0)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csvContent, `shusto_medicines_${Date.now()}.csv`);
  };

  // 3. Handlers for Custom CSV Builder
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const col = newColumnName.trim();
    if (customColumns.includes(col)) {
      alert('এই নামের কলাম ইতিমধ্যে আছে!');
      return;
    }
    setCustomColumns(prev => [...prev, col]);
    setCustomRows(prev => prev.map(row => [...row, '']));
    setNewColumnName('');
  };

  const handleRemoveColumn = (colIndex: number) => {
    if (customColumns.length <= 1) {
      alert('কমপক্ষে একটি কলাম থাকতে হবে!');
      return;
    }
    setCustomColumns(prev => prev.filter((_, idx) => idx !== colIndex));
    setCustomRows(prev => prev.map(row => row.filter((_, idx) => idx !== colIndex)));
  };

  const handleAddRow = () => {
    const emptyRow = customColumns.map(() => '');
    setCustomRows(prev => [...prev, emptyRow]);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setCustomRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = [...updated[rowIndex]];
      updated[rowIndex][colIndex] = value;
      return updated;
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    setCustomRows(prev => prev.filter((_, idx) => idx !== rowIndex));
  };

  const generateCustomCsvString = () => {
    const headerLine = customColumns.map(escapeCsv).join(',');
    const dataLines = customRows.map(row => row.map(escapeCsv).join(','));
    return [headerLine, ...dataLines].join('\n');
  };

  const handleDownloadCustomCsv = () => {
    const csvContent = generateCustomCsvString();
    downloadCsv(csvContent, customFilename);
  };

  const handleCopyCustomCsv = () => {
    const csvContent = generateCustomCsvString();
    navigator.clipboard.writeText(csvContent);
    setCopiedCustom(true);
    setTimeout(() => setCopiedCustom(false), 2000);
  };

  const parsedTesterList = parseTesterEmails();

  return (
    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center font-black text-2xl shadow-inner">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-slate-900">Shusto .CSV Generator & Exporter</h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                Admin Tool
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Google Play Console টেস্টার তালিকা বা যেকোনো ডাটা নিমেষেই <strong>.csv</strong> ফাইলে এক্সপোর্ট ও ডাউনলোড করুন।
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('play_testers')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSubTab === 'play_testers' 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>📱 Play Console Testers</span>
          </button>
          <button
            onClick={() => setActiveSubTab('app_export')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSubTab === 'app_export' 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>📦 App Data Export</span>
          </button>
          <button
            onClick={() => setActiveSubTab('custom_csv')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSubTab === 'custom_csv' 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>✍️ Custom CSV Maker</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GOOGLE PLAY CONSOLE TESTERS .CSV */}
      {activeSubTab === 'play_testers' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Google Play Console টেস্টারদের .CSV ফাইল তৈরি</h4>
              <p className="text-slate-600 text-sm mt-1">
                Google Play Console-এ Internal Testing বা Closed Testing-এ ইমেইল লিস্ট আপলোড করার জন্য এই .csv ফাইলটি ব্যবহার করুন। প্রতিটি লাইনে একটি করে Gmail আইডি বসিয়ে সরাসরি ডাউনলোড করুন।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  ইমেইল তালিকা (প্রতি লাইনে একটি বা কমা দিয়ে লিখুন)
                </label>
                <button
                  onClick={handleLoadUsersIntoTesters}
                  className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100"
                >
                  <Users size={14} /> ডাটাবেজ থেকে ইউজারদের ইমেইল যোগ করুন ({users.length})
                </button>
              </div>

              <textarea
                rows={10}
                value={testerEmailsText}
                onChange={(e) => setTesterEmailsText(e.target.value)}
                placeholder="example1@gmail.com&#10;example2@gmail.com&#10;shustobd@gmail.com"
                className="w-full p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
                    মোট ভ্যালিড ইমেইল: <span className="text-emerald-600">{parsedTesterList.length} টি</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 ml-2">
                    <input
                      type="checkbox"
                      checked={includeTesterHeader}
                      onChange={(e) => setIncludeTesterHeader(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Include "Email" header (ঐচ্ছিক)</span>
                  </label>
                </div>

                <button
                  onClick={() => setTesterEmailsText('shustobd@gmail.com')}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  ক্লিয়ার করুন
                </button>
              </div>
            </div>

            {/* Download and options card */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h5 className="font-bold text-slate-900 text-sm">ফাইল সেটিংস ও ডাউনলোড</h5>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">ফাইলের নাম</label>
                  <input
                    type="text"
                    value={testerFilename}
                    onChange={(e) => setTesterFilename(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Google Play Format</span>
                  <p className="text-xs text-slate-600 font-medium">
                    Play Console এ আপলোড উপযোগী স্ট্যান্ডার্ড UTF-8 Comma Delimited (.csv)।
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200/60">
                <button
                  onClick={handleGenerateTesterCsv}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Download size={18} />
                  <span>ডাউনলোড {testerFilename}</span>
                </button>

                <button
                  onClick={handleCopyTesterCsv}
                  className="w-full py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all text-sm"
                >
                  {copiedTester ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  <span>{copiedTester ? 'ক্লিপবোর্ডে কপি হয়েছে!' : 'CSV টেক্সট কপি করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPORT SHUSTO APP DATA */}
      {activeSubTab === 'app_export' && (
        <div className="space-y-6">
          <div className="p-5 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-start gap-4">
            <div className="p-2.5 bg-sky-500 text-white rounded-xl">
              <Building size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Shusto অ্যাপ ডেটাবেস .CSV এক্সপোর্ট</h4>
              <p className="text-slate-600 text-sm mt-1">
                আপনার ডেটাবেসের সকল ইউজার, রেজিস্টার্ড ডাক্তার, এবং ঔষধের তালিকা এক্সেল ও স্প্রেডশীটে ওপেন করার জন্য ১ ক্লিকে ডাউনলোড করুন।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-sky-200 transition-all flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-lg">সকল ইউজার ডেটা</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    ইউজার আইডি, নাম, ইমেইল, রোল, ফোন নম্বর ও রেজিস্ট্রেশন তারিখ।
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-full">
                  মোট {users.length} টি রেকর্ড
                </div>
              </div>

              <button
                onClick={handleExportUsers}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all text-sm"
              >
                <Download size={16} /> users.csv ডাউনলোড
              </button>
            </div>

            {/* Doctors Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-lg">ডাক্তারদের তালিকা</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    নাম, স্পেশালিটি, বিএমডিসি নম্বর, ফি, ইমেইল, ডিগ্রি ও জেলা।
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                  মোট {doctors.length} টি রেকর্ড
                </div>
              </div>

              <button
                onClick={handleExportDoctors}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm"
              >
                <Download size={16} /> doctors.csv ডাউনলোড
              </button>
            </div>

            {/* Medicines Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Pill size={24} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-lg">ঔষধ ক্যাটালগ</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    ঔষধের নাম, ক্যাটাগরি, জেনেরিক নেম, ফার্মাসিউটিক্যাল কোম্পানি ও মূল্য।
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                  মোট {medicines.length} টি রেকর্ড
                </div>
              </div>

              <button
                onClick={handleExportMedicines}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all text-sm"
              >
                <Download size={16} /> medicines.csv ডাউনলোড
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM CSV BUILDER */}
      {activeSubTab === 'custom_csv' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-base">ইন্টারেক্টিভ কাস্টম CSV টেবিল</h4>
              <p className="text-slate-500 text-xs mt-0.5">নতুন কলাম বা রো যোগ করুন এবং যেকোনো কাস্টম CSV ফাইল এক্সপোর্ট করুন।</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="filename.csv"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 w-44"
              />
              <button
                onClick={handleDownloadCustomCsv}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Download size={14} /> ডাউনলোড CSV
              </button>
              <button
                onClick={handleCopyCustomCsv}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                {copiedCustom ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedCustom ? 'কপি হয়েছে' : 'কপি'}</span>
              </button>
            </div>
          </div>

          {/* Add Column Bar */}
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="নতুন কলামের নাম (যেমন Address, Age)..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddColumn}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> কলাম যোগ
            </button>
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase w-12 text-center">#</th>
                  {customColumns.map((col, cIdx) => (
                    <th key={cIdx} className="px-4 py-2.5 text-xs font-bold text-slate-700 min-w-[140px]">
                      <div className="flex items-center justify-between gap-1">
                        <span>{col}</span>
                        {customColumns.length > 1 && (
                          <button
                            onClick={() => handleRemoveColumn(cIdx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                            title="কলাম ডিলিট"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs font-bold text-slate-400 text-center w-14">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center font-mono text-slate-400">{rIdx + 1}</td>
                    {customColumns.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5">
                        <input
                          type="text"
                          value={row[cIdx] || ''}
                          onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg text-slate-800 font-medium transition-all"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemoveRow(rIdx)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors"
                        title="রো ডিলিট"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleAddRow}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-all"
            >
              <Plus size={14} /> নতুন সারি (Row) যোগ করুন
            </button>
            <span className="text-xs text-slate-400">
              মোট কলাম: {customColumns.length} | মোট সারি: {customRows.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
