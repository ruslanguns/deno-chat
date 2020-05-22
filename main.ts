import { listenAndServe } from 'https://deno.land/std/http/server.ts';
import {
  acceptWebSocket,
  acceptable,
  WebSocket,
  isWebSocketCloseEvent,
} from 'https://deno.land/std/ws/mod.ts';
import { fromFileUrl } from 'https://deno.land/std/path/mod.ts';

const clients = new Map<number, WebSocket>();
let clientId = 0;

function dispatch(msg: string): void {
  for (const client of clients.values()) {
    if (client) {
      client.send(msg);
    }
  }
}

async function wsHandler(ws: WebSocket): Promise<void> {
  const id = ++clientId;
  clients.set(id, ws);
  dispatch(`Connected: ${id}`);
  
  for await (const msg of ws) {
    if (msg) {
      console.log(`mgs: ${id}`, msg);
      if (typeof msg === 'string') {
        dispatch(`[${id}]: ${msg}`);
      } else if ( isWebSocketCloseEvent(msg)) {
        clients.delete(id);
        dispatch(`Closed: [${ id }]`);
        break;
      }
    }
  }
}

listenAndServe({ port: 8080 }, async (req) => {
  if (req.method === 'GET' && req.url === '/') {
    const url = new URL('./index.html', import.meta.url);
    if ( url.protocol.startsWith('http')) {
      fetch(url.href).then(async (res) => {
        const body = new Uint8Array( await res.arrayBuffer());
        return req.respond({
          status: res.status,
          headers: new Headers({
            'content-type': 'text/html'
          }),
          body,
        });
      });
    } else {
      const file = await Deno.open(fromFileUrl(url));
      req.respond({
        status: 200,
        headers: new Headers({
          'content-type': 'text/html',
        }),
        body: file,
      });
    }
  }
  if (req.method === 'GET' && req.url === '/favicon.ico') {
    req.respond({
      status: 302,
      headers: new Headers({
        location: 'https://deno.land/favicon.ico',
      }),
    });
  }
  if (req.method === 'GET' && req.url === '/ws') {
    if (acceptable(req)) {
      acceptWebSocket({
        conn: req.conn,
        bufReader: req.r,
        bufWriter: req.w,
        headers: req.headers
      }).then(wsHandler);
    }
  }
});
console.log('Chat server starting on port: 8080');