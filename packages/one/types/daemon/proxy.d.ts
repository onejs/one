import * as http from 'node:http';
import * as net from 'node:net';
import type { ServerRegistration } from './types';
export declare function proxyHttpRequest(req: http.IncomingMessage, res: http.ServerResponse, target: ServerRegistration): void;
export declare function proxyWebSocket(req: http.IncomingMessage, socket: net.Socket, head: Buffer, target: ServerRegistration): void;
//# sourceMappingURL=proxy.d.ts.map