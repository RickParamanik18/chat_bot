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
    const thread_id = req.body.thread_id;

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
            { streamMode: "messages", configurable: { thread_id } }
        );

        for await (const chunk of stream) {
            const [msg, metadata] = chunk;
            // if (!metadata.name) continue;
            // console.log("CHUNK:");
            // console.log(chunk);
            if (
                msg.content &&
                msg instanceof AIMessage &&
                msg.tool_calls instanceof Array &&
                !msg.tool_calls.length
            ) {
                console.log(msg.content);
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
import { tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";
const checkPointer = new MemorySaver();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2,
    streaming: true,
});

//Tools
const tavilySearchTool = new TavilySearch({
    maxResults: 5,
    verbose: true,
});

// app.get("/test", async (req, res) => {
//     const results = await tavilySearchTool.invoke({
//         query: "current weather in india",
//     });
//     console.log("Tavily Search", results);
//     res.send({ results });
// });

const add = tool(({ a, b }) => a + b, {
    name: "add",
    description: "Add two numbers",
    schema: z.object({
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
    }),
});

const toolsByName = {
    [tavilySearchTool.name]: tavilySearchTool,
};

const tools = Object.values(toolsByName);
const llm_with_tools = llm.bindTools(tools);

//State
const ChatState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

//Nodes
const chatNode = async (state: any) => {
    const messages = state.messages;
    const response = await llm_with_tools.invoke(messages);

    return {
        messages: [
            new AIMessage({
                content: response.content,
                tool_calls: response.tool_calls,
            }),
        ],
    };
};

async function toolNode(state: any) {
    const lastMessage = state.messages.at(-1);

    if (lastMessage == null || !(lastMessage instanceof AIMessage)) {
        return { messages: [] };
    }

    const result: ToolMessage[] = [];
    for (const toolCall of lastMessage.tool_calls ?? []) {
        const tool = toolsByName[toolCall.name];
        const observation = await (tool as any).invoke(toolCall);
        result.push(observation);
    }

    return { messages: result };
}

async function shouldContinue(state: any) {
    const lastMessage = state.messages.at(-1);
    if (lastMessage == null || !(lastMessage instanceof AIMessage)) return END;
    if (lastMessage.tool_calls?.length) {
        return "toolNode";
    }
    return END;
}

//Graph
const agent = new StateGraph(ChatState)
    .addNode("chatNode", chatNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "chatNode")
    .addConditionalEdges("chatNode", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "chatNode")
    .compile({ checkpointer: checkPointer });

const initMsg = new HumanMessage({ content: "Hello, how are you?" });
