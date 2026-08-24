const fs = require('fs');
let code = fs.readFileSync('src/components/DoctorDashboard.tsx', 'utf8');

// 1. Add import
code = code.replace("import { Wallet } from './Wallet';", "import { Wallet } from './Wallet';\nimport { AppointmentSlotManager } from './AppointmentSlotManager';");

// 2. Remove old state variables
code = code.replace(/const \[newSlotDate, setNewSlotDate\] = useState\(\(\) => new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);\n/g, "");
code = code.replace(/const \[newSlotTime, setNewSlotTime\] = useState\([^)]*\);\n/g, "");
code = code.replace(/const \[customSlotTime, setCustomSlotTime\] = useState\([^)]*\);\n/g, "");
code = code.replace(/const \[maxPatientsInput, setMaxPatientsInput\] = useState\([^)]*\);\n/g, "");
code = code.replace(/const \[addingSlot, setAddingSlot\] = useState\(false\);\n/g, "");

// 3. Remove handleAddSlot completely
// We can use regex to remove handleAddSlot
const handleAddSlotRegex = /const handleAddSlot = async \(e: React\.FormEvent\) => \{[\s\S]*?\} finally \{\s*setAddingSlot\(false\);\s*\}\s*\};/;
code = code.replace(handleAddSlotRegex, "");

// 4. Replace the old modal HTML with the new component
// The old modal starts with `{showAddSlotModal && (` and ends just before `</div>\n    </div>\n  );\n}`
const oldModalRegex = /\{\/\* Create Slot Modal \*\/\}[\s\S]*?\{showAddSlotModal && \([\s\S]*?<\/form>\s*<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(oldModalRegex, "{/* Create Slot Modal */}\n      {showAddSlotModal && <AppointmentSlotManager onClose={() => setShowAddSlotModal(false)} />}");

fs.writeFileSync('src/components/DoctorDashboard.tsx', code);
console.log("Patched DoctorDashboard.tsx");
