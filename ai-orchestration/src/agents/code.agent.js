import "dotenv/config";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { ChatOpenRouter } from "@langchain/openrouter";

import { listFiles, readFiles, updateFiles } from "./tool.js";

import { createAgent } from "langchain";


const model = new ChatOpenRouter({
    model: "nex-agi/nex-n2.5-mini:free",
    apiKey:process.env.OPENAI_API_KEY,
    temperature: 0.7,
});


const agent = createAgent({
    model,
    tools: [listFiles, readFiles, updateFiles],
});


await agent.invoke({
  messages: [
    {
role: "user",
content: `Update only /src/App.jsx. Change the heading "Hello Ajay" to "Hello Annu". Do not read files. Do not modify any other file. Use update_files exactly once, then stop.`,
    },
  ],
});