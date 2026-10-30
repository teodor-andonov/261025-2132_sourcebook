export const THEME_MODES=['system','light','dark'];
export function normalizeTheme(value){return THEME_MODES.includes(value)?value:'system';}
export function effectiveTheme(mode,dark){return normalizeTheme(mode)==='system'?(dark?'dark':'light'):mode;}
export function createThemeController({root,storage,media}){
  let mode='system';
  try{mode=normalizeTheme(storage?.getItem('sb-theme'));}catch{}
  function apply(){
    root.dataset.theme=effectiveTheme(mode,!!media?.matches);
    root.dataset.themePreference=mode;
    root.ownerDocument?.querySelector('meta[name="theme-color"]')?.setAttribute('content',root.dataset.theme==='dark'?'#181818':'#f5f5f5');
  }
  const change=()=>{if(mode==='system')apply();};
  media?.addEventListener?.('change',change);apply();
  return {
    get mode(){return mode;},
    set(value){mode=normalizeTheme(value);try{storage?.setItem('sb-theme',mode);}catch{}apply();return mode;},
    destroy(){media?.removeEventListener?.('change',change);}
  };
}
