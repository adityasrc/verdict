import http from "http";
import { initializeSocketIO } from "./ws/index.js";

const port = process.env.WS_PORT || 9000;

const httpServer = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
    }
});

initializeSocketIO(httpServer);

console.log(`Starting Verdict WebSocket server on port ${port}`);

httpServer.listen(port, () => {
    console.log(`Verdict WebSocket server listening at port ${port}`);
});

const exitHandler = () => {
    httpServer.close(() => {
        console.log("Verdict WebSocket server closed");
        process.exit(0);
    });

    setTimeout(() => {
        console.log("Forced exit");
        process.exit(1);
    }, 5000);
};

process.on("SIGTERM", exitHandler);
process.on("SIGINT", exitHandler);