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
    const clientMsg = req.body.message;

    if (!clientMsg) {
        return res
            .status(400)
            .json({ success: false, msg: "Message is required" });
    }
    const initMsg = new HumanMessage({ content: clientMsg });
    agent
        .invoke({ messages: [initMsg] }, { configurable: { thread_id: "1" } })
        .then((result) => {
            console.log("Final messages:", result.messages);
            const aiResponseString =
                result.messages[result.messages.length - 1].content;
            // checkPointer
            //     .get({ configurable: { thread_id: "1" } })
            //     .then((state) => {
            //         console.log("Saved state:", state);
            //     });

            return res
                .status(200)
                .json({ success: true, msg: aiResponseString });
        })
        .catch((error) => {
            console.error("Error during agent invocation:", error);
            return res.status(500).json({ success: false, msg: "LLM err" });
        });
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
