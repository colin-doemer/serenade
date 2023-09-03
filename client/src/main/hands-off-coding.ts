import RendererBridge from "./bridge";
import ChunkManager from "./stream/chunk-manager";
import * as net from "net";
import * as fs from "fs";
import path from "path";
import os from "os";

export default class HandsOffCoding {
    private port: number = 12796;
    private logStream?: fs.WriteStream;

    socket: net.Socket | null = null;

    constructor(
        bridge: RendererBridge,
        private chunkManager: ChunkManager
    ) {
        this.init();
        bridge.link(this);
    }

    private init() {
        const server = net.createServer((socket) => {
            this.socket = socket;
            socket.on('data', (data: Buffer) => {
                this.log(`Data received: ${data.toString().trim()}`);
                const command: string[] = data.toString().trim().split(':', 2);
                this.execute(command);
            });
        });

        server.listen(this.port, () => {
            this.log(`Server listening on port ${this.port}`);
        });
    }

    private execute(command: string[]) {
        if (this.socket) {
            switch (command[0]) {
                case 'LISTENING': {
                    if (command.length < 2) {
                        this.socket.write(`LISTENING:${this.chunkManager.listening ? 'TRUE' : 'FALSE'}\n`);
                    } else {
                        const newState: boolean = command[1] === 'TRUE';
                        this.chunkManager.toggle(newState).then(() => {
                        });
                    }
                    break;
                }
                default: {
                    this.log(`Unknown command: ${command[0]}`);
                    break;
                }
            }
        }
    }

    send(message: string, data: any) {
        try {
            if (this.socket) {
                if (message === "setState") {
                    if (data.volume) {
                        return;
                    }
                    this.log(`Sending state: ${JSON.stringify(data)}`);
                    this.socket.write(`SETSTATE:${JSON.stringify(data)}\n`);
                }
            }
        } catch (e) {
            this.log(`Error sending message: ${e}`);
        }
    }

    log(message: string) {
        if (!this.logStream) {
            this.logStream = fs.createWriteStream(path.join(os.homedir(), ".serenade", "hands-off-coding.log"));
        }

        const data = `${Date.now()} ${message}`;
        console.log(data);
        this.logStream.write(`${data}\n`);
    }
}