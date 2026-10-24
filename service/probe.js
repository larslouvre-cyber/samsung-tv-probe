/*
 * probe.js — TizenBrew serviceFile.
 *
 * TV'et kan kun modtage filer via sdb (filesync_support:push), ikke
 * sende dem tilbage. Derfor POSTer vi rapporten til værten i stedet.
 *
 * Ændrer intet på TV'et. Læser kun.
 */

var os = require('os');
var http = require('http');

var HOST = '192.168.1.20';
var PORT = 8099;
var PATH = '/probe';

var lines = [];
function add(k, v) { lines.push(k + ': ' + v); }

add('=== TizenBrew serviceFile probe ===', '');
add('tid', new Date().toISOString());

var p = process;
add('node', p.version || '?');
add('pid', p.pid);
add('argv', JSON.stringify(p.argv));

try {
  add('platform', os.platform());
  add('arch', os.arch());
  add('release', os.release());
  add('hostname', os.hostname());
  add('userInfo', JSON.stringify(os.userInfo()));
} catch (e) { add('os-fejl', e.message); }

['fs', 'child_process', 'net', 'http', 'os', 'crypto'].forEach(function (m) {
  try { require(m); add('require(' + m + ')', 'OK'); }
  catch (e) { add('require(' + m + ')', 'FEJL ' + (e.code || e.message)); }
});

[
  ['/home/owner/share', 'skrivbar?'],
  ['/opt/usr/home/owner', ''],
  ['/home/owner/apps_rw', ''],
  ['/usr/share/org.tizen.tv.swu', ''],
  ['/dev/ntksys', '']
].forEach(function (pair) {
  var d = pair[0];
  var fs = require('fs');
  var st;
  try {
    st = fs.statSync(d);
  } catch (e) {
    add('sti ' + d, 'findes ikke');
    return;
  }
  var w = 'nej';
  try { fs.accessSync(d, fs.W_OK); w = 'skrivbar'; } catch (e) { w = 'ej skrivbar'; }
  add('sti ' + d, 'findes · ' + w + ' · mode ' + (st.mode || 0).toString(8));
});

try {
  var fs2 = require('fs');
  var f = '/usr/share/org.tizen.tv.swu/itemsAESPassphraseEncrypted.txt';
  add('SWU-passphrase', fs2.existsSync(f)
    ? ('findes · ' + fs2.statSync(f).size + ' bytes')
    : 'findes ikke');
} catch (e) { add('SWU-passphrase', 'fejl ' + e.message); }

try {
  var cp = require('child_process');
  add('child_process id', cp.execSync('id', { encoding: 'utf8', timeout: 3000 }).trim());
} catch (e) { add('child_process id', 'FEJL ' + (e.code || e.message)); }

var body = lines.join('\n');

function post() {
  var req = http.request({
    host: HOST, port: PORT, path: PATH, method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(body) }
  }, function (res) {
    res.resume();
  });
  req.on('error', function () { /* værten er måske ikke oppe */ });
  req.setTimeout(5000, function () { req.destroy(); });
  req.write(body);
  req.end();
}

post();
/* forsøg igen et par gange, hvis værten lige er startet */
setTimeout(post, 4000);
setTimeout(post, 12000);
