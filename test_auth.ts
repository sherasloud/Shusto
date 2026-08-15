import admin from "firebase-admin";
import fs from "fs";
import path from "path";

try {
  let firebaseConfig = null;
  if (fs.existsSync(path.resolve(process.cwd(), "firebase-applet-config.json"))) {
    const rawConfig = fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8");
    firebaseConfig = JSON.parse(rawConfig);
  }

  const initOptions: admin.AppOptions = {};
  if (firebaseConfig?.projectId) {
    initOptions.projectId = firebaseConfig.projectId;
  }
  
  if (!admin.apps.length) {
    admin.initializeApp(initOptions);
  }

  console.log("Testing Firebase Auth access...");
  admin.auth().listUsers(10)
    .then((result) => {
      console.log("Auth Success! Found users:", result.users.length);
      console.log("Emails:", result.users.map(u => u.email));
    })
    .catch((err) => {
      console.error("Auth failed:", err);
    });

} catch (err: any) {
  console.error("Initialization error:", err);
}
