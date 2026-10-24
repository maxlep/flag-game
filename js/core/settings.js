// js/core/settings.js: The saved settings: SET, loading and setting them (setOpt draws the screen again), the difficulty notes.
// Needs before it at load time: nothing (setOpt calls render, in ui/router.js, when it runs).

// ---------- SETTINGS ----------
const SKEY="flaglore.settings";
let SET={len:10,diff:"medium",dir:"name",pace:"learn",scope:"countries",variant:"national"};
function loadSet(){try{const s=localStorage.getItem(SKEY);if(s)SET=Object.assign(SET,JSON.parse(s))}catch(e){}}
const TYPED=d=>d==="expert"||d==="master";
function setOpt(k,v){SET[k]=v;try{localStorage.setItem(SKEY,JSON.stringify(SET))}catch(e){}render()}
const DIFF={easy:"Options come from anywhere in the world. Good for a first pass; earns no points.",medium:"Options come from the same region. +1 point per correct answer.",hard:"Options are the flags most often confused with this one. +2 per correct answer.",expert:"No options. Type the country; close spellings and common names count. +3 per correct answer.",master:"Type the exact name, with no suggestions or typo help. Common names still count. +4: one correct answer marks the flag learned."};
