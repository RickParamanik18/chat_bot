import { use, useRef, useState } from "react";
import "./chat.css";

export default function Chat() {
    const [messages, setMessages] = useState([
        "this is a test message",
        "this is a test message",
        "this is a test message",
        "this is a test message",
        "this is a test message",
        "this is a test message",
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const submitHandler = async (e) => {
        e.preventDefault();
        if (!input) return;
        setMessages((prevMessages) => [...prevMessages, input]);
        setInput("");
        inputRef.current.value = "";
        setLoading(true);
        try {
            console.log("Submitting message:", input);
            const response = await fetch("http://localhost:3000/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });
            const data = await response.json();
            console.log("Response from server:", data);
            if (data.success) {
                setMessages((prevMessages) => [...prevMessages, data.msg]);
            } else {
                messages[messages.length - 1] += "Error: " + data.msg + "\n";
            }
        } catch (error) {
            console.error("Error:", error);
        }
        setLoading(false);
    };
    const changeHandler = (e) => {
        setInput(e.target.value);
    };

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
                        {messages.map((msg, index) => (
                            <div key={index} className="message">
                                {msg}
                            </div>
                        ))}
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
