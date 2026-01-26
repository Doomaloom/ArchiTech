"use client";

import { useState } from "react";

export default function useAgentChat() {
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([
    {
      role: "assistant",
      text: "Upload a layout or describe the UI changes and I will draft the code.",
    },
    {
      role: "assistant",
      text: "I can also open new files, refactor sections, and sync the theme.",
    },
  ]);

  const handleAgentSend = () => {
    const trimmed = agentInput.trim();
    if (!trimmed) {
      return;
    }
    setAgentMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Noted. I will draft the update based on your notes.",
      },
    ]);
    setAgentInput("");
  };

  return {
    state: { agentInput, agentMessages },
    actions: { setAgentInput, handleAgentSend },
  };
}
