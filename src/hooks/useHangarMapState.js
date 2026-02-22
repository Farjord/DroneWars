import { useState, useEffect, useRef } from 'react';
import { clampPan } from '../logic/singlePlayer/hexGrid.js';

/**
 * Hook managing pan/zoom interaction state for the Hangar hex grid map.
 * Receives mapContainerRef from caller (shared with useHangarData).
 * Uses direct DOM manipulation during drag for smooth panning.
 */
const useHangarMapState = (hexGridData, mapContainerRef) => {
  const [zoom, setZoom] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const transformRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });

  // Wrapper: reads container dimensions from ref
  const clampPanFromRef = (panX, panY, zoomLevel) => {
    if (!mapContainerRef.current) return { x: 0, y: 0 };
    const { width, height } = mapContainerRef.current.getBoundingClientRect();
    return clampPan(panX, panY, zoomLevel, width, height);
  };

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prevZoom => {
        const newZoom = Math.min(3, Math.max(1.2, prevZoom + delta));
        setPan(p => {
          if (!mapContainerRef.current || newZoom <= 1) return { x: 0, y: 0 };
          const { width, height } = mapContainerRef.current.getBoundingClientRect();
          const maxPanX = (width * (newZoom - 1)) / 2;
          const maxPanY = (height * (newZoom - 1)) / 2;
          return {
            x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, p.y))
          };
        });
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keep panRef in sync when pan state changes from non-drag sources
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const zoomToSector = (coordinate) => {
    const cell = hexGridData?.allCells.find(c => c.coordinate === coordinate);
    if (!cell || !mapContainerRef.current) return;

    const container = mapContainerRef.current.getBoundingClientRect();
    const targetZoom = 2;

    const cellCenterX = cell.x + hexGridData.hexWidth / 2;
    const cellCenterY = cell.y + hexGridData.hexHeight / 2;

    const containerCenterX = container.width / 2;
    const containerCenterY = container.height / 2;

    const panX = (containerCenterX - cellCenterX) * targetZoom;
    const panY = (containerCenterY - cellCenterY) * targetZoom;

    const clamped = clampPanFromRef(panX, panY, targetZoom);

    setZoom(targetZoom);
    setPan(clamped);
    panRef.current = clamped;
  };

  const handleMapMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMapMouseMove = (e) => {
    if (isDragging && transformRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const clamped = clampPanFromRef(newX, newY, zoom);
      // Direct DOM update - bypasses React re-render for smooth panning
      transformRef.current.style.transform =
        `scale(${zoom}) translate(${clamped.x / zoom}px, ${clamped.y / zoom}px)`;
      panRef.current = clamped;
    }
  };

  const handleMapMouseUp = () => {
    if (isDragging) {
      setPan(panRef.current);
    }
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  };

  return {
    zoom, pan, isDragging,
    transformRef,
    zoomToSector,
    handleMapMouseDown, handleMapMouseMove, handleMapMouseUp,
    handleResetView
  };
};

export default useHangarMapState;
