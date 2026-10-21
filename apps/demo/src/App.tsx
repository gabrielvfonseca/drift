import { useState } from "react";
import { GuardedPanel } from "./GuardedPanel.js";
import { NaivePanel } from "./NaivePanel.js";

export function App() {
  const [race, setRace] = useState(0);

  return (
    <main>
      <h1>Stale async responses</h1>
      <p>
        Type <code>ca</code> then <code>cat</code> within a second. The <code>ca</code> request is
        slow, so its answer arrives last.
      </p>
      <button type="button" onClick={() => setRace((n) => n + 1)}>
        Run scripted race
      </button>
      <div className="grid">
        <NaivePanel race={race} />
        <GuardedPanel race={race} />
      </div>
    </main>
  );
}
