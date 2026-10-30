// Isolated browser-test backend. Never loaded by the application or deployment.
const http = require('node:http');
const { spawn } = require('node:child_process');
const port = 54449;
const user = { id: '00000000-0000-4000-8000-000000000099', aud: 'authenticated', role: 'authenticated', email: 'sheet-test@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000) })}.local-test-signature`;
const session = { access_token: token, refresh_token: 'local-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user };
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3119');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, x-supabase-api-version');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if(url.pathname==='/__test/session'){
    res.end(JSON.stringify({name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')}));return;
  }
  if(url.pathname==='/auth/v1/user'){
    if(!req.headers.authorization?.includes(token)){res.writeHead(401);res.end(JSON.stringify({message:'No test session'}));return;}
    res.end(JSON.stringify(user));return;
  }
  if(url.pathname==='/auth/v1/token'){res.end(JSON.stringify(session));return;}
  if(url.pathname==='/rest/v1/profiles'){
    const profile={id:user.id,role:'gm',first_name:'Bardo',last_name:'Test',nickname:'Bardo Test',avatar_url:null};
    res.end(JSON.stringify(String(req.headers.accept).includes('object')?profile:[profile]));return;
  }
  if(url.pathname==='/auth/v1/logout'){res.end('{}');return;}
  res.end('[]');
});
server.listen(port,'127.0.0.1',()=>{
  const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3119'],{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${port}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:token,SUPABASE_SERVICE_ROLE_KEY:'unused-local-test-key'}});
  const stop=()=>{next.kill('SIGTERM');server.close();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  next.on('exit',code=>{server.close();process.exitCode=code??0;});
});
