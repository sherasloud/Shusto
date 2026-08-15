const https = require('https');
const fs = require('fs');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(dest);
      reject(err);
    });
  });
}

async function run() {
  await download('https://i.postimg.cc/CKTkYSRm/IMG-2918.jpg', 'public/icon-192.png');
  await download('https://i.postimg.cc/CKTkYSRm/IMG-2918.jpg', 'public/icon-512.png');
  console.log('done');
}
run();
