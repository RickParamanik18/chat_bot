import { use, useRef, useState } from "react";
import "./chat.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const submitHandler = async (e) => {
        e.preventDefault();
        if (!input) return;

        const userInput = input;

        // Add user message
        setMessages((prev) => [...prev, userInput]);

        setMessages((prev) => [...prev, "Waiting For The Response..."]);

        setInput("");
        inputRef.current.value = "";
        setLoading(true);

        let aiResponse = "";
        let streamStarted = false;

        try {
            const response = await fetch("http://localhost:3000/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userInput }),
            });

            if (!response.body) {
                throw Error("Stream body is empty");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    streamStarted = false;
                    break;
                }

                const chunk = decoder.decode(value);
                if (!streamStarted && chunk) {
                    aiResponse = "";
                    streamStarted = true;
                }
                const lines = chunk.split("\n");

                for (let line of lines) {
                    if (line.startsWith("data:")) {
                        const jsonStr = line.replace("data:", "").trim();

                        try {
                            const parsed = JSON.parse(jsonStr);

                            if (parsed.message) {
                                aiResponse += parsed.message;

                                setMessages((prev) => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = aiResponse;
                                    return updated;
                                });
                            }
                        } catch (err) {
                            console.log("JSON parse error");
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }

        setLoading(false);
    };

    const changeHandler = (e) => {
        setInput(e.target.value);
    };

    // console.log(messages.length);

    return (
        <>
            <div className="chat_container">
                <div className="history">
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                    <a href="">hello user</a>
                </div>
                <div className="interactive_chat">
                    <div className="header">
                        <h2>TestGPT</h2>
                        <div>UN</div>
                    </div>
                    <div className="chats">
                        {messages.length ? (
                            messages.map((msg, index) => (
                                <div key={index} className="message">
                                    <div style={{ whiteSpace: "pre-wrap" }}>
                                        <Markdown>{msg}</Markdown>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="welcome_msg">
                                Hey Whats in Your Mind Today!!
                            </div>
                        )}
                    </div>
                    <div className="input_area">
                        <form onSubmit={submitHandler}>
                            <input
                                type="text"
                                placeholder="Enter Your Text Here.."
                                onChange={changeHandler}
                                ref={inputRef}
                            />
                            <button type="submit" disabled={loading}>
                                {loading ? "Wait..." : "Send"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
