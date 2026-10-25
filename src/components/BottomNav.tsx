import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { currentSection, showSection } = useAuth();

  const navRef = useRef<HTMLElement | null>(null);
  const c0Ref = useRef<SVGSVGElement | null>(null);
  const c1Ref = useRef<SVGSVGElement | null>(null);
  const bumpRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const mainRef = useRef<number>(0);
  const curRef = useRef<number>(2); // Default to home (index 2)
  const busyRef = useRef<boolean>(false);
  const targetRef = useRef<number | null>(null);
  const timersRef = useRef<any[]>([]);
  const animsRef = useRef<Animation[]>([]);

  const getEffectiveIndex = (sec: string) => {
    switch (sec) {
      case 'leaderboard-section':
        return 0; // Stats
      case 'my-contests-section':
        return 1; // Announcements
      case 'home-section':
      case 'tournaments-section':
        return 2; // Home
      case 'wallet-section':
      case 'recharge-section':
      case 'earnings-section':
        return 3; // Wallet
      case 'profile-section':
        return 4; // Profile
      default:
        return 2;
    }
  };

  const navSections = [
    'leaderboard-section',
    'my-contests-section',
    'home-section',
    'wallet-section',
    'profile-section'
  ];

  const W = () => (navRef.current ? navRef.current.offsetWidth / 5 : 86);
  const px = (i: number) => (i + 0.5) * W() - 85;
  const GREY = '#8e8e9c';
  const CY = () => {
    if (typeof window !== 'undefined') {
      const val = getComputedStyle(document.body).getPropertyValue('--accent').trim();
      if (val) return val;
    }
    return '#19e6ff';
  };

  const place = () => {
    const cv = [c0Ref.current, c1Ref.current];
    const curCurve = cv[mainRef.current];
    if (curCurve) {
      curCurve.style.transform = `translateX(${px(curRef.current)}px)`;
    }
  };

  const A = (el: Element, kf: Keyframe[] | PropertyIndexedKeyframes, o: KeyframeAnimationOptions) => {
    const a = el.animate(kf, { fill: 'both', ...o });
    animsRef.current.push(a);
    return a;
  };

  const T = (f: () => void, ms: number) => {
    timersRef.current.push(setTimeout(f, ms));
  };

  const tl = (el: Element, list: [number, Keyframe, string?][], t0: number) => {
    const D = list[list.length - 1][0];
    const kf: Keyframe[] = list.map(([t, pr, e]) => ({
      offset: D > 0 ? t / D : 0,
      ...pr,
      ...(e ? { easing: e } : {})
    }));
    return A(el, kf, { duration: D, delay: t0, easing: 'ease-out' });
  };

  const finalize = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    animsRef.current.forEach(a => {
      try {
        a.cancel();
      } catch (e) {}
    });
    animsRef.current = [];

    const cv = [c0Ref.current, c1Ref.current];
    const curMain = mainRef.current;
    if (cv[curMain]) cv[curMain]!.classList.remove('hide');
    if (cv[curMain ^ 1]) cv[curMain ^ 1]!.classList.add('hide');

    const tgt = targetRef.current !== null ? targetRef.current : curRef.current;
    curRef.current = tgt;

    btnRefs.current.forEach((btn, k) => {
      if (!btn) return;
      btn.classList.remove('tap');
      btn.classList.toggle('on', k === tgt);
      const svg = btn.querySelector('svg');
      if (svg) {
        if (k === tgt) {
          svg.style.transform = 'translateY(-15px) scale(1.12)';
          svg.style.fill = 'var(--accent)';
          svg.style.color = 'var(--accent)';
          svg.style.filter = 'drop-shadow(0 0 6px var(--accent))';
        } else {
          svg.style.transform = 'translateY(0) scale(1)';
          svg.style.fill = '#fff';
          svg.style.color = '#fff';
          svg.style.filter = 'none';
        }
      }
    });

    if (navRef.current) navRef.current.classList.remove('anim');
    if (bumpRef.current) bumpRef.current.style.opacity = '0';
    place();
    busyRef.current = false;
  };

  const setNav = (i: number, first?: boolean) => {
    if (first) {
      curRef.current = i;
      btnRefs.current.forEach((btn, k) => {
        if (!btn) return;
        btn.classList.toggle('on', k === i);
        const svg = btn.querySelector('svg');
        if (svg) {
          if (k === i) {
            svg.style.transform = 'translateY(-15px) scale(1.12)';
            svg.style.fill = 'var(--accent)';
            svg.style.color = 'var(--accent)';
            svg.style.filter = 'drop-shadow(0 0 6px var(--accent))';
          } else {
            svg.style.transform = 'translateY(0) scale(1)';
            svg.style.fill = '#fff';
            svg.style.color = '#fff';
            svg.style.filter = 'none';
          }
        }
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

    const cv = [c0Ref.current, c1Ref.current];
    const oldC = cv[mainRef.current];
    mainRef.current ^= 1;
    const newC = cv[mainRef.current];
    const cyan = CY();

    if (newC) {
      newC.style.transform = `translateX(${px(i)}px)`;
    }
    if (navRef.current) navRef.current.classList.add('anim');

    // Tapped icon turns cyan immediately
    const tappedBtn = btnRefs.current[i];
    if (tappedBtn) tappedBtn.classList.add('tap');

    const P = 110;
    const sd = k <= 2 ? 120 : 90;
    const Td = P + k * sd + 30;
    const D = Td + 640;

    const svg = (j: number) => btnRefs.current[j]?.querySelector('svg');

    // Old notch collapses
    const oldBtn = btnRefs.current[o];
    if (oldBtn) oldBtn.classList.remove('on');

    if (oldC) {
      const disc = oldC.querySelector('.disc');
      const dip = oldC.querySelector('.dip');
      if (disc) {
        A(disc, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 70, delay: P });
      }
      if (dip) {
        A(dip, [
          { transform: 'scale(1,1)', opacity: 1 },
          { transform: 'scale(1.3,.22)', opacity: 0.9, offset: 0.5 },
          { transform: 'scale(1.5,.08)', opacity: 0 }
        ], { duration: 260, delay: P, easing: 'cubic-bezier(.25,.8,.3,1)' });
      }
    }

    // Travelling bump
    const mids: number[] = [];
    for (let s = 1; s <= k; s++) {
      mids.push((cx(o + (s - 1) * d) + cx(o + s * d)) / 2 - 9);
    }

    const bl: [number, Keyframe, string?][] = [
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

    if (bumpRef.current) {
      tl(bumpRef.current, bl, P);
    }

    // Icons: pushed down while the wave is next to them
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

      const start: Keyframe = isO
        ? { transform: 'translateY(-15px) scale(1.12)', fill: cyan, opacity: 1 }
        : isN
        ? { transform: 'translateY(0) scale(1)', fill: cyan, opacity: 1 }
        : { transform: 'translateY(0) scale(1)', fill: '#fff', opacity: 1 };

      const sunk: Keyframe = {
        transform: 'translateY(34px) scale(.9)',
        fill: isN ? cyan : GREY,
        opacity: isN ? 0.55 : 0.8
      };

      const L: [number, Keyframe, string?][] = [
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
      if (targetSvg) {
        tl(targetSvg, L, P);
      }
    }

    // New notch grows with a bounce at the destination
    if (newC) {
      newC.classList.remove('hide');
      const newDip = newC.querySelector('.dip');
      const newDisc = newC.querySelector('.disc');
      if (newDip) {
        A(newDip, [
          { transform: 'scale(1,.04)', opacity: 0 },
          { transform: 'scale(1,.06)', opacity: 1, offset: 0.04 },
          { transform: 'scale(1,1.1)', opacity: 1, offset: 0.62 },
          { transform: 'scale(1,1)', opacity: 1 }
        ], { duration: 430, delay: Td, easing: 'ease-out' });
      }
      if (newDisc) {
        A(newDisc, [
          { transform: 'translateY(16px) scale(.7)', opacity: 0 },
          { transform: 'translateY(14px) scale(.78)', opacity: 1, offset: 0.18 },
          { transform: 'translateY(-4px) scale(1.04)', opacity: 1, offset: 0.7 },
          { transform: 'translateY(0) scale(1)', opacity: 1 }
        ], { duration: 460, delay: Td, easing: 'ease-out' });
      }
    }

    T(finalize, D);
  };

  // Mount initialization & resize listener
  useEffect(() => {
    const initialIndex = getEffectiveIndex(currentSection);
    setNav(initialIndex, true);

    const onResize = () => {
      place();
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      timersRef.current.forEach(clearTimeout);
      animsRef.current.forEach(a => {
        try {
          a.cancel();
        } catch (e) {}
      });
    };
  }, []);

  // Sync when currentSection changes from outside (e.g. In-app navigation)
  useEffect(() => {
    const targetIdx = getEffectiveIndex(currentSection);
    if (targetIdx !== curRef.current && !busyRef.current) {
      setNav(targetIdx);
    }
  }, [currentSection]);

  if (currentSection === 'login-section') {
    return null;
  }

  const handleTabClick = (index: number) => {
    showSection(navSections[index]);
    setNav(index);
  };

  return (
    <nav className="nav" id="nav" ref={navRef}>
      <svg className="curve" id="c0" ref={c0Ref} viewBox="0 0 170 60">
        <path className="dip" d="M0 0C30 0 40 8 52 28C62 45 72 56 85 56C98 56 108 45 118 28C130 8 140 0 170 0Z" />
        <circle className="disc" cx="85" cy="20" r="24" />
      </svg>
      <svg className="curve hide" id="c1" ref={c1Ref} viewBox="0 0 170 60">
        <path className="dip" d="M0 0C30 0 40 8 52 28C62 45 72 56 85 56C98 56 108 45 118 28C130 8 140 0 170 0Z" />
        <circle className="disc" cx="85" cy="20" r="24" />
      </svg>
      <i className="bump" id="bump" ref={bumpRef as any} />

      <button
        data-v="stats"
        aria-label="Stats"
        ref={el => { btnRefs.current[0] = el; }}
        onClick={() => handleTabClick(0)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M3 20V10h4v10zm7 0V4h4v16zm7 0v-7h4v7z" />
        </svg>
      </button>

      <button
        data-v="news"
        aria-label="Announcements"
        ref={el => { btnRefs.current[1] = el; }}
        onClick={() => handleTabClick(1)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path
            d="M2 9.5v4.5h3l5 4V5.5L5 9.5zM17.5 5.5l1.7-1.7M18.5 10h2.5M17.5 14.5l1.7 1.7"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{ stroke: 'currentColor' }}
          />
        </svg>
      </button>

      <button
        data-v="home"
        aria-label="Home"
        ref={el => { btnRefs.current[2] = el; }}
        onClick={() => handleTabClick(2)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
        </svg>
      </button>

      <button
        data-v="wallet"
        aria-label="Wallet"
        ref={el => { btnRefs.current[3] = el; }}
        onClick={() => handleTabClick(3)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <path d="M3 6a2 2 0 0 1 2-2h14v3H5v1h16v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm14 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
        </svg>
      </button>

      <button
        data-v="me"
        aria-label="Profile"
        ref={el => { btnRefs.current[4] = el; }}
        onClick={() => handleTabClick(4)}
      >
        <svg className="i" viewBox="0 0 24 24">
          <circle cx="12" cy="7" r="4.5" />
          <path d="M3 21c0-5 4-7.5 9-7.5s9 2.5 9 7.5z" />
        </svg>
      </button>
    </nav>
  );
};
