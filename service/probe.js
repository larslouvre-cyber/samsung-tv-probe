/*
 * probe.js — TizenBrew serviceFile.
 *
 * Kører som Node.js på TV'et, hvis TizenBrew understøtter serviceFile
 * på Tizen 3.0. Skriver udelukkende en rapport til et kendt sti i
 * det skrivbare sdk_tools-område. Ændrer intet i systemet.
 *
 * Aflæs med:  sdb pull /home/owner/share/tmp/sdk_tools/probe.txt
 */

var fs = require('fs');
var os = require('os');

var OUT = '/home/owner/share/tmp/sdk_tools/probe.txt';
var lines = [];

function add(k, v) {
  lines.push(k + ': ' + v);
}

add('=== TizenBrew serviceFile probe ===', '');
add('tid', new Date().toISOString());

try {
  var p = process;
  add('node', (p.version || '?'));
  add('pid', p.pid);
  add('argv', JSON.stringify(p.argv));
  add('cwd', (p.cwd ? p.cwd() : '?'));
} catch (e) {
  add('process-fejl', e.message);
}

try {
  add('os.platform', os.platform());
  add('os.arch', os.arch());
  add('os.release', os.release());
  add('os.hostname', os.hostname());
  add('os.userInfo', JSON.stringify(os.userInfo()));
} catch (e) {
  add('os-fejl', e.message);
}

/* Hvilke moduler er tilgængelige? */
['fs', 'child_process', 'net', 'http', 'os', 'crypto'].forEach(function (m) {
  try {
    require(m);
    add('require(' + m + ')', 'OK');
  } catch (e) {
    add('require(' + m + ')', 'FEJL ' + e.code);
  }
});

/* Kan vi skrive? Og hvor? */
[
  '/home/owner/share/tmp/sdk_tools',
  '/opt/usr/home/owner',
  '/home/owner/apps_rw',
  '/tmp',
  '/usr/share/org.tizen.tv.swu'
].forEach(function (d) {
  var ok = 'nej';
  try {
    fs.accessSync(d, fs.W_OK);
    ok = 'skrivbar';
  } catch (e) {
    try {
      fs.accessSync(d, fs.R_OK);
      ok = 'kun læsbar';
    } catch (e2) {
      ok = 'utilgængelig';
    }
  }
  add('sti ' + d, ok);
});

/* Ligger SWU-passphrase-filen der? (vi forsøger ikke at dekryptere) */
try {
  var f = '/usr/share/org.tizen.tv.swu/itemsAESPassphraseEncrypted.txt';
  add('SWU-passphrase', fs.existsSync(f) ? ('findes, ' + fs.statSync(f).size + ' bytes') : 'findes ikke');
} catch (e) {
  add('SWU-passphrase', 'fejl ' + e.message);
}

/* Kan vi køre et eksternt program? */
try {
  var cp = require('child_process');
  var out = cp.execSync('id', { encoding: 'utf8', timeout: 3000 });
  add('child_process id', out.trim());
} catch (e) {
  add('child_process id', 'FEJL ' + (e.code || e.message));
}

try {
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
} catch (e) {
  /* sidste udvej: prøv hjemmemappen */
  try {
    fs.writeFileSync(os.homedir() + '/probe.txt', lines.join('\n') + '\n');
  } catch (e2) { /* opgiv */ }
}
