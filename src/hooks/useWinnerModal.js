import { useState, useEffect, useCallback, useRef } from 'react';

export default function useWinnerModal(winner) {
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const dismissedRef = useRef(false);

  // Show modal when winner is detected (but not if user already dismissed it)
  useEffect(() => {
    if (winner && !showWinnerModal && !dismissedRef.current) {
      setShowWinnerModal(true);
    }
  }, [winner, showWinnerModal]);

  // Reset dismissed flag when winner clears (new game)
  useEffect(() => {
    if (!winner) {
      dismissedRef.current = false;
    }
  }, [winner]);

  const dismissWinnerModal = useCallback(() => {
    dismissedRef.current = true;
    setShowWinnerModal(false);
  }, []);

  return { showWinnerModal, dismissWinnerModal };
}
