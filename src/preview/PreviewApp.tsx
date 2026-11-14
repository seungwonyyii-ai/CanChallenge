/**
 * Design mock-up previews (no game logic). Reached with a query string so it
 * works on any static host without rewrites:
 *
 *   ?preview               index of all mock-ups
 *   ?preview=themes        theme-select screen
 *   ?preview=book&box=4    BOOK game screen (box = 3 | 4 | 5)
 *   ?preview=snack&box=4   SNACK game screen
 *   ?preview=can&box=4     CAN in the same frozen state, for side-by-side checks
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Can3D } from '../components/Can3D';
import { BG, CameraRig, Environment, ShelfAnchor, StudioLights } from '../components/GameScene';
import { AnswerCompartment, Cabinet, TrayCounter } from '../components/Shelf3D';
import type { DrinkId } from '../game/types';
import { CAN_Z, SHELF_FLOOR, slotX, type Vec3 } from '../three/layout';
import { prefersReducedMotion } from '../three/motion';
import { BOOKS, SNACKS } from '../themes/mockItems';
import { Book3D, Snack3D } from '../themes/Objects3D';
import { THEMES, getTheme, type ThemeId } from '../themes/themes';
import './preview.css';

const CAN_ORDER: DrinkId[] = ['pear', 'morning', 'pine', 'plum', 'sikhye'];
const BOX_SIZES = [3, 4, 5] as const;

const href = (q: string) => `${window.location.pathname}?${q}`;

// ---------------------------------------------------------------- shared bits

function PreviewBar({ current }: { current: string }) {
  const params = new URLSearchParams(window.location.search);
  const box = params.get('box') ?? '4';
  const toast = params.get('toast') !== '0';
  const links: [string, string][] = [
    ['themes', '테마 선택'],
    ['book', 'BOOK'],
    ['snack', 'SNACK'],
    ['can', 'CAN 비교'],
  ];
  const isGame = current === 'book' || current === 'snack' || current === 'can';
  return (
    <nav className="preview-bar" aria-label="목업 미리보기">
      <a className="preview-tag" href={href('preview')}>
        PREVIEW · 디자인 목업
      </a>
      <span className="preview-links">
        {links.map(([id, label]) => (
          <a key={id} href={href(`preview=${id}${id === 'themes' ? '' : `&box=${box}`}`)} className={current === id ? 'on' : ''}>
            {label}
          </a>
        ))}
      </span>
      {isGame && (
        <span className="preview-links">
          {BOX_SIZES.map((n) => (
            <a key={n} href={href(`preview=${current}&box=${n}${toast ? '' : '&toast=0'}`)} className={String(n) === box ? 'on' : ''}>
              {n}
            </a>
          ))}
          <a href={href(`preview=${current}&box=${box}${toast ? '&toast=0' : ''}`)}>{toast ? '피드백 숨기기' : '피드백 보기'}</a>
        </span>
      )}
    </nav>
  );
}

/** Same renderer settings as the CAN game. */
function SceneCanvas({ children, className, camera }: { children: ReactNode; className?: string; camera?: { position: Vec3; fov: number } }) {
  return (
    <Canvas
      className={className}
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: camera?.fov ?? 24, near: 0.3, far: 80, position: camera?.position ?? [0, 0, 16] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Environment />
      {children}
    </Canvas>
  );
}

// ---------------------------------------------------------------- theme select

