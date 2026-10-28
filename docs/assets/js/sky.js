// 히어로 배경: WebGL 노을. 스크롤하면 해가 진다. WebGL 이 없으면 CSS 그라디언트가 남는다.
(() => {
  const cv = document.getElementById('sky');
  const gl = cv && cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `
precision highp float;
uniform vec2 R; uniform float T; uniform float S; uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
vec3 sky(float y,float sun){
  // y: 지평선 0 → 위 1
  vec3 top=vec3(.047,.039,.114), mid=vec3(.24,.11,.36), low=vec3(.88,.32,.45), hor=vec3(1.,.66,.32);
  vec3 c=mix(hor,low,smoothstep(0.,.16,y));
  c=mix(c,mid,smoothstep(.12,.5,y));
  c=mix(c,top,smoothstep(.45,1.,y));
  return mix(c, c*vec3(.55,.5,.75), S*.8); // 해가 지면 어두워진다
}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y;
  float horizon=.24;
  vec2 sunP=vec2(.5+M.x*.04, horizon+.045-S*.12);
  float mn=min(R.x,R.y);
  vec2 d=(uv-sunP)*R/mn;
  float r=length(d);
  vec3 col;
  if(uv.y>horizon){
    float y=(uv.y-horizon)/(1.-horizon);
    col=sky(y,0.);
    // 구름 띠: 해 쪽이 밝게 물든다
    float cl=fbm(vec2(uv.x*asp*1.6+T*.012, uv.y*7.5));
    float band=smoothstep(.52,.78,cl)*smoothstep(.75,.18,y)*smoothstep(0.,.08,y);
    vec3 lit=mix(vec3(.55,.2,.42),vec3(1.,.62,.45),exp(-r*2.4));
    col=mix(col,lit,band*.75);
    // 해
    float disc=smoothstep(.072,.067,r);
    col+=vec3(1.,.55,.3)*exp(-r*5.)*.6*(1.-S*.5)+vec3(1.,.8,.5)*exp(-r*18.)*.5;
    col=mix(col,vec3(1.,.93,.78),disc); // 지평선 밑은 수면 쪽이라 저절로 잘린다
    // 별
    float st=step(.9975,h(floor(gl_FragCoord.xy*.5)))*smoothstep(.45,1.,y)*(.3+.7*S);
    col+=st*(.6+.4*sin(T*2.+h(floor(gl_FragCoord.xy*.5))*40.));
  } else {
    // 수면: 반사 + 물결 + 원근 격자
    float depth=(horizon-uv.y)/horizon; // 0 지평선 → 1 아래
    float z=1./(depth+.04);
    vec2 w=vec2(uv.x*asp*z*.25, z*.9-T*.35);
    float rip=(n(w*vec2(1.,6.))-.5)*.035*depth;
    float ry=horizon+(horizon-uv.y)+rip;
    vec2 dr=vec2((uv.x+rip*.6-sunP.x)*R.x, (ry-sunP.y)*R.y)/mn;
    float rr=length(dr*vec2(1.,.5));
    col=sky((ry-horizon)/(1.-horizon),0.)*.55;
    float streak=exp(-abs(dr.x)*9.)*smoothstep(.0,.9,n(vec2(uv.x*asp*40.,z*6.-T*.6)));
    col+=vec3(1.,.6,.33)*(exp(-rr*4.)*.55+streak*.55*(1.-depth*.4))*(1.-S*.6);
    // 격자 (머신비전 느낌)
    float gx=abs(fract((uv.x-.5)*asp*z*.9)-.5), gz=abs(fract(z*.6-T*.08)-.5);
    float g=(smoothstep(.02*z,0.,gx*1.)+smoothstep(.02*z,0.,gz))*smoothstep(.05,.5,depth)*.12;
    col+=vec3(1.,.55,.5)*g;
    col*=mix(1.,.35,depth);
  }
  // 지평선 빛
  col+=vec3(1.,.55,.35)*exp(-abs(uv.y-horizon)*90.)*.5*(1.-S*.4);
  // 스캔 라인
  float sl=fract(T*.06); col+=vec3(1.,.75,.55)*exp(-abs(uv.y-sl)*400.)*.05;
  // 비네트 + 디더
  vec2 q=uv-.5; col*=1.-dot(q,q)*.6;
  col+=(h(gl_FragCoord.xy+T)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(pr)); return; }
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uS = gl.getUniformLocation(pr, 'S'), uM = gl.getUniformLocation(pr, 'M');

  let mx = 0, tmx = 0, visible = true;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; }, { passive: true });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(cv);
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 1.25);
    cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
  }
  addEventListener('resize', size); size();
  const t0 = performance.now();
  function frame(now) {
    mx += (tmx - mx) * .04;
    const s = Math.min(1, scrollY / (innerHeight * .9));
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, reduce ? 20 : (now - t0) / 1000);
    gl.uniform1f(uS, s); gl.uniform2f(uM, mx, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (reduce) addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
})();
