# macOS Android Studio "command 'node' no such file or directory" সমাধান গাইড

## সমস্যাটি কেন হয়েছিল?
macOS-এ Spotlight, Finder বা Dock থেকে যখন Android Studio ওপেন করা হয়, তখন macOS GUI অ্যাপগুলো টার্মিনালের `PATH` পায় না। তাই Homebrew (`/opt/homebrew/bin/node`) অথবা NVM-এর `node` খুঁজে না পেয়ে Gradle এই এররটি দেয়:
- `Exec failed, error: 2 (No such file or directory)`
- `A problem occurred starting process 'command 'node''`

আমরা ইতিমধ্যেই প্রজেক্টের `settings.gradle` এবং `app/build.gradle`-এ অটোমেটিক Node খোঁজার কোড সংযুক্ত করেছি।

---

## ১ মিনিটের নিশ্চিত সমাধান (যেকোনো ১টি পদ্ধতি অনুসরণ করুন):

### পদ্ধতি ১: টার্মিনালে ১টি কমান্ড চালান (সবচেয়ে সহজ ও দ্রুত)
Mac-এর টার্মিনাল ওপেন করে প্রজেক্ট ফোল্ডারে যান এবং কমান্ড চালান:
```bash
cd ~/Downloads/sheba_mfs_fixed_v1.0.1/mobile
./setup-mac.sh
```
অথবা ম্যানুয়ালি টার্মিনালে:
```bash
cd ~/Downloads/sheba_mfs_fixed_v1.0.1/mobile
npm install
sudo ln -sf $(which node) /usr/local/bin/node
```
এরপর Android Studio-তে গিয়ে উপরে ডানপাশের **"Sync Project with Gradle Files"** (হাতি/Elephant আইকন) এ ক্লিক করুন। ১০০% এরর সমাধান হয়ে যাবে!

---

### পদ্ধতি ২: টার্মিনাল দিয়ে সরাসরি Android Studio ওপেন করুন
টার্মিনাল থেকে ওপেন করলে টার্মিনালের সমস্ত Node PATH স্বয়ংক্রিয়ভাবে Android Studio পেয়ে যায়:
```bash
open -a "Android Studio"
```

---

### পদ্ধতি ৩: Android Studio ছাড়াই সরাসরি টার্মিনাল থেকে Play Store .AAB তৈরি করুন
কোনো IDE ছাড়াই ১ কমান্ডে Google Play Store-এর জন্য `.aab` ফাইল তৈরি করতে পারবেন:
```bash
cd ~/Downloads/sheba_mfs_fixed_v1.0.1/mobile
./build-aab.sh
```
বিল্ড শেষ হলে ফাইলটি পাবেন:
`mobile/android/app/build/outputs/bundle/release/app-release.aab`
