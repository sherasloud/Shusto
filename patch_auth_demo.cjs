const fs = require('fs');
let code = fs.readFileSync('src/AuthContext.tsx', 'utf8');

code = code.replace(/demoLogin: \(role\?: 'user' \| 'admin' \| 'doctor' \| 'pharmacy' \| 'manager' \| 'state'\) => void;\n/, '');
code = code.replace(/demoLogin, /g, '');
fs.writeFileSync('src/AuthContext.tsx', code);
console.log('Cleaned up demoLogin from AuthContext');
