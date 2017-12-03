var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

const bkgMusic = document.getElementById("music");
bkgMusic.pause();
bkgMusic.currentTime = 0;
bkgMusic.volume = 0.75;

// const loopMusic = document.getElementById("loop");
// loopMusic.pause();
// loopMusic.currentTime = 0;
// loopMusic.volume = 0.1;


var restart = false;

var voice = document.getElementById("voice");
voice.pause();
voice.currentTime = 0;

const idles = [0,5];
const walks = [7,8];
const talks = [2,3];

const dialogs = [
	{
		track: "clips/weird.mp3",
		anim: "drawings/mustard_3.json",
		delay: 2000,
		end: 2000
	},
	{
		track: "clips/afterlife.mp3",
		anim: "drawings/hotdog_angel.json",
		delay: 3000,
		end: 2000
	},
	{
		track: "clips/imagination.mp3",
		anim: "drawings/liens.json",
		delay: 2000,
		end: 2000
	},
	{
		track: "clips/sinners.mp3",
		anim: "drawings/hell_hotdog.json",
		delay: 2000,
		end: 2000
	},
	{
		track: "clips/blacksky.mp3",
		anim: "drawings/moon.json",
		delay: 2000,
		end: 2000
	}
];
let currentDialog = 0;
let time;
let nextClip = true;

var width = window.innerWidth, height = window.innerHeight;
var lines = document.getElementById('lines');

var container, camera, scene, renderer, controls;
var linesTexture; /* texture gets updated */
var clock, mixer;
var listener, voiceSound, voiceSource, audioLoader;

let char;

init();

function init() {
	container = document.getElementById( 'container' );

	clock = new THREE.Clock();
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);
    renderer.gammaInput = true;
	renderer.gammaOutput = true;
	effect = new THREE.OutlineEffect( renderer, {
		defaultThickNess: 1,
		defaultColor: new THREE.Color( 0xffffff )
	} );

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
	controls = new THREE.DeviceOrientationControls( camera );
	camera.position.z = 5;
	camera.ySpeed = 0;

	listener = new THREE.AudioListener();
	camera.add(listener);
	audioLoader = new THREE.AudioLoader();
	voiceSound = new THREE.PositionalAudio(listener);

	// var light = new THREE.HemisphereLight( 0xeeeeee, 0x020202, 0.75 );
	// light.position.set( 0.5, 1, 0.75 );
	// scene.add( light );
	//scene.add( group );

	/* outside lines */
	linesTexture = new THREE.Texture(lines);
	lines.width =  1024;
	lines.height = 1024;
	var linesMaterial = new THREE.MeshBasicMaterial({ map: linesTexture, side: THREE.DoubleSide  });
	var helperMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff, wireframe: true } );
	var sz = 40;
	var sides = [ /* relative x,y,z pos, rotation*/
		[0, 0,-1, 0, 0, 0], /* front face */
		[0, 0, 1, 0, Math.PI, 0], /* back face */
		
		[0, 1, 0, Math.PI/2, 0, 0], /* top face */
		[0,-1, 0, -Math.PI/2, 0, 0], /*  bottom face */

		[1, 0, 0, 0, -Math.PI/2, 0], /* right face */
		[-1,0, 0, 0, Math.PI/2, 0] /* left face */
	];
	
	// var sphere = new THREE.Mesh( new THREE.SphereGeometry( 50, 20, 10 ), linesMaterial );
	// sphere.position.set( 0, 0, 0 );
	// scene.add( sphere );

	// var cyl = new THREE.Mesh( new THREE.CylinderGeometry( 10, 10, 20, 16, 1, true ), linesMaterial );
	// cyl.position.set( 0, -3, 0 );
	// scene.add( cyl );

	for (let i = 0; i < sides.length; i++) {
		const side = sides[i];
		const planeGeo = new THREE.PlaneGeometry( sz*2, sz*2, i + 1 );
		const planeMesh = new THREE.Mesh( planeGeo, linesMaterial );
		planeMesh.position.set( side[0] * sz, side[1] * sz, side[2] * sz );
		planeMesh.rotation.set( side[3], side[4], side[5] );
		scene.add( planeMesh );
		// helper 
			// const helper = new THREE.Mesh( planeGeo, helperMaterial );
			// helper.position.set( side[0] * sz, side[1] * sz, side[2] * sz );
			// helper.rotation.set( side[3], side[4], side[5] );
			// scene.add( helper );
	}

	/* blender */
	mixer = new THREE.AnimationMixer( scene );
	var loader = new THREE.JSONLoader();
	loader.load("models/char_toon.json", function(geometry, materials) {
		var charMat = materials[0];
		charMat.morphTargets = true;
		charMat.color.setHex(0x000000);
		charMat.skinning = true;
		char = new THREE.SkinnedMesh(geometry, charMat);
		char.position.set(0, -3, -2);
		char.scale.set(0.5,0.5,0.5);
		char.xSpeed = 0;
		char.zSpeed = 0;
		char.add(voiceSound);
		mixer.clipAction(geometry.animations[5], char)
			.play();
		scene.add(char);

		instructions.textContent = "Tap to play";
		function start() {
			if (restart) {
				currentDialog = 0;
				dialogs.map((d) => d.start = 0);
				nextClip = true;
			} else {
				voice.play();
				animate();
				bkgMusic.loop = true;
				// loopMusic.loop = true;
			}
			bkgMusic.play();
			// loopMusic.play();
			// loopMusic.pause();
			// loopMusic.currentTime = 0;
			blocker.style.display = 'none';
			
			//playDialog();
			time = performance.now() + 3000; /* beginning delay */
			
			/* 
			audioLoader.load("clips/weird.mp3", function(buffer) {
				voiceSound.setBuffer(buffer);
				voiceSound.setRefDistance(10);
				voiceSound.connect(voiceSound.context.destination);
				// this fails because source doesn't exist
				 	// source becomes part of voiceSound after play method
				 	// https://github.com/mrdoob/three.js/issues/10404
				 	// only thing not happening i tink is connect to speakers
				voiceSound.play();
			});
			*/
		}
		instructions.addEventListener('touchstart', start, false );
		instructions.addEventListener('click', start, false );
			
	});
}

