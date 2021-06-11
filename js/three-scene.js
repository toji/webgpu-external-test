import * as THREE from 'three';

// Set up a small Three.js scene
export class ThreeScene {
  constructor() {
    //

    this.camera = new THREE.PerspectiveCamera( 27, window.innerWidth / window.innerHeight, 1, 3500 );
    this.camera.position.z = 2750;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0x000500 );
    this.scene.fog = new THREE.Fog( 0x000500, 2000, 3500 );

    //

    this.scene.add( new THREE.AmbientLight( 0x444444 ) );

    const light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light1.position.set( 1, 1, 1 );
    this.scene.add( light1 );

    const light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
    light2.position.set( 0, - 1, 0 );
    this.scene.add( light2 );

    //

    const triangles = 160000;

    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const normals = [];
    const colors = [];

    const color = new THREE.Color();

    const n = 800, n2 = n / 2;	// triangles spread in the cube
    const d = 12, d2 = d / 2;	// individual triangle size

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();

    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    for ( let i = 0; i < triangles; i ++ ) {

      // positions

      const x = Math.random() * n - n2;
      const y = Math.random() * n - n2;
      const z = Math.random() * n - n2;

      const ax = x + Math.random() * d - d2;
      const ay = y + Math.random() * d - d2;
      const az = z + Math.random() * d - d2;

      const bx = x + Math.random() * d - d2;
      const by = y + Math.random() * d - d2;
      const bz = z + Math.random() * d - d2;

      const cx = x + Math.random() * d - d2;
      const cy = y + Math.random() * d - d2;
      const cz = z + Math.random() * d - d2;

      positions.push( ax, ay, az );
      positions.push( bx, by, bz );
      positions.push( cx, cy, cz );

      // flat face normals

      pA.set( ax, ay, az );
      pB.set( bx, by, bz );
      pC.set( cx, cy, cz );

      cb.subVectors( pC, pB );
      ab.subVectors( pA, pB );
      cb.cross( ab );

      cb.normalize();

      const nx = cb.x;
      const ny = cb.y;
      const nz = cb.z;

      normals.push( nx, ny, nz );
      normals.push( nx, ny, nz );
      normals.push( nx, ny, nz );

      // colors

      const vx = ( x / n ) + 0.5;
      const vy = ( y / n ) + 0.5;
      const vz = ( z / n ) + 0.5;

      color.setRGB( vx, vy, vz );

      const alpha = Math.random();

      colors.push( color.r, color.g, color.b, alpha );
      colors.push( color.r, color.g, color.b, alpha );
      colors.push( color.r, color.g, color.b, alpha );

    }

    function disposeArray() {

      this.array = null;

    }

    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ).onUpload( disposeArray ) );
    geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ).onUpload( disposeArray ) );
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 4 ).onUpload( disposeArray ) );

    geometry.computeBoundingSphere();

    const material = new THREE.MeshPhongMaterial( {
      color: 0xaaaaaa, specular: 0xffffff, shininess: 250,
      side: THREE.DoubleSide, vertexColors: true, transparent: true
    } );

    this.mesh = new THREE.Mesh( geometry, material );
    this.scene.add( this.mesh );

    //

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    //

    window.addEventListener( 'resize', () => { this.onResize(); } );
    this.onResize();
  }

  get canvas() {

    return this.renderer.domElement;

  }

  onResize() {
    const width = window.innerWidth * 0.5;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( width, height );

  }

  render() {

    const time = Date.now() * 0.001;

    this.mesh.rotation.x = time * 0.25;
    this.mesh.rotation.y = time * 0.5;

    this.renderer.render( this.scene, this.camera );

  }
}