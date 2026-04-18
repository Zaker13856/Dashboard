const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const CFG = {
  host: 'ftp.isinnova.cloud',
  user: 'u829422351.isinnova.cloud',
  password: 'knc]:G/aj@iW^7dC',
  secure: false,
};
const REMOTE_ROOT = '/public_html';
const LOCAL_DIST = path.resolve(__dirname, '..', 'dist');

async function cleanHiddenTemps(client, remoteDir) {
  try {
    const list = await client.list(remoteDir);
    for (const item of list) {
      if (item.name.startsWith('.in.')) {
        try { await client.remove(`${remoteDir}/${item.name}`); console.log(`  cleaned temp: ${item.name}`); } catch {}
      } else if (item.isDirectory) {
        await cleanHiddenTemps(client, `${remoteDir}/${item.name}`);
      }
    }
  } catch {}
}

async function uploadFileWithRetry(client, local, remote, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      try { await client.remove(remote); } catch {}
      await client.uploadFrom(local, remote);
      return;
    } catch (err) {
      console.log(`  retry ${i}/${tries} ${path.basename(remote)}: ${err.message}`);
      if (i === tries) throw err;
      await new Promise(r => setTimeout(r, 1500 * i));
      try { await client.close(); } catch {}
      await client.access(CFG);
    }
  }
}

async function uploadDir(client, localDir, remoteDir) {
  await client.ensureDir(remoteDir);
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const e of entries) {
    const local = path.join(localDir, e.name);
    const remote = `${remoteDir}/${e.name}`;
    if (e.isDirectory()) {
      await uploadDir(client, local, remote);
    } else {
      const size = (fs.statSync(local).size / 1024).toFixed(0);
      console.log(`→ ${remote} (${size}KB)`);
      await uploadFileWithRetry(client, local, remote);
    }
  }
}

(async () => {
  const client = new ftp.Client(60000);
  client.ftp.verbose = false;
  try {
    await client.access(CFG);
    console.log('Connected.');
    console.log('Cleaning hidden temp files...');
    await cleanHiddenTemps(client, REMOTE_ROOT);
    console.log(`Uploading ${LOCAL_DIST} -> ${REMOTE_ROOT}`);
    await uploadDir(client, LOCAL_DIST, REMOTE_ROOT);
    console.log('Done.');
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  } finally {
    client.close();
  }
})();
