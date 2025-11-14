import express from "express";
// "dev": "nodemon --watch src --ext ts,json --exec \"node --loader ts-node/esm\" src/index.ts",
const app = express();
app.use(express.json());
app.get("/", (req, res) => {
    console.log("hello..");
    res.json({ status: "ok", message: "Hello from Express + TypeScript" });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
console.log("Server started");
