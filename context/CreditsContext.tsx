// context/CreditsContext.tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface CreditsContextValue {
  credits: number;
  setCredits: (n: number) => void;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: 0,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export function CreditsProvider({
  children,
  initialCredits,
}: {
  children: ReactNode;
  initialCredits: number;
}) {
  const [credits, setCredits] = useState(initialCredits);

  const refreshCredits = async () => {
    const res = await fetch("/api/user-config"); // or your credits endpoint
    const data = await res.json();
    setCredits(data.credits);
  };

  return (
    <CreditsContext.Provider value={{ credits, setCredits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export const useCredits = () => useContext(CreditsContext);