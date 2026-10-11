import { useEffect, useState } from "react";

import AppLayout from "./components/layout/AppLayout";
import BackendStatus from "./components/system/BackendStatus";
import ChatPanel from "./components/chat/ChatPanel";
import VoicePanel from "./components/voice/VoicePanel";
import { checkBackend } from "./services/backend/backendService";

export default function App() {
  const [backendStatus, setBackendStatus] = useState("Connecting...");

  useEffect(() => {
    checkBackend()
      .then(() => {
        setBackendStatus("Buddy is alive");
      })
      .catch(() => {
        setBackendStatus("Backend unavailable");
      });
  }, []);

  return (
    <>
      <AppLayout
        voice={<VoicePanel />}
        chat={<ChatPanel />}
      />

      <BackendStatus status={backendStatus} />
    </>
  );
}