function Sway({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const still = useRef(prefersReducedMotion());
  useFrame(({ clock }) => {
    if (g.current && !still.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.22;
  });
  return <group ref={g}>{children}</group>;
}

function HeroObjects({ id }: { id: ThemeId }) {
  switch (id) {
    case 'can':
      return (
        <>
          <Can3D id="morning" position={[-0.42, 0, 0]} />
          <Can3D id="pine" position={[0, 0, 0.08]} />
          <Can3D id="sikhye" position={[0.44, 0, 0]} />
        </>
      );
    case 'book':
      return (
        <>
          <Book3D spec={BOOKS[2]} position={[-0.34, 0, -0.05]} rotationY={0.18} />
          <Book3D spec={BOOKS[0]} position={[0.36, 0, 0.06]} rotationY={-0.2} />
        </>
      );
    case 'snack':
      return (
        <>
          <Snack3D spec={SNACKS[0]} position={[-0.36, 0, 0]} rotationY={0.15} />
          <Snack3D spec={SNACKS[2]} position={[0.4, 0, -0.05]} rotationY={-0.2} />
        </>
      );
  }
}

function ThemeSelect() {
  return (
    <div className="theme-screen">
      <header className="topbar">
        <a className="logo" href={href('preview=themes')}>
          CANCAN
        </a>
        <span />
        <span />
      </header>
      <main className="theme-main">
        <h1 className="theme-title">테마를 골라주세요</h1>
        <ul className="theme-grid">
          {THEMES.map((t) => {
            const playable = t.status === 'playable';
            const body = (
              <>
                <div className="theme-object">
                  <SceneCanvas className="theme-canvas" camera={{ position: [0, 0.82, 4.2], fov: 26 }}>
                    <CardCamera />
                    <hemisphereLight args={['#fffdf7', '#d9d4c8', 0.9]} />
                    <directionalLight position={[1.5, 5, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
                    <directionalLight position={[-3, 2, 4]} intensity={0.35} />
                    <mesh rotation-x={-Math.PI / 2} receiveShadow>
                      <circleGeometry args={[1.4, 48]} />
                      <shadowMaterial opacity={0.08} />
                    </mesh>
                    <Sway>
                      <HeroObjects id={t.id} />
                    </Sway>
                  </SceneCanvas>
                </div>
                <div className="theme-label">
                  <strong>{t.label}</strong>
                  <span>{t.ko}</span>
                </div>
                <span className={`theme-status${playable ? ' play' : ''}`}>{playable ? 'PLAY' : 'COMING SOON'}</span>
              </>
            );
            return (
              <li key={t.id} className={`theme-card${playable ? '' : ' soon'}`} data-testid={`theme-${t.id}`}>
                {playable ? (
                  <a href={window.location.pathname} aria-label={`${t.label} ${t.ko} 테마로 플레이`}>
                    {body}
                  </a>
                ) : (
                  <div aria-disabled="true" aria-label={`${t.label} ${t.ko} 테마 준비 중`}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function CardCamera() {
  useFrame(({ camera }) => camera.lookAt(0, 0.46, 0));
  return null;
}

// ---------------------------------------------------------------- game mock-ups

/** Small, fixed turns so books/packages show their thickness like a real display. */
const TILT = [0.16, -0.1, 0.08, -0.14, 0.12];

function MockItems({ theme, n, slotW }: { theme: ThemeId; n: number; slotW: number }) {
  const pos = (i: number): Vec3 => [slotX(i, n, slotW), SHELF_FLOOR, CAN_Z];
  if (theme === 'book') return <>{BOOKS.slice(0, n).map((b, i) => <Book3D key={b.id} spec={b} position={pos(i)} rotationY={TILT[i] * 1.8} />)}</>;
  if (theme === 'snack') return <>{SNACKS.slice(0, n).map((s, i) => <Snack3D key={s.id} spec={s} position={pos(i)} rotationY={TILT[i] * 0.6} />)}</>;
  return <>{CAN_ORDER.slice(0, n).map((id, i) => <Can3D key={id} id={id} position={pos(i)} />)}</>;
}

function MockGame({ theme, n, toast }: { theme: ThemeId; n: number; toast: boolean }) {
  const { slotW } = getTheme(theme);
  const anchor = useRef<HTMLDivElement>(null);
  const stage = BOX_SIZES.indexOf(n as 3 | 4 | 5);
  const fakeTime = ['00:06.48', '00:14.92', '00:27.31'][stage];

  return (
    <div className="app mock">
      <header className="topbar">
        <a className="logo" href={href('preview=themes')}>
          CANCAN
        </a>
        <div className="mock-timer-wrap">
          <div className="timer">{fakeTime}</div>
          <ol className="round-dots" aria-label="라운드 진행">
            {BOX_SIZES.map((b, i) => (
              <li key={b} className={i < stage ? 'done' : i === stage ? 'on' : ''}>
                {b}
              </li>
            ))}
          </ol>
        </div>
        <span className="mock-theme-tag">{getTheme(theme).label}</span>
      </header>
      <main className="stage">
        <SceneCanvas className="scene-canvas">
          <color attach="background" args={[BG]} />
          <CameraRig n={n} slotW={slotW} />
          <StudioLights />
          <Cabinet n={n} emptySlots={Array(n).fill(false)} slotW={slotW} />
          <TrayCounter n={n} slotW={slotW} />
          <AnswerCompartment n={n} slotW={slotW} answer={[]} open={false} reducedMotion />
          <MockItems theme={theme} n={n} slotW={slotW} />
          <ShelfAnchor anchor={anchor} />
        </SceneCanvas>
        <div ref={anchor} className="shelf-anchor">
          {toast && (
            <div className="toast-anchor">
              <div className="match-toast static">2 RIGHT!</div>
            </div>
          )}
        </div>
      </main>
      <footer className="bottombar">
        <div className="actions">
          <button type="button" className="btn">
            RESET <small>배치만 초기화</small>
          </button>
          <button type="button" className="btn ghost">
            RESTART <small>처음부터</small>
          </button>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- index

function PreviewIndex() {
  const items: [string, string, string][] = [
    ['preview=themes', '테마 선택 화면', 'CAN 플레이 가능 · BOOK / SNACK COMING SOON'],
    ['preview=book&box=4', 'BOOK 게임 화면', '3 · 4 · 5 BOX 전환 가능'],
    ['preview=snack&box=4', 'SNACK 게임 화면', '봉지 + 상자 패키지'],
    ['preview=can&box=4', 'CAN 비교 화면', '같은 정지 상태의 기존 CAN 테마'],
  ];
  return (
    <div className="preview-index">
      <h1 className="theme-title">CANCAN 디자인 목업</h1>
      <p className="preview-note">게임 로직 없이 화면 디자인만 확인하는 페이지입니다. BOOK·SNACK 오브젝트는 모두 가상의 SAMPLE 디자인입니다.</p>
      <ul>
        {items.map(([q, title, sub]) => (
          <li key={q}>
            <a href={href(q)}>
              <strong>{title}</strong>
              <span>{sub}</span>
            </a>
          </li>
        ))}
        <li>
          <a href={window.location.pathname}>
            <strong>실제 CAN 게임</strong>
            <span>현재 배포된 게임</span>
          </a>
        </li>
      </ul>
    </div>
  );
}

export default function PreviewApp() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('preview') || 'index';
  const boxParam = Number(params.get('box'));
  const n = BOX_SIZES.includes(boxParam as 3 | 4 | 5) ? boxParam : 4;

  useEffect(() => {
    document.title = `CANCAN · ${view === 'index' ? 'Preview' : view.toUpperCase()} mock-up`;
  }, [view]);

  let content: ReactNode;
  if (view === 'themes') content = <ThemeSelect />;
  else if (view === 'book' || view === 'snack' || view === 'can') content = <MockGame theme={view} n={n} toast={params.get('toast') !== '0'} />;
  else content = <PreviewIndex />;

  return (
    <div className="preview-root">
      <PreviewBar current={view} />
      <div className="preview-body">{content}</div>
    </div>
  );
}
