import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";
import dotenv from "dotenv";

dotenv.config();

const SANDBOX_ID = process.env.SANDBOX_ID;

const AGENT_HOST = `${SANDBOX_ID}.agent.localhost`;
const AGENT_URL = process.env.AGENT_URL;

export const listFiles = tool(
  async () => {
    console.log("=================================");
    console.log("using list files tool");
    console.log("=================================");

    const response = await axios.get(`${AGENT_URL}/list-files`, {
      headers: {
        Host: AGENT_HOST,
      },
    });

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

    const response = await axios.get(`${AGENT_URL}/read-files`, {
      params: {
        files: files.join(","),
      },
      headers: {
        Host: AGENT_HOST,
      },
    });

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

    const response = await axios.patch(
      `${AGENT_URL}/update-files`,
      {
        updates: files,
      },
      {
        headers: {
          Host: AGENT_HOST,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("=================================");
    console.log("response from update files tool", response.data);
    console.log("=================================");

    return JSON.stringify(response.data.results);
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