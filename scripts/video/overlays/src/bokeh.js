// Procedural warm city-light bokeh. Periodic in t with period 10 s, so frame N == frame 0.
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeBokeh(canvas,{seed=20261105,gain=1}={}){
  const W=1920,H=1080;canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});
  const rnd=mulberry(seed);
  const COLORS=[[255,178,96],[255,214,160],[255,146,72],[255,190,120],[240,120,92],[255,226,186],[120,176,184]];
  const WEIGHTS=[.30,.20,.20,.12,.08,.07,.03];
  const pick=()=>{let r=rnd();for(let i=0;i<COLORS.length;i++){r-=WEIGHTS[i];if(r<=0)return i}return 0};
  // Lens-disc sprite: flat body, slightly brighter rim, soft edge. soft raises the blur of the edge.
  function sprite(c,soft){
    const s=document.createElement('canvas');s.width=s.height=256;const g=s.getContext('2d');
    const rg=g.createRadialGradient(128,128,0,128,128,128);
    const [r,gr,b]=c;const col=a=>`rgba(${r},${gr},${b},${a})`;
    rg.addColorStop(0,col(.62));rg.addColorStop(.6,col(.68));
    rg.addColorStop(Math.max(.62,.88-soft),col(.92));
    rg.addColorStop(.965-soft*.4,col(.72));rg.addColorStop(1,col(0));
    g.fillStyle=rg;g.fillRect(0,0,256,256);return s;
  }
  const sprites=[.0,.12,.3].map(soft=>COLORS.map(c=>sprite(c,soft)));
  // Layers: far (small, many, slow), mid, near (big, few, fast) for parallax.
  const LAYERS=[
    {n:120,rMin:7,rMax:20,alpha:.34,vx:-5,vy:-1.0,soft:0},
    {n:70,rMin:22,rMax:50,alpha:.20,vx:-13,vy:-2.5,soft:1},
    {n:26,rMin:62,rMax:128,alpha:.085,vx:-28,vy:-5,soft:2},
    {n:9,rMin:150,rMax:240,alpha:.04,vx:-44,vy:-8,soft:2},
  ];
  const parts=[];
  LAYERS.forEach((L,li)=>{
    for(let i=0;i<L.n;i++){
      // Lights cluster around a low horizon band, like a street seen through a window.
      const yb=(rnd()+rnd()+rnd())/3;
      parts.push({
        li,x:-120+rnd()*(W+240),y:-60+(H+120)*(.12+yb*.98),
        r:L.rMin+Math.pow(rnd(),1.4)*(L.rMax-L.rMin),c:pick(),a:L.alpha*(.55+rnd()*.75),
        off:rnd(),tw:1+Math.floor(rnd()*3),twP:rnd(),vx:L.vx*(.85+rnd()*.3),vy:L.vy*(.7+rnd()*.6),soft:L.soft
      });
    }
  });
  const vignette=ctx.createRadialGradient(W*.52,H*.48,H*.28,W*.52,H*.48,H*1.16);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.6,'rgba(4,2,2,.34)');vignette.addColorStop(1,'rgba(2,1,1,.86)');
  const base=ctx.createLinearGradient(0,0,0,H);
  base.addColorStop(0,'#0b0808');base.addColorStop(.55,'#150e0b');base.addColorStop(1,'#0d0908');
  const glow=ctx.createRadialGradient(W*.62,H*.72,0,W*.62,H*.72,H*.9);
  glow.addColorStop(0,'rgba(120,62,28,.22)');glow.addColorStop(1,'rgba(120,62,28,0)');
  // t: scene time (only t mod 10 matters).
  return function draw(t){
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(const p of parts){
      const ph=((t/10+p.off)%1+1)%1;
      const env=Math.pow(Math.sin(Math.PI*ph),1.15);
      const tw=1+.24*Math.sin(TAU*(p.tw*t/10+p.twP));
      const a=p.a*env*tw*gain;if(a<.002)continue;
      const dt=(ph-.5)*10;
      const x=p.x+p.vx*dt,y=p.y+p.vy*dt,d=p.r*2;
      ctx.globalAlpha=Math.min(1,a);
      ctx.drawImage(sprites[p.soft][p.c],x-p.r,y-p.r,d,d);
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    // Grain is added by ffmpeg at encode time (see render.mjs), which keeps PNG capture fast.
  };
}
