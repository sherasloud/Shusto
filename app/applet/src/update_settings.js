const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const target = '{/* 6. Version & Legal */}';

if (content.includes('Account Deletion & Data')) {
  console.log('Account deletion already exists.');
} else if (content.includes(target)) {
  const deletionSection = `{/* 6. Account Deletion & Data Removal (Google Play & User Policy) */}
        <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট ও ডেটা অপসারণ' : 'Account Deletion & Data'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'স্থায়ীভাবে অ্যাকাউন্ট মুছে ফেলুন (৩১ দিনের রিস্টোর সময়)' : 'Permanently delete account (31 days restore window)'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'bn' 
              ? 'নিরাপত্তা ও পলিসি অনুযায়ী, আপনার অ্যাকাউন্টে ৯ টাকার বেশি ব্যালেন্স না থাকলে আপনি অ্যাকাউন্ট ডিলিট করতে পারবেন। ডিলিট করার পর ৩১ দিন পর্যন্ত রিস্টোর করার সুযোগ থাকবে।'
              : 'Per policy, you can delete your account if balance is between 0-9 BDT. 31 days restore window applies.'}
          </p>
          <button
            onClick={async () => {
              if (!user) return;
              try {
                let currentBalance = 0;
                try {
                  const cached = localStorage.getItem('cached_wallet_balance_' + user.uid);
                  if (cached !== null && !isNaN(Number(cached))) {
                    currentBalance = Number(cached);
                  }
                } catch(e) {}

                try {
                  const { doc, getDoc } = await import('firebase/firestore');
                  const { db } = await import('../firebase');
                  const wSnap = await getDoc(doc(db, 'wallets', user.uid));
                  if (wSnap.exists() && typeof wSnap.data().balance === 'number') {
                    currentBalance = wSnap.data().balance;
                  }
                } catch(e) {}

                if (currentBalance > 9) {
                  alert(lang === 'bn' 
                    ? 'অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স (' + currentBalance + ' টাকা) রয়েছে। অ্যাকাউন্ট ডিলিট করতে হলে ব্যালেন্স ০ থেকে ৯ টাকার মধ্যে থাকতে হবে। দয়া করে ব্যালেন্স উইথড্র বা শূন্য করুন।'
                    : 'Cannot delete account while balance is ' + currentBalance + ' BDT (must be 0-9 BDT).');
                  return;
                }

                const confirmed = window.confirm(lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টটি ডিলিটের জন্য শিডিউল করা হবে। আগামী ৩১ দিন পর্যন্ত আপনি লগইন করে অ্যাকাউন্ট রিস্টোর (পুনরুদ্ধার) করতে পারবেন। ৩১ দিন পর সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?'
                  : 'Your account will be scheduled for deletion with a 31-day restore window. Are you sure?');

                if (!confirmed) return;

                try {
                  const { doc, setDoc } = await import('firebase/firestore');
                  const { db } = await import('../firebase');
                  const now = new Date();
                  const restoreUntil = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
                  await setDoc(doc(db, 'users', user.uid), {
                    deletionRequestedAt: now.toISOString(),
                    restoreUntil: restoreUntil.toISOString(),
                    status: 'pending_deletion'
                  }, { merge: true });
                } catch(e) {
                  console.error("Deletion marking error:", e);
                }

                alert(lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টটি ডিলিটের জন্য সফলভাবে শিডিউল করা হয়েছে। ৩১ দিনের মধ্যে লগইন করলে এটি রিস্টোর করা যাবে।'
                  : 'Account scheduled for deletion successfully.');

                logout();
              } catch (err) {
                console.error("Delete account error:", err);
                alert('অ্যাকাউন্ট ডিলিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট করুন (৩১ দিন রিস্টোর টাইম)' : 'Delete Account (31 Days Restore)'}
          </button>
        </div>

        {/* 6. Version & Legal */}`;

  content = content.replace(target, deletionSection);
  fs.writeFileSync('src/components/Settings.tsx', content, 'utf8');
  console.log('Successfully added Account Deletion to Settings.tsx');
} else {
  console.log('Target not found in Settings.tsx');
}