/* 0: delay, 1: play, 2: end */
function animate() {
	/* audio clips */
	if (performance.now() > time && nextClip) {
		let dialog = dialogs[currentDialog];
		if (dialog.start == 1) {
			nextClip = false;
			char.xSpeed = 0;
			char.zSpeed = 0;
			camera.ySpeed = getRandom(-0.001, 0.001);
			loadAnimation(dialog.anim);
			voice.src = dialog.track;
			voice.play();
			// bkgMusic.pause();
			// loopMusic.play();

			mixer.stopAllAction();
			const talk = talks[Math.floor(Math.random() * talks.length)];
			mixer.clipAction(char.geometry.animations[talk], char).play();
			voice.addEventListener("ended", function() {
				/* pause between scenes */
				// loopMusic.pause();
				// bkgMusic.play();
				time = performance.now() + dialog.end;
				nextClip = true;
				const nextIndex = dialogs.indexOf(dialog) + 1;
				if (nextIndex < dialogs.length) {
					currentDialog = nextIndex;
				} else {
					/* its over */
					restart = true;
					bkgMusic.pause();
					// loopMusic.pause();
					blocker.style.display = 'block';
					instructions.textContent = "The end";
					document.getElementById("headphones").textContent = "Tap to play again";
					nextClip = false;
					mixer.stopAllAction();
					mixer.clipAction(char.geometry.animations[5], char).play();
					char.xSpeed = 0;
					char.zSpeed = 0;
				}
			});
		} else {
			dialog.start = 1;
			time += dialog.delay;
			mixer.stopAllAction();
			const walk = walks[Math.floor(Math.random() * walks.length)];
			mixer.clipAction(char.geometry.animations[walk], char).play();
			char.xSpeed = getRandom(-0.02, 0.02);
			char.zSpeed = getRandom(0, 0.03);
			camera.ySpeed = 0;
			const vec = new THREE.Vector3(
				char.position.x + char.xSpeed, 
				char.position.y,
				char.position.z + char.zSpeed
			);
			char.lookAt(vec);
		}
	}

    requestAnimationFrame(animate);
    linesTexture.needsUpdate = true;
    mixer.update( clock.getDelta() );
    char.position.x += char.xSpeed;
    char.position.z += char.zSpeed;
    camera.position.y += camera.ySpeed;
    controls.update();
   	// renderer.render(scene, camera);
   	effect.render( scene, camera );
}