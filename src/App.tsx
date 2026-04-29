import { useState } from "react";
import { EventKeyGate } from "./components/EventKeyGate";
import { Header, type AppView } from "./components/Header";
import { ChatInterface } from "./components/ChatInterface";
import { TeamTable } from "./components/TeamTable";
import { TeamProfile } from "./components/TeamProfile";
import { PicklistTab } from "./components/PicklistTab";
import { useEventData } from "./hooks/useEventData";
import type { TeamEntry } from "./types";

const STORAGE_KEY = "sg_event_key";

function loadStoredEventKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveEventKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

export default function App() {
  const [eventKey, setEventKey] = useState<string | null>(loadStoredEventKey);
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedTeam, setSelectedTeam] = useState<TeamEntry | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);

  const { teams, loading, epaProgress, error, load } = useEventData();

  const handleEventKeyChange = (key: string) => {
    saveEventKey(key);
    setEventKey(key);
    setSelectedTeam(null);
  };

  const handleLoadData = (key: string) => {
    handleEventKeyChange(key);
    load(key);
  };

  const handleSelectTeam = (teamNumber: string) => {
    const team = teams.find((t) => t.teamNumber === teamNumber) ?? {
      teamNumber,
      stats: null,
      epa: null,
      epaLoading: false,
    };
    setSelectedTeam(team);
  };

  const handleAskAgent = (prompt: string) => {
    setPendingChatPrompt(prompt);
    setView("chat");
    setSelectedTeam(null);
  };

  // Show gate until an event key is chosen
  if (!eventKey) {
    return (
      <EventKeyGate
        onConfirm={(key) => {
          saveEventKey(key);
          setEventKey(key);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        eventKey={eventKey}
        onEventKeyChange={handleEventKeyChange}
        onLoadData={handleLoadData}
        view={view}
        onViewChange={(v) => {
          setView(v);
          if (v === "dashboard") setSelectedTeam(null);
        }}
      />

      {/* ── Dashboard view ── */}
      {view === "dashboard" && (
        selectedTeam ? (
          <TeamProfile
            team={selectedTeam}
            eventKey={eventKey}
            onBack={() => setSelectedTeam(null)}
            onAskAgent={handleAskAgent}
          />
        ) : (
          <TeamTable
            teams={teams}
            loading={loading}
            epaProgress={epaProgress}
            error={error}
            onSelectTeam={handleSelectTeam}
          />
        )
      )}

      {/* ── Picklist view ── */}
      {view === "picklist" && (
        <PicklistTab teams={teams} eventKey={eventKey} />
      )}

      {/* ── Chat view ── */}
      {view === "chat" && (
        <ChatInterface
          eventKey={eventKey}
          externalPrompt={pendingChatPrompt}
          onExternalPromptConsumed={() => setPendingChatPrompt(null)}
        />
      )}
    </div>
  );
}
