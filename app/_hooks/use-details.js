"use client";

import { useState } from "react";

export default function useDetails() {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");

  return {
    state: { title, name, details },
    actions: { setTitle, setName, setDetails },
  };
}
