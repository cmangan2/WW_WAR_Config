/* ----- side-view drawing (scale: 25 px per inch, receiver face at x=478) ----- */
function drawRifle(b){
  const S=25, F=478, C=opt("finish",b).color, P="var(--poly)", ST="var(--steel)";
  const bar=opt("barrel",b), hg=opt("handguard",b), barEnd=F+bar.len*S;
  const g=[];
  const R=(x,y,w,h,f,extra="")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;

  // stock
  const st=b.stock;
  if(st==="a2s"){
    g.push(`<path d="M44,104 L292,112 L292,140 L64,200 L44,200 Z" fill="${P}"/>`, R(34,100,12,104,P,'rx="3"'));
  } else {
    g.push(R(168,113,126,15,ST));
    if(st==="sop"){
      g.push(`<path d="M150,98 L268,107 L268,136 L234,146 L150,198 Z" fill="${P}"/>`, R(176,96,74,16,P,'rx="4"'), R(142,96,12,106,P,'rx="3"'));
    } else {
      g.push(`<path d="M160,102 L265,110 L265,132 L232,140 L160,194 Z" fill="${P}"/>`, R(152,100,10,96,P,'rx="3"'));
    }
  }
  // barrel
  g.push(R(F,124,barEnd-F,12,ST));
  // muzzle device
  const m=b.muzzle, mx=barEnd;
  if(m==="a2") g.push(R(mx,121,54,18,ST,'rx="2"'), ...[12,24,36].map(d=>R(mx+d,121,5,7,"var(--stage)")));
  if(m==="tri") g.push(R(mx,122,18,16,ST), R(mx+18,121,40,4,ST), R(mx+18,128,40,4,ST), R(mx+18,135,40,4,ST));
  if(m==="comp") g.push(R(mx,119,56,22,ST,'rx="3"'), ...[14,26,38].map(d=>R(mx+d,119,6,9,"var(--stage)")));
  if(m==="qd") g.push(R(mx,120,50,20,ST,'rx="3"'), R(mx+4,118,10,24,ST,'rx="2"'));
  if(bar.pinned) g.push(`<circle cx="${mx+4}" cy="130" r="2.5" fill="var(--warn)"/>`);
  // handguard
  if(hg.ff){
    const x2=F+hg.len*S;
    g.push(R(F,102,x2-F,50,C,'rx="6"'), R(F,97,x2-F,6,C), ...Array.from({length:Math.floor((x2-F-30)/44)},(_,i)=>R(F+24+i*44,132,26,8,"rgba(0,0,0,.35)",'rx="4"')));
    for(let x=F+4;x<x2-6;x+=10) g.push(R(x,96,5,3,"rgba(0,0,0,.35)"));
    if(b.front==="bu") g.push(`<path d="M${x2-34},96 L${x2-10},96 L${x2-16},74 L${x2-28},74 Z" fill="${P}"/>`, R(x2-24,66,4,10,P));
  } else {
    const x2=F+hg.len*S;
    g.push(R(F,106,10,48,ST), R(F+10,110,x2-F-10,40,P,'rx="10"'));
    for(let x=F+24;x<x2-12;x+=18) g.push(R(x,114,4,32,"rgba(255,255,255,.06)"));
    const fx=x2+6;
    g.push(R(fx,120,22,22,C), `<path d="M${fx+2},121 L${fx+20},121 L${fx+14},86 L${fx+8},86 Z" fill="${C}"/>`, R(fx+9,78,4,10,C));
  }
  // upper receiver + rail
  g.push(R(290,104,F-290,24,C), R(294,98,F-298,7,C), R(384,110,48,10,"rgba(0,0,0,.4)",'rx="2"'), `<circle cx="462" cy="118" r="6" fill="rgba(0,0,0,.25)"/>`);
  for(let x=297;x<F-8;x+=10) g.push(R(x,97,5,3,"rgba(0,0,0,.35)"));
  g.push(R(280,106,12,8,ST));
  if(b.ch==="ambi") g.push(R(274,102,8,16,ST,'rx="2"'));
  // lower receiver, magazine, grip, trigger
  g.push(`<path d="M290,128 L478,128 L478,150 L415,150 L412,180 L358,180 L352,150 L300,150 Z" fill="${C}"/>`);
  g.push(`<path d="M362,180 L410,180 Q418,236 442,266 L394,280 Q372,236 362,180 Z" fill="${P}"/>`);
  g.push(`<path d="M332,150 L332,170 Q334,176 356,174 L356,150" fill="none" stroke="${C}" stroke-width="4"/>`);
  g.push(`<path d="M340,150 Q342,160 338,166" fill="none" stroke="${b.trigger==="mil"?ST:"var(--accent)"}" stroke-width="3"/>`);
  const grips={a2:"M302,150 L332,150 L308,226 L284,222 Z", ergo:"M300,150 L334,150 L314,229 Q300,234 284,226 Z", vert:"M304,150 L334,150 L324,228 L298,228 Z"};
  g.push(`<path d="${grips[b.grip]}" fill="${P}"/>`);
  // rear sight (folded when an optic is mounted)
  if(b.rear==="bu"){
    if(b.optic==="none") g.push(`<path d="M298,97 L324,97 L318,74 L304,74 Z" fill="${P}"/>`);
    else g.push(R(298,90,26,7,P,'rx="2"'));
  }
  // optics
  const o=b.optic;
  if(o==="rd"){
    g.push(R(418,82,44,15,P), R(414,54,52,30,P,'rx="8"'), `<circle cx="440" cy="68" r="7" fill="var(--accent)" opacity=".7"/>`);
    if(b.magnifier==="mag3") g.push(R(352,84,40,13,P), R(338,58,66,28,P,'rx="10"'));
  }
  if(o==="lp6"||o==="lp8"){
    const t=o==="lp8"?12:10;
    g.push(R(350,80,24,17,P), R(424,80,24,17,P), R(336,72-t,140,2*t,P,'rx="4"'), R(470,56,40,32,P,'rx="6"'), R(306,58,36,28,P,'rx="6"'), R(392,58-t+12,18,10,P,'rx="2"'));
  }
  return g.join("");
}

