const fs = require('fs');
let code = fs.readFileSync('src/components/DoctorDashboard.tsx', 'utf8');

const search = `        <button 
          onClick={toggleOnlineStatus}
          disabled={togglingOnline}`;

const replace = `        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddSlotModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-md shadow-sky-500/20"
          >
            <Plus size={20} />
            নতুন স্লট তৈরি করুন
          </button>
          <button 
            onClick={toggleOnlineStatus}
            disabled={togglingOnline}`;

code = code.replace(search, replace);

const endSearch = `          {togglingOnline ? 'প্রসেসিং...' : (isOnline ? 'আপনি এখন Online আছেন' : 'আপনি এখন Offline আছেন')}
        </button>
      </div>`;
const endReplace = `          {togglingOnline ? 'প্রসেসিং...' : (isOnline ? 'আপনি এখন Online আছেন' : 'আপনি এখন Offline আছেন')}
        </button>
        </div>
      </div>`;

code = code.replace(endSearch, endReplace);

fs.writeFileSync('src/components/DoctorDashboard.tsx', code);
console.log("Patched doctor dashboard top button");
