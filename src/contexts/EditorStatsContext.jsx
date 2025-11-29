/**
 * EditorStatsContext
 * Provides an optional stats calculation override for editor contexts.
 * When present, DroneToken uses this instead of global game state.
 */

import { createContext, useContext } from 'react';

const EditorStatsContext = createContext(null);

export const EditorStatsProvider = EditorStatsContext.Provider;
export const useEditorStats = () => useContext(EditorStatsContext);
