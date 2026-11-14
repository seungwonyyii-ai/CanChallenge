import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { DrinkId, GameState } from '../game/types';
import {
  DEPTH,
  FLOOR_Y,
  SHELF_FLOOR,
  SHELF_INNER_H,
  SLOT_W,
  TRAY_DEPTH,
  TRAY_TOP,
  TRAY_Z,
  contentBounds,
  slotPosition,
  slotX,
  trayPosition,
} from '../three/layout';
import { damp } from '../three/motion';
import { Can3D } from './Can3D';
import { MatchToast } from './MatchToast';
import { AnswerCompartment, Cabinet, TrayCounter } from './Shelf3D';

export const BG = '#e8e5dd';
const FOV = 24;
const ELEVATION = THREE.MathUtils.degToRad(9); // nearly frontal, top faces just visible

export interface GameSceneProps {
  state: GameState;
  coverOpen: boolean;
  reducedMotion: boolean;
  interactive: boolean;
  onSlot: (index: number) => void;
  onTray: (id: DrinkId) => void;
  /** DOM element (over the canvas) that is kept centred on the play shelf. */
  toastAnchor: RefObject<HTMLDivElement | null>;
}

/** Keeps the whole cabinet + tray in frame for any aspect ratio; eases on round change. */
export function CameraRig({ n, slotW }: { n: number; slotW?: number }) {
  const { camera, size } = useThree();
  const dist = useRef<number | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const b = contentBounds(n, slotW);
    const aspect = size.width / Math.max(1, size.height);
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const halfH = (b.top - b.bottom) / 2;
    const cy = (b.top + b.bottom) / 2;
    const need = Math.max(halfH / tanV, b.halfW / (tanV * aspect)) + DEPTH;
    dist.current = dist.current === null ? need : damp(dist.current, need, 6, Math.min(delta, 0.05));
    target.set(0, cy, 0.2);
    cam.position.set(0, cy + Math.sin(ELEVATION) * dist.current, 0.2 + Math.cos(ELEVATION) * dist.current);
    cam.lookAt(target);
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    // Neutral studio reflections generated locally (no HDR download).
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** Pins a DOM overlay to the centre of the play shelf (for the `N RIGHT!` toast). */
export function ShelfAnchor({ anchor }: { anchor: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const el = anchor.current;
    if (!el) return;
    v.set(0, SHELF_FLOOR + SHELF_INNER_H / 2, 0.3).project(camera);
    el.style.left = `${((v.x + 1) / 2) * size.width}px`;
    el.style.top = `${((1 - v.y) / 2) * size.height}px`;
  });
  return null;
}

/** Soft studio lighting + shadow-catching floor shared by every theme. */
export function StudioLights() {
  return (
    <>
      <hemisphereLight args={['#fffdf7', '#d9d4c8', 0.75]} />
      <directionalLight
        position={[0.8, 7.5, 6.5]}
        intensity={1.55}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={3}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <directionalLight position={[-4, 2, 5]} intensity={0.35} color="#f3f1ff" />

      {/* floor: invisible except for the shadows it catches */}
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.05} />
      </mesh>
    </>
  );
}

/** Exposes projected hit-target centres for automated tests (`?e2e`). */
function TestProbe({ state }: { state: GameState }) {
  const { camera, size } = useThree();
  const enabled = useMemo(() => new URLSearchParams(window.location.search).has('e2e'), []);
  useFrame(() => {
    if (!enabled) return;
    const n = state.ids.length;
    const project = (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    };
    (window as unknown as { __NBOX_TARGETS__: unknown }).__NBOX_TARGETS__ = {
      slots: Array.from({ length: n }, (_, i) => project(slotX(i, n), SHELF_FLOOR + 0.5, 0)),
      tray: state.ids.map((id, i) => ({ id, ...project(slotX(i, n), TRAY_TOP + 0.5, TRAY_Z) })),
    };
  });
  return null;
}

function Hit({
  position,
  size,
  onClick,
  enabled,
  name,
}: {
  position: [number, number, number];
  size: [number, number, number];
  onClick: () => void;
  enabled: boolean;
  name: string;
}) {
  return (
    <mesh
      name={name}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (enabled) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function SceneContent({ state, coverOpen, reducedMotion, interactive, onSlot, onTray, toastAnchor }: GameSceneProps) {
  const n = state.ids.length;
  const roundKey = `${state.runId}-${state.stage}`;
  const sel = state.selection;

  const cans = state.ids.map((id, trayIndex) => {
    const slot = state.slots.indexOf(id);
    const position = slot >= 0 ? slotPosition(slot, n) : trayPosition(trayIndex, n);
    const selected = (sel?.kind === 'tray' && sel.id === id) || (sel?.kind === 'slot' && state.slots[sel.index] === id);
    return { id, position, selected };
  });

  return (
    <>
      <color attach="background" args={[BG]} />
      <CameraRig n={n} />
      <Environment />
      <StudioLights />

      <Cabinet n={n} emptySlots={state.slots.map((s) => s === null)} />
      <TrayCounter n={n} />
      <AnswerCompartment key={roundKey} n={n} answer={state.answer} open={coverOpen} reducedMotion={reducedMotion} />

      {cans.map(({ id, position, selected }) => (
        <Can3D key={`${roundKey}-${id}`} id={id} position={position} selected={selected} reducedMotion={reducedMotion} appear={state.phase !== 'ready'} />
      ))}

      {/* generous, non-overlapping hit boxes: one per slot column and per tray spot */}
      {Array.from({ length: n }, (_, i) => (
        <Hit
          key={`s${i}`}
          name={`slot-${i}`}
          enabled={interactive}
          position={[slotX(i, n), SHELF_FLOOR + SHELF_INNER_H / 2, 0.1]}
          size={[SLOT_W * 0.98, SHELF_INNER_H, DEPTH + 0.2]}
          onClick={() => onSlot(i)}
        />
      ))}
      {state.ids.map((id, i) => (
        <Hit
          key={`t${id}`}
          name={`tray-${id}`}
          enabled={interactive && !state.slots.includes(id)}
          position={[slotX(i, n), TRAY_TOP + 0.55, TRAY_Z]}
          size={[SLOT_W * 0.98, 1.12, TRAY_DEPTH]}
          onClick={() => onTray(id)}
        />
      ))}

      <ShelfAnchor anchor={toastAnchor} />

      <TestProbe state={state} />
    </>
  );
}

export function GameScene(props: Omit<GameSceneProps, 'toastAnchor'>) {
  const toastAnchor = useRef<HTMLDivElement>(null);
  return (
    <>
      <Canvas
        className="scene-canvas"
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, near: 0.5, far: 80, position: [0, 0, 16] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <SceneContent {...props} toastAnchor={toastAnchor} />
      </Canvas>
      {/* N RIGHT! — centred on the play shelf, never intercepts input */}
      <div ref={toastAnchor} className="shelf-anchor">
        <MatchToast result={props.state.lastResult} />
      </div>
    </>
  );
}
