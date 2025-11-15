import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
const app = express();
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.json({ status: "ok", message: "Hello from Express + TypeScript" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { END, START, StateGraph } from "@langchain/langgraph";
const register = z.registry();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2,
});

const ChatState = z.object({
    messages: z.array(z.custom<BaseMessage>()).register(register, {
        reducer: (oldMessages: BaseMessage[], newMessages: BaseMessage[]) => {
            return [...oldMessages, ...newMessages];
        },
    }),
});

const chatNode = async (state: z.infer<typeof ChatState>) => {
    const messages = state.messages;
    const response = await llm.invoke(messages);
    return {
        messages: [...messages, new AIMessage({ content: response.content })],
    };
};
const agent = new StateGraph(ChatState)
    .addNode("chatNode", chatNode)
    .addEdge(START, "chatNode")
    .addEdge("chatNode", END)
    .compile();

const initMsg = new HumanMessage({ content: "Hello, how are you?" });

// agent
//     .invoke({ messages: [initMsg] })
//     .then((result) => {
//         console.log("Final messages:", result.messages);
//     })
//     .catch((error) => {
//         console.error("Error during agent invocation:", error);
//     });
