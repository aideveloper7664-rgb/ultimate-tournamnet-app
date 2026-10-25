import React from 'react';
import { THEMES, applyTheme } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

export const AppearanceDrawer: React.FC = () => {
  const { isDrawerOpen, setIsDrawerOpen, currentThemeId, setCurrentThemeId } = useAuth();

  const handleSelect = (id: string) => {
    setCurrentThemeId(id);
    applyTheme(id);
    setTimeout(() => {
      setIsDrawerOpen(false);
    }, 250);
  };

  return (
    <>
      <div
        className={`scrim ${isDrawerOpen ? 'on' : ''}`}
        id="scrim"
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside className={`drawer ${isDrawerOpen ? 'on' : ''}`} id="drawer">
        <header className="d-flex align-items-center justify-content-between">
          <div>
            <h2>Appearance</h2>
            <p>Choose your vibe</p>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white shadow-none me-1"
            style={{ filter: 'var(--text) === "#1f2430" ? "invert(1)" : "none"' }}
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close"
          />
        </header>
        <div className="opts" id="opts">
          {THEMES.map((t) => {
            const isSelected = currentThemeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`opt ${isSelected ? 'on' : ''}`}
                data-t={t.id}
                onClick={() => handleSelect(t.id)}
              >
                <span className="sw" style={{ background: t.sw[0] }}>
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '50%',
                      background: t.sw[1]
                    }}
                  />
                </span>
                <span>{t.name}</span>
                {isSelected && <span className="cnt">ACTIVE</span>}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
