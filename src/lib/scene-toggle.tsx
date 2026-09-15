"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SceneToggleValue = {
  is3DEnabled: boolean;
  toggle3D: () => void;
};

const SceneToggleContext = createContext<SceneToggleValue | null>(null);

/**
 * Global hardware killswitch for the WebGL layer.
 *
 * Deliberately the only piece of React state that reaches across the app — it
 * flips rarely (a user click), so a Context re-render costs nothing. Every
 * high-frequency value (scroll position, camera bay, focus) stays out of React
 * entirely and lives in the mutable `sceneState` singleton instead.
 */
export function SceneToggleProvider({ children }: { children: ReactNode }) {
  const [is3DEnabled, setIs3DEnabled] = useState(true);

  const toggle3D = useCallback(() => {
    setIs3DEnabled((enabled) => !enabled);
  }, []);

  const value = useMemo(
    () => ({ is3DEnabled, toggle3D }),
    [is3DEnabled, toggle3D],
  );

  return (
    <SceneToggleContext.Provider value={value}>
      {children}
    </SceneToggleContext.Provider>
  );
}

export function useSceneToggle(): SceneToggleValue {
  const context = useContext(SceneToggleContext);
  if (!context) {
    throw new Error("useSceneToggle must be used inside <SceneToggleProvider>");
  }
  return context;
}
