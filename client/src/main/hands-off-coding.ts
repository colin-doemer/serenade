import RendererBridge from "./bridge";
import ChunkManager from "./stream/chunk-manager";
import * as net from "net";
import * as fs from "fs";
import path from "path";
import os from "os";

export default class HandsOffCoding {
    private port: number = 12796;
    private logStream?: fs.WriteStream;
    private opacity: number = 1;

    socket: net.Socket | null = null;

    constructor(
        private bridge: RendererBridge,
        private chunkManager: ChunkManager,
        private mainWindow: any,
        private miniModeWindow: any
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
            if (command[0] === 'GETSTATE') {
                const data = {
                    requested: true,
                    listening: this.chunkManager.listening,
                    opacity: this.opacity
                };
                this.send("setState", data);
            } else if (command.length < 2) {
                this.log(`Command missing parameter: ${command[0]}`);
            } else {
                switch (command[0]) {
                    case 'LISTENING': {
                        const newState: boolean = command[1] === 'TRUE';
                        this.chunkManager.toggle(newState).then(() => {
                        });
                        break;
                    }
                    case 'OPACITY':
                        this.opacity = parseFloat(command[1]);
                        this.bridge.setState(
                            {
                                opacity: this.opacity,
                            },
                            [this.mainWindow, this.miniModeWindow]
                        );
                        this.mainWindow?.setIgnoreMouseEvents(this.opacity === 0);
                        this.miniModeWindow?.setIgnoreMouseEvents(this.opacity === 0);
                        break;
                    default: {
                        this.log(`Unknown command: ${command[0]}`);
                        break;
                    }
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
                    const json = JSON.stringify(data);
                    this.log(`Sending state: ${json}`);
                    this.socket.write(`SETSTATE:${json}\n`);
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