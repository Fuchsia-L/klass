const { execSync } = require('child_process');
const result = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf-8',
});
const match = result.match(/password=(.+)/);
if (match) console.log(match[1].trim());
else console.error('No password found in:', result);
