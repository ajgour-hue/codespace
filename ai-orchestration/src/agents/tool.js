import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";
import dotenv from "dotenv";
import { write } from 'fs';

dotenv.config();

 const SANDBOX_ID = "sandbox-1";

const AGENT_URL =
    `http://sandbox-service-${SANDBOX_ID}:3000`;


export const listFiles = tool(

    async ({ }, config) => {
        writer("Listing files in project directory...\n");

        const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/list-files`)

        writer("Files listed successfully." + "Files: " + response.data.files.join(",") + "\n");


        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory.",
        schema: z.object({}),
    }
);

export const readFiles = tool(
  async ({ files = [] }, config) => {

       const writer = config.writer;

         const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/read-files?files=` + files.join(","))


      writer("Files read successfully.\n");


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
    async ({ files }, config) => {
        const writer = config.writer;

        writer("Updating files..." + files.map(f => f.file).join(",") + "\n");

        
        try {
            const response = await axios.patch(`http://sandbox-service-${config.context.projectId}:3000/update-files`,
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

          writer("Files updated successfully.\n");


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