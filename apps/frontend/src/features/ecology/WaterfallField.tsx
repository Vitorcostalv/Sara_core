import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Fall { x:number; y:number; z:number; sx:number; sy:number; sz:number; ry?:number }

/** Shared texture, batched curtains/foam and a small capped mist field. */
export function WaterfallField({falls}: {falls:Fall[]}) {
  const curtains = useRef<THREE.InstancedMesh>(null!);
  const foam = useRef<THREE.InstancedMesh>(null!);
  const selected = useMemo(() => falls.slice().sort((a,b)=>b.sy-a.sy).slice(0,8),[falls]);
  const texture = useMemo(() => {
    const data = new Uint8Array(32*64*4);
    for(let y=0;y<64;y++) for(let x=0;x<32;x++) {
      const i=(y*32+x)*4;
      const stripe=(Math.sin(x*1.7+Math.sin(y*.23))*.5+.5)*.6+(Math.sin(y*.63+x*.4)*.5+.5)*.4;
      data[i]=55+stripe*180; data[i+1]=170+stripe*80; data[i+2]=205+stripe*50; data[i+3]=Math.round((90+stripe*140)*Math.pow(Math.sin(Math.PI*x/31),.7));
    }
    const map=new THREE.DataTexture(data,32,64,THREE.RGBAFormat);
    map.wrapS=map.wrapT=THREE.RepeatWrapping; map.magFilter=map.minFilter=THREE.LinearFilter;
    map.colorSpace=THREE.SRGBColorSpace; map.needsUpdate=true;
    return map;
  },[]);
  const mist = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(selected.length*6*3),3));
    return geometry;
  },[selected]);
  useEffect(()=>()=>{texture.dispose();},[texture]);
  useEffect(()=>()=>{mist.dispose();},[mist]);
  useLayoutEffect(()=>{
    const object=new THREE.Object3D();
    selected.forEach((fall,i)=>{
      object.position.set(fall.x,fall.y,fall.z); object.rotation.set(0,fall.ry??0,0); object.scale.set(fall.sx,fall.sy,Math.max(.07,fall.sz)); object.updateMatrix();
      curtains.current.setMatrixAt(i,object.matrix);
      object.position.y=fall.y-fall.sy/2+.035; object.rotation.set(0,0,0); object.scale.set(fall.sx*.85,.045,fall.sx*.48); object.updateMatrix();
      foam.current.setMatrixAt(i,object.matrix);
    });
    for(const mesh of [curtains.current,foam.current]) {mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  },[selected]);
  useFrame(({clock},delta)=>{
    texture.offset.y=(texture.offset.y+Math.min(delta,.1)*.8)%1;
    const positions=mist.getAttribute("position") as THREE.BufferAttribute;
    selected.forEach((fall,i)=>{
      for(let p=0;p<6;p++) {
        const phase=(clock.elapsedTime*.45+p/6+i*.137)%1;
        const angle=p*2.4+i;
        positions.setXYZ(i*6+p,fall.x+Math.cos(angle)*phase*fall.sx*.65,fall.y-fall.sy/2+.08+phase*.55,fall.z+Math.sin(angle)*phase*fall.sx*.65);
      }
    });
    positions.needsUpdate=true;
  });
  return <group>
    <instancedMesh ref={curtains} args={[undefined,undefined,Math.max(1,selected.length)]} count={selected.length}>
      <planeGeometry args={[1,1]} />
      <meshStandardMaterial map={texture} transparent opacity={.72} side={THREE.DoubleSide} alphaTest={.12} roughness={.32} emissive="#238899" emissiveIntensity={.35} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={foam} args={[undefined,undefined,Math.max(1,selected.length)]} count={selected.length}>
      <sphereGeometry args={[1,6,4]} />
      <meshBasicMaterial color="#ecfbfa" transparent opacity={.72} depthWrite={false} />
    </instancedMesh>
    <points geometry={mist} frustumCulled={false}>
      <pointsMaterial color="#e9ffff" size={.09} transparent opacity={.35} depthWrite={false} />
    </points>
  </group>;
}
