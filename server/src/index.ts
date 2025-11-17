import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req: Request, res: Response) => {
    res.json({ status: "ok", message: "Hello from Express + TypeScript" });
});

app.post("/query", async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    const clientMsg = req.body.message;

    if (!clientMsg) {
        res.write(
            `event: error\ndata: ${JSON.stringify({
                error: "Message is required",
            })}\n\n`
        );
        return res.end();
    }
    const initMsg = new HumanMessage({ content: clientMsg });
    try {
        const stream = await agent.stream(
            { messages: [initMsg] },
            { streamMode: "messages", configurable: { thread_id: "1" } }
        );

        for await (const chunk of stream) {
            const [msg, metadata] = chunk;
            if (!metadata.name) continue;
            if (msg.content) {
                console.log("Chunk\n", msg.content);
                res.write(
                    `data: ${JSON.stringify({ message: msg.content })}\n\n`
                );
            }
        }
        res.end();
    } catch (error) {
        res.write(
            `event: error\ndata: ${JSON.stringify({
                error: "LLM error occurred",
            })}\n\n`
        );
        res.end();
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
    END,
    START,
    StateGraph,
    MemorySaver,
    Annotation,
} from "@langchain/langgraph";
const checkPointer = new MemorySaver();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2,
    streaming: true,
});

const ChatState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

const chatNode = async (state: any) => {
    const messages = state.messages;
    const response = await llm.invoke(messages);
    return {
        messages: [new AIMessage({ content: response.content })],
    };
};
const agent = new StateGraph(ChatState)
    .addNode("chatNode", chatNode)
    .addEdge(START, "chatNode")
    .addEdge("chatNode", END)
    .compile({ checkpointer: checkPointer });

const initMsg = new HumanMessage({ content: "Hello, how are you?" });
