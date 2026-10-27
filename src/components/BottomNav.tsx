import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { currentSection, showSection } = useAuth();

  const navRef = useRef<HTMLElement>(null);
  const c0Ref = useRef<SVGSVGElement>(null);
  const c1Ref = useRef<SVGSVGElement>(null);
  const bumpRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const mainRef = useRef(0);
  const curRef = useRef(2); // default Home
  const busyRef = useRef(false);
  const targetRef = useRef<number | null>(null);
  const timersRef = useRef<any[]>([]);
  const animsRef = useRef<Animation[]>([]);

  const W = useCallback(() => (navRef.current ? navRef.current.offsetWidth / 5 : 86), []);
  const px = useCallback((i: number) => (i + 0.5) * W() - 85, [W]);
  const GREY = '#8e8e9c';
  const CY = useCallback(() => {
    if (typeof document !== 'undefined') {
      return getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#19e6ff';
    }
    return '#19e6ff';
  }, []);

  const place = useCallback(() => {
    const cv = [c0Ref.current, c1Ref.current];
    if (cv[mainRef.current]) {
      cv[mainRef.current]!.style.transform = `translateX(${px(curRef.current)}px)`;
    }
  }, [px]);

  useEffect(() => {
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);

  const A = (el: Element, kf: Keyframe[] | PropertyIndexedKeyframes, o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, { fill: 'both', ...o });
    animsRef.current.push(a);
    return a;
  };

  const T = (f: () => void, ms: number) => {
    timersRef.current.push(setTimeout(f, ms));
  };

  const tl = (el: Element, list: [number, Keyframe, (string | undefined)?][], t0: number) => {
    const D = list[list.length - 1][0];
    const kf = list.map(([t, pr, e]) => ({
      offset: t / D,
      ...pr,
      ...(e ? { easing: e } : {})
    }));
    return A(el, kf, { duration: D, delay: t0, easing: 'ease-out' });
  };

  const finalize = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    animsRef.current.forEach(a => {
      try { a.cancel(); } catch {}
    });
    animsRef.current = [];

    const cv = [c0Ref.current, c1Ref.current];
    const main = mainRef.current;
    if (cv[main]) cv[main]!.classList.remove('hide');
    if (cv[main ^ 1]) cv[main ^ 1]!.classList.add('hide');

    if (targetRef.current !== null) {
      curRef.current = targetRef.current;
    }
    btnRefs.current.forEach((x, k) => {
      if (x) {
        x.classList.remove('tap');
        x.classList.toggle('on', k === curRef.current);
      }
    });

    if (navRef.current) navRef.current.classList.remove('anim');
    if (bumpRef.current) bumpRef.current.style.opacity = '0';
    place();
    busyRef.current = false;
  }, [place]);

  const setNav = useCallback((i: number, first = false) => {
    const cv = [c0Ref.current, c1Ref.current];
    const navEl = navRef.current;
    const bump = bumpRef.current;
    if (!navEl || !bump || !cv[0] || !cv[1]) return;

    if (first) {
      curRef.current = i;
      btnRefs.current.forEach((x, k) => {
        if (x) x.classList.toggle('on', k === i);
      });
      place();
      return;
    }

    if (busyRef.current) finalize();
    if (i === curRef.current) return;

    busyRef.current = true;
    targetRef.current = i;
    const o = curRef.current;
    const d = Math.sign(i - o);
    const k = Math.abs(i - o);
    const w = W();
    const cx = (j: number) => (j + 0.5) * w;
    const oldC = cv[mainRef.current]!;
    mainRef.current ^= 1;
    const newC = cv[mainRef.current]!;
    const cyan = CY();

    newC.style.transform = `translateX(${px(i)}px)`;
    navEl.classList.add('anim');

    if (btnRefs.current[i]) btnRefs.current[i]!.classList.add('tap');

    // Map tab index to target app screen
    const sectionMap = [
      'leaderboard-section',
      'my-contests-section',
      'home-section',
      'wallet-section',
      'profile-section'
    ];
    showSection(sectionMap[i]);

    const P = 110;
    const sd = k <= 2 ? 120 : 90;
    const Td = P + k * sd + 30;
    const D = Td + 640;
    const svg = (j: number) => btnRefs.current[j]?.querySelector('svg');

    /* old notch: collapses */
    if (btnRefs.current[o]) btnRefs.current[o]!.classList.remove('on');
    const oldDisc = oldC.querySelector('.disc');
    if (oldDisc) {
      A(oldDisc, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 70, delay: P });
    }
    const oldDip = oldC.querySelector('.dip');
    if (oldDip) {
      A(oldDip, [
        { transform: 'scale(1,1)', opacity: 1 },
        { transform: 'scale(1.3,.22)', opacity: 0.9, offset: 0.5 },
        { transform: 'scale(1.5,.08)', opacity: 0 }
      ], { duration: 260, delay: P, easing: 'cubic-bezier(.25,.8,.3,1)' });
    }

    /* travelling bump */
    const mids: number[] = [];
    for (let s = 1; s <= k; s++) {
      mids.push((cx(o + (s - 1) * d) + cx(o + s * d)) / 2 - 9);
    }
    const bl: [number, Keyframe, (string | undefined)?][] = [
      [0, { transform: `translateX(${mids[0]}px) scale(.2)`, opacity: 0 }],
      [0.3 * sd, { transform: `translateX(${mids[0]}px) scale(1)`, opacity: 1 }]
    ];
    for (let s = 1; s <= k; s++) {
      if (s > 1) {
        bl.push([(s - 1) * sd + 0.38 * sd, { transform: `translateX(${mids[s - 1]}px) scale(1)`, opacity: 1 }]);
      }
      bl.push([s * sd, { transform: `translateX(${mids[s - 1]}px) scale(1)`, opacity: 1 }]);
    }
    bl.push([k * sd + 30, { transform: `translateX(${cx(i) - 9}px) scale(.5)`, opacity: 0 }]);
    tl(bump, bl, P);

    /* icons: pushed down while the wave is next to them */
    for (let j = 0; j < 5; j++) {
      const stg: number[] = [];
      for (let s = 1; s <= k; s++) {
        if (j === o + (s - 1) * d || j === o + s * d) stg.push(s);
      }
      const isO = j === o;
      const isN = j === i;
      if (!stg.length) continue;
      const first = Math.min(...stg);
      const last = Math.max(...stg);
      const ps = (first - 1) * sd + (isO ? 0 : 0.2 * sd);
      const pe = last * sd;
      const start = isO
        ? { transform: 'translateY(-15px) scale(1.12)', fill: cyan, opacity: 1 }
        : isN
        ? { transform: 'translateY(0) scale(1)', fill: cyan, opacity: 1 }
        : { transform: 'translateY(0) scale(1)', fill: '#fff', opacity: 1 };
      const sunk = {
        transform: 'translateY(34px) scale(.9)',
        fill: isN ? cyan : GREY,
        opacity: isN ? 0.55 : 0.8
      };
      const L: [number, Keyframe, (string | undefined)?][] = [
        [0, start],
        [ps, start],
        [ps + 60, sunk],
        [pe, sunk]
      ];
      if (isN) {
        L.push(
          [pe + 30, { transform: 'translateY(34px) scale(.8)', fill: cyan, opacity: 0.5 }],
          [pe + 30 + 120, { transform: 'translateY(-21px) scale(1.2)', fill: cyan, opacity: 1 }],
          [pe + 30 + 260, { transform: 'translateY(-15px) scale(1.12)', fill: cyan, opacity: 1 }]
        );
      } else {
        L.push(
          [pe + 110, { transform: 'translateY(-5px) scale(1)', fill: '#fff', opacity: 1 }],
          [pe + 190, { transform: 'translateY(0) scale(1)', fill: '#fff', opacity: 1 }]
        );
      }
      const targetSvg = svg(j);
      if (targetSvg) tl(targetSvg, L, P);
    }

    /* new notch grows with a bounce at the destination */
    newC.classList.remove('hide');
    const newDip = newC.querySelector('.dip');
    if (newDip) {
      A(newDip, [
        { transform: 'scale(1,.04)', opacity: 0 },
        { transform: 'scale(1,.06)', opacity: 1, offset: 0.04 },
        { transform: 'scale(1,1.1)', opacity: 1, offset: 0.62 },
        { transform: 'scale(1,1)', opacity: 1 }
      ], { duration: 430, delay: P + Td - P + 0, easing: 'ease-out' });
    }
    const newDisc = newC.querySelector('.disc');
    if (newDisc) {
      A(newDisc, [
        { transform: 'translateY(16px) scale(.7)', opacity: 0 },
        { transform: 'translateY(14px) scale(.78)', opacity: 1, offset: 0.18 },
        { transform: 'translateY(-4px) scale(1.04)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(0) scale(1)', opacity: 1 }
      ], { duration: 460, delay: Td, easing: 'ease-out' });
    }
    T(finalize, D);
  }, [CY, W, finalize, place, px, showSection]);

  // Sync with currentSection when navigating externally
  useEffect(() => {
    let targetIdx = 2;
    switch (currentSection) {
      case 'leaderboard-section':
        targetIdx = 0;
        break;
      case 'my-contests-section':
        targetIdx = 1;
        break;
      case 'home-section':
      case 'tournaments-section':
        targetIdx = 2;
        break;
      case 'wallet-section':
      case 'recharge-section':
      case 'earnings-section':
        targetIdx = 3;
        break;
      case 'profile-section':
      case 'level-rewards-section':
      case 'earn-section':
      case 'spinwheel-section':
      case 'scratchcard-section':
      case 'lottery-section':
      case 'shop-section':
      case 'tutorials-section':
        targetIdx = 4;
        break;
      default:
        targetIdx = 2;
    }

    if (!busyRef.current && curRef.current !== targetIdx) {
      setNav(targetIdx, true);
    }
  }, [currentSection, setNav]);

  // Initial place on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      place();
    }, 50);
    return () => clearTimeout(timer);
  }, [place]);

  if (currentSection === 'login-section') {
    return null;
  }

  return (
    <nav className="nav" id="nav" ref={navRef} role="navigation" aria-label="Curve Wave Navigation">
      <svg className="curve" id="c0" ref={c0Ref} viewBox="0 0 170 60">
        <path className="dip" d="M0 0C30 0 40 8 52 28C62 45 72 56 85 56C98 56 108 45 118 28C130 8 140 0 170 0Z" />
        <circle className="disc" cx="85" cy="20" r="24" />
      </svg>
      <svg className="curve hide" id="c1" ref={c1Ref} viewBox="0 0 170 60">
        <path className="dip" d="M0 0C30 0 40 8 52 28C62 45 72 56 85 56C98 56 108 45 118 28C130 8 140 0 170 0Z" />
        <circle className="disc" cx="85" cy="20" r="24" />
      </svg>
      <i className="bump" id="bump" ref={bumpRef}></i>

      <button
        ref={el => (btnRefs.current[0] = el)}
        data-v="stats"
        aria-label="Stats"
        onClick={() => setNav(0)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M3 20V10h4v10zm7 0V4h4v16zm7 0v-7h4v7z" />
        </svg>
      </button>

      <button
        ref={el => (btnRefs.current[1] = el)}
        data-v="news"
        aria-label="Announcements"
        onClick={() => setNav(1)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path
            d="M2 9.500v4.500h3l5 4V5.500L5 9.500zM17.500 5.500l1.700-1.700M18.500 10h2.500M17.500 14.500l1.700 1.700"
            stroke="#fff"
            strokeWidth="1.800"
            strokeLinecap="round"
            style={{ stroke: 'currentColor' }}
          />
        </svg>
      </button>

      <button
        ref={el => (btnRefs.current[2] = el)}
        data-v="home"
        className="on"
        aria-label="Home"
        onClick={() => setNav(2)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
        </svg>
      </button>

      <button
        ref={el => (btnRefs.current[3] = el)}
        data-v="wallet"
        aria-label="Wallet"
        onClick={() => setNav(3)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M3 6a2 2 0 0 1 2-2h14v3H5v1h16v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm14 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
        </svg>
      </button>

      <button
        ref={el => (btnRefs.current[4] = el)}
        data-v="me"
        aria-label="Profile"
        onClick={() => setNav(4)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <circle cx="12" cy="7" r="4.5" />
          <path d="M3 21c0-5 4-7.500 9-7.500s9 2.500 9 7.500z" />
        </svg>
      </button>
    </nav>
  );
};
