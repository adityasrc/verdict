import "dotenv/config";
import http from "http";
import app from "./api/app.js";
import { initSocket } from "./ws/socket.js";
import "./workers/submissionWorker.js";

const PORT = process.env.PORT || process.env.HTTP_PORT || 4000;
const httpServer = http.createServer(app);

initSocket(httpServer);

httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
