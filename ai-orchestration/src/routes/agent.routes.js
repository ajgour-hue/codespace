import { Router } from "express";
import agent from "../agents/code.agent.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
    try {
        const { message, projectId } = req.body;

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });

        const response = await agent.stream(
            {
                messages: [
                    {
                        role: "user",
                        content: message,
                    },
                ],
            },
            {
                context: {
                    projectId,
                },
                streamMode: "custom",
            }
        );

        for await (const chunk of response) {
            console.log(chunk);
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.end();

    } catch (error) {
        console.error("Error invoking agent:", error);

        if (!res.headersSent) {
            res.status(500).json({
                error: "Failed to invoke agent",
            });
        } else {
            res.end();
        }
    }
});


export default agentRouter;