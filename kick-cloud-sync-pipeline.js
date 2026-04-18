const fs = require('fs');
const path = require('path');

// Two claude binaries exist; D:\npm-global\claude has broken postinstall
// ("native binary not installed"). The working one is in ~/.local/bin.
// Prepend it so child_process picks the right one.
process.env.PATH = 'C:\\Users\\Fuchs\\.local\\bin' + path.delimiter + process.env.PATH;

const { runPipeline } = require('D:/_AI/openclaw/workspace/scripts/dev-pipeline/pipeline.js');

const specPath = path.resolve(__dirname, 'docs/spec-cloud-sync.md');
const requirement = fs.readFileSync(specPath, 'utf-8');
const workdir = __dirname;

console.log(`[kick] spec: ${specPath} (${requirement.length} chars)`);
console.log(`[kick] workdir: ${workdir}`);
console.log(`[kick] starting pipeline...\n`);

runPipeline(requirement, workdir, { testCmd: 'npm test' }).then(r => {
  console.log('\n' + JSON.stringify({ ok: r.ok, error: r.error }, null, 2));
  process.exit(r.ok ? 0 : 1);
}).catch(err => {
  console.error('\n[kick] FATAL', err);
  process.exit(1);
});
