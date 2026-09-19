import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";
import dotenv from "dotenv";

dotenv.config();

const SANDBOX_ID = "YOUR_SANDBOX_ID";

const AGENT_URL =
    `http://sandbox-service-${SANDBOX_ID}:3000`;

export const listFiles = tool(
    async () => {
        console.log("=================================");
        console.log("using list files tool");
        console.log("=================================");

        const response = await axios.get(
            `${AGENT_URL}/list-files`
        );

        console.log("=================================");
        console.log("response from list files tool", response.data);
        console.log("=================================");

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory.",
        schema: z.object({}),
    }
);

export const readFiles = tool(
    async ({ files }) => {
        console.log("=================================");
        console.log("using read files tool with files", files);
        console.log("=================================");

        const response = await axios.get(
            `${AGENT_URL}/read-files`,
            {
                params: {
                    files: files.join(","),
                },
            }
        );

        console.log("=================================");
        console.log("response from read files tool", response.data);
        console.log("=================================");

        return JSON.stringify(response.data);
    },
    {
        name: "read_files",
        description: "Read the contents of specified files.",
        schema: z.object({
            files: z.array(z.string()),
        }),
    }
);

export const updateFiles = tool(
    async ({ files }) => {
        console.log("=================================");
        console.log("using update files tool with files", files);
        console.log("=================================");

        try {
            const response = await axios.patch(
                `${AGENT_URL}/update-files`,
                {
                    updates: files,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );

            console.log("=================================");
            console.log("STATUS:", response.status);
            console.log("RESPONSE:", response.data);
            console.log("=================================");

            return JSON.stringify(response.data.results);

        } catch (error) {
            console.log("=================================");
            console.log("UPDATE ERROR");
            console.log("MESSAGE:", error.message);
            console.log("STATUS:", error.response?.status);
            console.log("DATA:", error.response?.data);
            console.log("=================================");

            throw error;
        }
    },
    {
        name: "update_files",
        description:
            "Update the contents of specified files or create new files.",
        schema: z.object({
            files: z.array(
                z.object({
                    file: z.string(),
                    content: z.string(),
                })
            ),
        }),
    }
);