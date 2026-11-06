import {createServer} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import conversation from './conversation.cjs';
import {renderEdit} from './conversation.mjs';

const hosts = ['claude-code', 'deepseek'];

// One waiting terminal operation owns one view and receives one validated response.
export async function serveSession(session, {host, language = 'en', timeoutMs = 900000, port = 0} = {}) {
  conversation.checkSession(session);
  if (!hosts.includes(host) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000) throw new Error('Invalid preview options.');
  const snapshot = structuredClone(session);
  const token = randomBytes(32).toString('hex');
  const entry = '/' + randomBytes(24).toString('hex') + '/';
  const style = await readFile(new URL('../assets/preview.css', import.meta.url), 'utf8');
  let page, origin, resolve, reject, accepted = false, timer;
  const response = new Promise((yes, no) => { resolve = yes; reject = no; });
  response.catch(() => {});
  const server = createServer(async (request, reply) => {
    const finish = (code, body, type = 'application/json') => {
      reply.writeHead(code, {'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Connection': 'close',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'"});
      reply.end(body);
    };
    if (request.headers.host !== new URL(origin).host) return finish(403, '{"error":"Wrong host."}');
    if (request.method === 'GET' && request.url === entry) return finish(200, page, 'text/html');
    if (request.url !== '/response' || request.method !== 'POST') return finish(404, '{"error":"Not found."}');
    const supplied = request.headers['x-show-me-token'];
    if (request.headers.origin !== origin || request.headers['content-type'] !== 'application/json' || typeof supplied !== 'string' || !/^[0-9a-f]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return finish(403, '{"error":"Use this task’s preview."}');
    if (accepted) return finish(409, '{"error":"This task already received a response."}');
    const chunks = []; let bytes = 0;
    try {
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > conversation.MAX_BYTES) { finish(413, '{"error":"Response too large."}'); return; }
        chunks.push(chunk);
      }
      const packet = conversation.validate(snapshot, JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (accepted) return finish(409, '{"error":"This task already received a response."}');
      accepted = true;
      clearTimeout(timer);
      finish(200, JSON.stringify({status:'received', submission:packet.submission}));
      server.close();
      resolve(packet);
    } catch (_) { finish(400, '{"error":"The response does not match this task."}'); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', yes); });
  origin = 'http://127.0.0.1:' + server.address().port;
  try {
    const fragment = await renderEdit(snapshot, {host, language, local:{origin,token}});
    page = '<!doctype html><html lang="' + language + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Show me</title><style>' + style + '</style></head><body><main>' + fragment + '</main></body></html>';
  } catch (error) { server.close(); throw error; }
  function close() {
    if (accepted) return;
    accepted = true;
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
    reject(new Error('The preview closed without a submitted response.'));
  }
  timer = setTimeout(close, timeoutMs);
  return {url:origin + entry, response, close};
}
