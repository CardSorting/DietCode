import { execSync } from 'node:child_process';
try {
    const out = execSync('./node_modules/.bin/esbuild --version', { env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:' + process.env.PATH } });
    console.log('Output:', out.toString());
} catch (e) {
    console.error('Error:', e);
}
