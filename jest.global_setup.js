import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import path from "path";

import "./lib/error_to_json.js";
import { pack } from "./lib/packet.js";

// The process model is depicted as below:
//                jest.global_setup.js (parent-process P)
//                                            /\
// jest.env.js (cyclic test child-process L)-/  \- (long running child-process R) jest.global_setup.js:Server
//                                                                  ||
//                                                 (standalone web page process B) jest.app.js
//
// To remain simplicity, the way of communication between processes are:
//    P --> R: fork (at the very first running), SIGTERM (at exit)
//    R --> P: stdout/stderr, SIGCHLD
//    L --> R: HTTP Restful API
//    B <-> R: HTTP and WebSocket

export default function () {
  if (global.server_process) {
    return Promise.resolve();
  }

  const script = import.meta.url.slice(process.platform === "win32" ? 8 : 7);
  const port = process.env.TEST_PORT || 3000;
  return new Promise((resolve, reject) => {
    const server = spawn(process.argv[0], [script, "start", port], {
      cwd: path.dirname(script),
    });
    server.stdout.on("data", (data) => {
      if (global.server_process) {
        console.log(`SERVER: ${data}`);
      } else {
        // SERVER_URL will be inherited by jest.env.js
        process.env.SERVER_URL = `http://localhost:${port}`;
        process.on("exit", () => server.kill());
        global.server_process = server;
        resolve();
      }
    });
    server.stderr.on("data", (data) => console.log(`${data}`));
    server.on("error", reject);
    server.on("exit", (code) => {
      if (!global.server_address) {
        console.log(`Server exited: ${code}`);
      }
      reject(`Server exited: ${code}`);
    });
  });
}

class Server {
  masterClient;
  masterCallbacks = new Map();
  slavesResolves = new Map();
  slavesPendings = new Map(); // key: [data]

  constructor() {
    const app = express();
    app.use(express.text());

    app.get("/", (_req, res) => {
      res.redirect(301, "/jest.app.html");
    });

    app.get("/*.(js|css|html)", (req, res) => {
      res.sendFile(path.join(process.cwd(), req.path));
    });

    app.post("/use", (req, res) => {
      const { id, type } = req.query;
      if (!id || !type) {
        return res.status(500).json(new Error("Missing parameter id/type"));
      }

      this.setCallback(id, ({ result, error }) => {
        this.removeCallback(id);
        if (error) {
          res.status(500).json(error);
        } else {
          res.status(200).json(result);
        }
      });
      this.send(type, id, req.body).catch((error) => {
        this.removeCallback(id);
        res.status(500).json(error);
      });
    });

    app.delete("/use", (req, res) => {
      const id = req.query.id;
      if (id) {
        if (Array.isArray(id)) {
          id.forEach((id) => this.removeCallback(id));
        } else {
          this.removeCallback(id);
        }
      }
      res.sendStatus(200);
    });

    this.app = app;
  }

  setCallback(id, callback) {
    if (this.masterCallbacks.has(id)) {
      throw new Error(`Racing Request Use: ${id}`);
    }
    this.masterCallbacks.set(id, callback);
  }

  applyCallback(id, data) {
    const callback = this.masterCallbacks.get(id);
    if (!callback) {
      console.error("No callback for given key:", id);
    } else {
      callback(data);
    }
  }

  removeCallback(id) {
    this.masterCallbacks.delete(id);
  }

  get address() {
    const addr = this.hs.address();
    switch (typeof addr) {
      case "string":
        return addr;
      case "object":
        return `http://localhost:${addr.port}`;
    }
  }

  listen(port) {
    this.hs = this.app.listen(port, () => {
      // the parent process depends below stdout to determine if the server is runing or not
      console.log("Listening at", this.address);
    });

    return this;
  }

  _key(id, client) {
    return `${client.address} >>> ${id}`;
  }

  enableWs() {
    const wss = new WebSocketServer({ noServer: true, clientTracking: true });

    wss.on("connection", (client, req) => {
      const { remoteAddress, remotePort } = req.socket;
      client.address = `${remoteAddress}:${remotePort}`;

      client.on("close", () => {
        if (this.masterClient === client) {
          this.masterClient = null;
        }
      });

      client.on("message", (message) => {
        const { id, ...data } = JSON.parse(message.toString());

        const key = this._key(id, client);
        if (data.error) {
          console.error(key, data);
        }

        if (client === this.masterClient) {
          this.applyCallback(id, data);
        } else {
          this.slavesResolves.get(key)?.();
        }
      });
    });

    this.hs.on("upgrade", (request, client, head) => {
      wss.handleUpgrade(request, client, head, (client) => {
        wss.emit("connection", client, request);
      });
    });

    this.wss = wss;
    return this;
  }

  send(_type, id) {
    const data = pack(arguments);
    return new Promise((resolve, reject) => {
      try {
        if (this.wss.clients.size === 0) {
          reject(
            new Error(
              `No Client Connected: please open ${this.address} from browser`
            )
          );
        }
        this.wss.clients.forEach((client) => {
          if (!this.masterClient) {
            this.masterClient = client;
          }

          if (this.masterClient === client) {
            client.send(data, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          } else {
            const key = this._key(id, client);
            if (this.slavesResolves.has(key)) {
              const q = this.slavesPendings.get(key);
              if (!q) {
                this.slavesPendings.set(key, [data]);
              } else {
                q.push(data);
              }
            } else {
              this._send(data, key, client);
            }
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  _send(data, key, client) {
    const promise = new Promise((resolve) => {
      this.slavesResolves.set(key, resolve);
    });

    client.send(data, (error) => this._sent(key, client, promise, error));
  }

  async _sent(key, client, promise, error) {
    if (error) {
      console.error(`send error for client[${client.address}]:`, error);
    } else {
      await promise;
    }

    const data = this.slavesPendings.get(key)?.shift();
    if (!data) {
      this.slavesResolves.delete(key);
    } else {
      this._send(data, key, client);
    }
  }
}

function start(port) {
  new Server().listen(port).enableWs();
}

if (process.argv[process.argv.length - 2] === "start") {
  start(parseInt(process.argv[process.argv.length - 1]));
}
