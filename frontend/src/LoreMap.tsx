import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoreMap.css';

export default function LoreMap() {
  const nav = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // For pinch
  const pointers = useRef<Map<number, PointerEvent>>(new Map());
  const pinchState = useRef<{ initialDist: number; initialScale: number; midX: number; midY: number } | null>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const container = el;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.08 : 0.92;
      const newScaleUnclamped = scale * zoomFactor;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScaleUnclamped));
      // image point under cursor
      const pX = (cx - tx) / scale;
      const pY = (cy - ty) / scale;
      const newTx = cx - pX * newScale;
      const newTy = cy - pY * newScale;
      setScale(newScale);
      setTx(newTx);
      setTy(newTy);
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scale, tx, ty]);

  // Pointer events for pan and pinch
  useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const container = el;

    function onPointerDown(e: PointerEvent) {
      try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
      pointers.current.set(e.pointerId, e);
      if (pointers.current.size === 1) {
        // start pan
        panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
      } else if (pointers.current.size === 2) {
        // start pinch
  const arr = Array.from(pointers.current.values()) as PointerEvent[];
  const a = arr[0];
  const b = arr[1];
        const dx = b.clientX - a.clientX;
        const dy = b.clientY - a.clientY;
        const dist = Math.hypot(dx, dy);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        pinchState.current = { initialDist: dist, initialScale: scale, midX, midY };
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (pointers.current.has(e.pointerId)) {
        pointers.current.set(e.pointerId, e);
      }
      if (pointers.current.size === 1 && panStart.current && !pinchState.current) {
        const s = panStart.current;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        setTx(s.tx + dx);
        setTy(s.ty + dy);
      } else if (pointers.current.size >= 2 && pinchState.current) {
  const arr = Array.from(pointers.current.values()) as PointerEvent[];
  const a = arr[0];
  const b = arr[1];
        const dx = b.clientX - a.clientX;
        const dy = b.clientY - a.clientY;
        const dist = Math.hypot(dx, dy);
        const newScaleUnclamped = (dist / pinchState.current.initialDist) * pinchState.current.initialScale;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScaleUnclamped));
        // keep midpoint stable
  const rect = container.getBoundingClientRect();
  const cx = pinchState.current.midX - rect.left;
  const cy = pinchState.current.midY - rect.top;
        const pX = (cx - tx) / scale;
        const pY = (cy - ty) / scale;
        const newTx = cx - pX * newScale;
        const newTy = cy - pY * newScale;
        setScale(newScale);
        setTx(newTx);
        setTy(newTy);
      }
    }

    function onPointerUp(e: PointerEvent) {
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
      pointers.current.delete(e.pointerId);
      panStart.current = null;
      pinchState.current = null;
    }

    function onPointerCancel(e: PointerEvent) { onPointerUp(e); }

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [scale, tx, ty]);

  function onDoubleClick() {
    setScale(1);
    setTx(0);
    setTy(0);
  }

  return (
    <div className="lore-map-root">
      <button className="lore-back-btn" onClick={() => nav('/')}>← Home</button>
      <div className="lore-map-wrap" ref={containerRef} onDoubleClick={onDoubleClick}>
        <div
          className="lore-map-inner"
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
        >
          <img ref={imgRef} src="/lore/WorldMap.jpg" alt="World Map" className="lore-map-image" draggable={false} />
        </div>
      </div>
    </div>
  );
}
