import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const isWindows=process.platform==='win32';
const npm=isWindows?'npm.cmd':'npm';

function run(label,args,extraEnv={}){
  console.log(`\n=== VERIFY: ${label} ===`);
  return new Promise((resolve,reject)=>{
    const command=isWindows?(process.env.ComSpec||'cmd.exe'):npm;
    const commandArgs=isWindows?['/d','/s','/c',`npm ${args.join(' ')}`]:args;
    const child=spawn(command,commandArgs,{cwd:root,stdio:'inherit',env:{...process.env,...extraEnv}});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`${label} falhou com exit ${code}`)));
  });
}

try{
  await run('unit/integration',['run','test:unit']);
  await run('production build',['run','build']);
  await run('browser smoke',['run','test:browser']);
  await run('40-kite perf',['run','test:perf'],{PIPA_PERF_MS:process.env.PIPA_VERIFY_PERF_MS||'4000'});
  await run('runtime soak',['run','test:soak'],{PIPA_SOAK_MS:process.env.PIPA_VERIFY_SOAK_MS||'8000'});
  console.log('\nVERIFY GREEN');
}catch(error){
  console.error('\nVERIFY RED:',error.message);
  process.exitCode=1;
}
