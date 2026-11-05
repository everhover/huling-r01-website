/* R01 photo study, silver only. Geometry is in units of 9.9 mm.
 * The five supplied photographs define structure; feature sizes remain estimates.
 * No third-party runtime, remote textures or continuous animation loop.
 */
function createRingRenderer(canvas, options = {}) {
  const refined = options.refined === true;
  const unitMm = 9.9;
  const dimensions = { widthMm: 7.5, thicknessMm: 2.5, innerDiameterMm: 17.3, buttonDiameterMm: 4.6 };
  const innerRadius = dimensions.innerDiameterMm / 2 / unitMm;
  const outerRadius = (dimensions.innerDiameterMm / 2 + dimensions.thicknessMm) / unitMm;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) {
    const fallback = document.createElement('img');
    fallback.src = refined ? 'assets/r01-silver-refined-fallback.png' : 'assets/r01-silver-fallback.png';
    fallback.alt = '乎零 R01 银色戒指三维模型预览';
    fallback.className = 'ring-fallback';
    canvas.style.visibility = 'hidden';
    canvas.after(fallback);
    canvas.dataset.renderer = 'static-fallback';
    return {
      available: true,
      resize() {},
      draw(view,width,height) {
        const size=Math.min(width,height)*view.size/.32;
        Object.assign(fallback.style,{
          width:`${size}px`,height:`${size}px`,
          left:`${canvas.offsetLeft+width*view.x-size/2}px`,
          top:`${canvas.offsetTop+height*view.y-size/2}px`,
          opacity:String(view.opacity),transform:canvas.style.transform
        });
      }
    };
  }
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aDetail;
    uniform mat3 uRotation;
    uniform vec2 uViewport;
    uniform vec2 uCenter;
    uniform float uScale;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLocal;
    varying vec3 vDetail;
    void main() {
      vec3 p = uRotation * aPosition;
      float camera = 5.0 - p.z;
      vec2 center = vec2(uCenter.x * 2.0 / uViewport.x - 1.0, 1.0 - uCenter.y * 2.0 / uViewport.y);
      vec2 offset = vec2(p.x, -p.y) * uScale * 10.0 / uViewport;
      gl_Position = vec4(center * camera + offset, -p.z * .3, camera);
      vPosition = p;
      vNormal = normalize(uRotation * aNormal);
      vLocal = aPosition;
      vDetail = aDetail;
    }
  `;
  const fragmentSource = `
    precision highp float;
    uniform float uOpacity;
    uniform float uLed;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLocal;
    varying vec3 vDetail;
    const float PI = 3.14159265359;
    const bool refined = ${refined ? 'true' : 'false'};
    float angularDistance(float a, float b) { return atan(sin(a-b),cos(a-b)); }
    float noise(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    float roundedBox(vec2 p, vec2 b, float r) {
      vec2 q = abs(p)-b+vec2(r);
      return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;
    }
    vec3 environment(vec3 r, float roughness) {
      if (refined) {
        // Metallic surfaces reflect bright studio panels separated by dark cards.
        float width=.035+roughness*.30;
        float left=exp(-pow(abs((r.x+.48)/width),3.0))*smoothstep(-.8,.25,r.z);
        float right=exp(-pow(abs((r.x-.72)/(.025+roughness*.20)),3.0));
        float ceiling=smoothstep(.10,.65,-r.y)*(1.0-smoothstep(.65,.95,abs(r.x)));
        float soft=pow(max(0.0,dot(r,normalize(vec3(-.6,-.8,1.4)))),mix(110.0,9.0,roughness));
        float darkCard=1.0-.8*exp(-pow((r.x-.12)/(.10+roughness*.1),2.0));
        return vec3((.025+2.8*left+1.6*right+1.15*ceiling+1.2*soft)*darkCard);
      }
      // Original study lighting stays available to the scroll prototype.
      float broad = pow(max(0.0,dot(r,normalize(vec3(-.6,-.8,1.4)))),mix(90.0,7.0,roughness));
      float strip = exp(-pow((r.x+.39)*mix(28.0,4.0,roughness),2.0)) * smoothstep(-.7,.6,r.z);
      float rim = pow(max(0.0,dot(r,normalize(vec3(.9,.4,.5)))),mix(120.0,10.0,roughness));
      float ceiling = smoothstep(-.35,.7,-r.y);
      return vec3(.13 + .15*ceiling + .95*broad + .62*strip + .42*rim);
    }
    void main() {
      float material = vDetail.x;
      float theta = atan(vLocal.y,vLocal.x);
      // Apertures are removed from the actual outer metal, with recessed parts below.
      if (material < .5) {
        vec2 mic = vec2(angularDistance(theta,-.87)*1.126,vLocal.z);
        vec2 led = vec2(angularDistance(theta,-1.06)*1.126,vLocal.z);
        bool microphoneOpening = refined
          ? roundedBox(mic,vec2(.079*1.35,.079),.079*.94)<0.0
          : length(mic)<.079;
        if (microphoneOpening || length(led)<.026) discard;
      }
      if ((material>6.5 && material<7.5) || material>10.5) {
        if (roundedBox(vDetail.yz,vec2(1.0),.24)>0.0) discard;
      }
      vec3 n=normalize(vNormal);
      if (refined && material<.5) {
        vec3 microNormal=vec3(noise(vLocal*360.0),noise(vLocal.yzx*360.0),noise(vLocal.zxy*360.0))-.5;
        n=normalize(n+microNormal*.025);
      }
      vec3 eye=normalize(vec3(0.0,0.0,5.0)-vPosition);
      vec3 reflected=reflect(-eye,n);
      float diffuse=max(0.0,dot(n,normalize(vec3(-.45,-.7,1.2))));
      float fill=max(0.0,dot(n,normalize(vec3(.9,.4,.5))));
      float fresnel=pow(1.0-max(0.0,dot(n,eye)),4.0);
      float roughness=.6;
      vec3 base=vec3(.57,.58,.59);
      if (material>.5 && material<1.5) { roughness=.08; base=vec3(.73,.74,.75); }
      if (material>1.5 && material<2.5) { roughness=.27; base=vec3(.62,.63,.64); }
      if (material>2.5 && material<3.5) { roughness=.7; base=vec3(.045); }
      if (material>3.5 && material<4.5) { roughness=.43; base=vec3(.63,.64,.65); }
      vec3 light=base*(.23+.53*diffuse+.13*fill)+environment(reflected,roughness)*(.32+.18*fresnel);
      if (refined) {
        roughness=.62;
        if (material>.5 && material<1.5) roughness=.19;
        if (material>1.5 && material<2.5) roughness=.30;
        if (material>3.5 && material<4.5) roughness=.28;
        vec3 metalReflection=environment(reflected,roughness)*vec3(.91,.925,.94);
        light=metalReflection+vec3(.015*diffuse+.008*fill);
        if (material<.5) light=metalReflection*.62+vec3(.13+.08*diffuse+.02*fill);
        if (material>.5 && material<1.5) light=metalReflection*.60+vec3(.085+.06*diffuse);
        if (material>1.5 && material<2.5) light=metalReflection*.48+vec3(.12+.08*diffuse);
        if (material>3.5 && material<4.5) light=metalReflection*.65+vec3(.12+.06*diffuse);
        if (material>2.5 && material<3.5) light=vec3(.012);
      }
      float grain=noise(vLocal*550.0)-.5;
      if (material<.5 || (material>3.5 && material<4.5)) light+=grain*(refined ? .038 : .045);
      if (material>1.5 && material<2.5) {
        float brushed=sin(vLocal.z*1800.0+sin(theta*500.0))*.003;
        light+=brushed;
        if (refined) light+=(noise(vec3(theta*160.0,vLocal.z*1900.0,0.0))-.5)*.012;
      }
      if (material>4.5 && material<5.5) {
        // Woven microphone mesh, a dark recessed opening with thin crossing wires.
        vec2 grid=abs(fract(vDetail.yz*46.0)-.5);
        float wire=1.0-smoothstep(.055,.12,min(grid.x,grid.y));
        light=vec3(.035)+vec3(.22)*wire+diffuse*.05;
      }
      if (material>5.5 && material<6.5) light=mix(vec3(.06),vec3(1.0),uLed);
      if (material>6.5 && material<7.5) light=vec3(.012,.018,.023)+environment(reflected,.12)*.08;
      if (material>7.5 && material<8.5) {
        light=vec3(.42,.32,.13)*(.65+.35*diffuse);
        float circuit=step(.8,fract(vDetail.y*10.0))*step(.4,fract(vDetail.z*10.0));
        light+=circuit*.1;
      }
      if (material>8.5 && material<9.5) light=vec3(.025)+environment(reflected,.25)*.025;
      if (material>9.5 && material<10.5) {
        light=vec3(.025,.045,.045)+environment(reflected,.09)*.12;
        light+=vec3(.04,.08,.06)*pow(max(0.0,dot(n,eye)),8.0);
      }
      if (material>10.5) light=vec3(.36)+environment(reflected,.14)*.3;
      if (refined && (material<2.5 || (material>3.5 && material<4.5))) {
        light=light/(vec3(1.0)+light);
        light=pow(max(light,vec3(0.0)),vec3(1.0/2.2));
      } else {
        light=pow(max(light,vec3(0.0)),vec3(.88));
      }
      gl_FragColor=vec4(light*uOpacity,uOpacity);
    }
  `;
  function compile(type, source) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const positions=[];
  const normals=[];
  const details=[];
  function vertex(position,normal,detail) {
    positions.push(...position); normals.push(...normal); details.push(...detail);
  }
  function triangle(a,b,c) { for(const v of [a,b,c]) vertex(...v); }
  function normalize(v) { const length=Math.hypot(...v); return v.map(x=>x/length); }
  function lathe(profile, material, segments=256) {
    if (refined) {
      // Calibrate the body, not the round controls, so buttons stay circular.
      profile=profile.map(([radius,z])=>[
        innerRadius+(radius-.874)/(.252)*(outerRadius-innerRadius),
        z*(dimensions.widthMm/2/unitMm)/.386
      ]);
    }
    const edgeNormals=profile.slice(0,-1).map((point,index)=> {
      const next=profile[index+1];
      return normalize([next[1]-point[1],point[0]-next[0]]);
    });
    const profileNormals=profile.map((point,index)=> {
      const before=edgeNormals[Math.max(0,index-1)];
      const after=edgeNormals[Math.min(index,edgeNormals.length-1)];
      return normalize([before[0]+after[0],before[1]+after[1]]);
    });
    for(let j=0;j<profile.length-1;j++) {
      const [r0,z0]=profile[j];
      const [r1,z1]=profile[j+1];
      for(let i=0;i<segments;i++) {
        const t0=i/segments*Math.PI*2;
        const t1=(i+1)/segments*Math.PI*2;
        const at=(r,z,t,n)=>[[r*Math.cos(t),r*Math.sin(t),z],[n[0]*Math.cos(t),n[0]*Math.sin(t),n[1]],[material,0,0]];
        const crispFold=refined && material===1 && j>=2;
        const startNormal=crispFold ? edgeNormals[j] : profileNormals[j];
        const endNormal=crispFold ? edgeNormals[j] : profileNormals[j+1];
        const a=at(r0,z0,t0,startNormal), b=at(r0,z0,t1,startNormal);
        const c=at(r1,z1,t1,endNormal), d=at(r1,z1,t0,endNormal);
        triangle(a,b,c);triangle(a,c,d);
      }
    }
  }
  // Separate alloy shell, black assembly seam, polished rim and folded steel liner.
  lathe([[1.105,-.379],[1.12,-.37],[1.126,-.351],[1.126,.351],[1.12,.37],[1.105,.379]],0);
  lathe([[1.105,.379],[1.092,.381],[1.083,.379]],3);
  lathe([[1.105,-.379],[1.092,-.381],[1.083,-.379]],3);
  if (refined) {
    // Photo detail: a narrow rolled lip, one broad machined chamfer, then a small inward fold.
    const frontLip=[[1.083,.379],[1.069,.386],[1.045,.386],[1.039,.381],[.903,.283],[.887,.258],[.881,.248]];
    lathe(frontLip,1);
    lathe(frontLip.map(([r,z])=>[r,-z]).reverse(),1);
    lathe([[.881,.248],[.875,.23],[.874,-.23],[.881,-.248]],2);
  } else {
    lathe([[1.083,.379],[1.064,.386],[1.025,.386],[.974,.367],[.934,.334],[.898,.284],[.881,.252]],1);
    lathe([[.881,-.252],[.898,-.284],[.934,-.334],[.974,-.367],[1.025,-.386],[1.064,-.386],[1.083,-.379]],1);
    lathe([[.881,.252],[.875,.23],[.874,-.23],[.881,-.252]],2);
  }

  // Feature contours are tangent to the band; the microphone has real straight sides.
  function contour(angle,radius,aspect,rounded) {
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    if (!rounded) return [cosine*radius*aspect,sine*radius];
    const corner=radius*.94;
    return [Math.sign(cosine)*(radius*aspect-corner)+corner*cosine,
      Math.sign(sine)*(radius-corner)+corner*sine];
  }
  function disk(theta, radius, distance, material, steps=80, aspect=1, rounded=false) {
    const normal=[Math.cos(theta),Math.sin(theta),0];
    const tangent=[-Math.sin(theta),Math.cos(theta),0];
    const point=(x,y)=>[[normal[0]*distance+tangent[0]*x,normal[1]*distance+tangent[1]*x,y],normal,[material,x,y]];
    for(let i=0;i<steps;i++) {
      const a=i/steps*Math.PI*2,b=(i+1)/steps*Math.PI*2;
      triangle(point(0,0),point(...contour(a,radius,aspect,rounded)),point(...contour(b,radius,aspect,rounded)));
    }
  }
  function bevel(theta, profile, material, steps=80, aspect=1, rounded=false) {
    const radial=[Math.cos(theta),Math.sin(theta),0];
    const tangent=[-Math.sin(theta),Math.cos(theta),0];
    for(let j=0;j<profile.length-1;j++) {
      const [r0,d0]=profile[j], [r1,d1]=profile[j+1];
      const direction=normalize([d1-d0,r0-r1]);
      const point=(r,d,t)=> {
        const [x,y]=contour(t,r,aspect,rounded);
        return [[radial[0]*d+tangent[0]*x,radial[1]*d+tangent[1]*x,y],normalize([radial[0]*direction[1]+tangent[0]*Math.cos(t)*direction[0],radial[1]*direction[1]+tangent[1]*Math.cos(t)*direction[0],Math.sin(t)*direction[0]]),[material,x,y]];
      };
      for(let i=0;i<steps;i++) {
        const a=i/steps*Math.PI*2,b=(i+1)/steps*Math.PI*2;
        const p=point(r0,d0,a),q=point(r0,d0,b),r=point(r1,d1,b),s=point(r1,d1,a);
        triangle(p,q,r);triangle(p,r,s);
      }
    }
  }
  // Refined button diameter is estimated from the user's near-frontal photo.
  const keyAngle=.18;
  if (refined) {
    const buttonRadius=dimensions.buttonDiameterMm/2/unitMm;
    const faceRadius=4.2/2/unitMm;
    disk(keyAngle,buttonRadius,outerRadius+.002,3);
    bevel(keyAngle,[[buttonRadius-.003,outerRadius+.002],[buttonRadius,outerRadius+.011],
      [faceRadius+.006,outerRadius+.021],[faceRadius,outerRadius+.025]],1);
    disk(keyAngle,faceRadius,outerRadius+.025,4);
  } else {
    disk(keyAngle,.184,1.128,3);
    bevel(keyAngle,[[.181,1.128],[.182,1.137],[.173,1.147],[.16,1.151]],1);
    disk(keyAngle,.16,1.151,4);
  }
  const microphoneAspect=refined ? 1.35 : 1;
  bevel(-.87,[[.08,1.126],[.073,1.114],[.071,1.107]],2,80,microphoneAspect,refined);
  disk(-.87,.073,1.105,9,80,microphoneAspect,refined);
  disk(-.87,.07,1.11,5,80,microphoneAspect,refined);
  bevel(-1.06,[[.027,1.126],[.023,1.11]],2,48);
  disk(-1.06,.023,1.111,6,48);

  // Curved, inset sensor windows. Large/small/small/large on the far inner wall.
  function sensorPatch(theta, halfWidth, halfHeight, radius, material, offsetZ=0) {
    const nx=16,ny=12;
    const point=(u,v)=> {
      const t=theta+u*halfWidth/radius;
      return [[radius*Math.cos(t),radius*Math.sin(t),offsetZ+v*halfHeight],[-Math.cos(t),-Math.sin(t),0],[material,u,v]];
    };
    for(let x=0;x<nx;x++) for(let y=0;y<ny;y++) {
      const u=x/nx*2-1,v=y/ny*2-1,du=2/nx,dv=2/ny;
      const a=point(u,v),b=point(u+du,v),c=point(u+du,v+dv),d=point(u,v+dv);
      triangle(a,b,c);triangle(a,c,d);
    }
  }
  const sensors=[{theta:2.15,w:.082,h:.18},{theta:2.65,w:.047,h:.14},{theta:3.15,w:.047,h:.14},{theta:3.65,w:.082,h:.18}];
  sensors.forEach((sensor,index)=> {
    sensorPatch(sensor.theta,sensor.w+.009,sensor.h+.009,.871,11);
    sensorPatch(sensor.theta,sensor.w,sensor.h,.868,7);
    if(index===1 || index===2) {
      sensorPatch(sensor.theta,.022,.044,.864,8,-.042);
      sensorPatch(sensor.theta,.021,.034,.863,10,.049);
    } else {
      sensorPatch(sensor.theta,.051,.126,.864,10);
    }
  });

  const attributes=[['aPosition',positions],['aNormal',normals],['aDetail',details]];
  for(const [name,values] of attributes) {
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
  }
  const uniforms={};
  for(const name of ['uRotation','uViewport','uCenter','uScale','uOpacity','uLed']) uniforms[name]=gl.getUniformLocation(program,name);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0,0,0,0);
  // Identical rotation convention to the original scroll trajectory.
  function rotation(rx,ry,rz) {
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    return new Float32Array([cz*cy,sz*cy,-sy,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx]);
  }
  const vertexCount=positions.length/3;
  canvas.dataset.renderer='webgl-photo-study';
  return {
    available: true,
    resize() { gl.viewport(0,0,canvas.width,canvas.height); },
    draw(view,width,height,led) {
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix3fv(uniforms.uRotation,false,rotation(view.rx,view.ry,view.rz));
      gl.uniform2f(uniforms.uViewport,width,height);
      gl.uniform2f(uniforms.uCenter,width*view.x,height*view.y);
      gl.uniform1f(uniforms.uScale,Math.min(width,height)*view.size);
      gl.uniform1f(uniforms.uOpacity,view.opacity);
      gl.uniform1f(uniforms.uLed,led ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    }
  };
}
