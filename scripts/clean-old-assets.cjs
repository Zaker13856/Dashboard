const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const CFG = {
  host: 'ftp.isinnova.cloud',
  user: 'u829422351.isinnova.cloud',
  password: 'knc]:G/aj@iW^7dC',
  secure: false,
};
(async () => {
  const local = new Set(fs.readdirSync(path.resolve('dist/assets')));
  const client = new ftp.Client(60000);
  try {
    await client.access(CFG);
    const list = await client.list('/public_html/assets');
    for (const item of list) {
      if (!item.isDirectory && !local.has(item.name)) {
        await client.remove(`/public_html/assets/${item.name}`);
        console.log('removed:', item.name);
      }
    }
    console.log('Cleanup done.');
  } catch (e) { console.error('FAILED:', e.message); process.exit(1); }
  finally { client.close(); }
})();
