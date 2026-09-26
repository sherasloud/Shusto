const https = require('https');
https.get('https://postimg.cc/mPjtyxNH', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/<meta property="og:image" content="(.*?)"/i);
    console.log(match ? match[1] : 'not found');
  });
});
