var blocker = document.getElementById( 'blocker' );
var startButton = document.getElementById( 'start-button' );
var instructions = document.getElementById( 'instructions' );
var bkgMusic, bkgLoader;

let restart = false;

const idles = [0,1,2,3,4];
const walks = [12, 13, 14, 15];
const talks = [6,7,8,9];

/* sides  0 front  1 back  2 top  3 bottom  4 right  5 left*/
const dialogs = [
	// starts with empty church windows ... 
	{ track: "clips/0.mp3",	 anim: "drawings/beach.json", sides: [0,1,4,5], delay: 7000, end: 4000 },
	{ track: "clips/1.mp3",	 anim: "drawings/mustard_3.json", sides: [0, 1, 4, 5], delay: 4000, end: 4000 },
	{ track: "clips/2.mp3",	 anim: "drawings/cat_jesus_windows.json", sides: [0, 1], delay: 4000, end: 3000 },
	{ track: "clips/3.mp3",	 anim: "drawings/heavenhell.json", sides: [0, 1, 4, 5], delay: 3000, end: 3000},
	{ track: "clips/4.mp3",	 anim: "drawings/liens.json", sides: [1, 2, 3], delay: 3000, end: 4000 },
	{ track: "clips/5.mp3",  anim: "drawings/moon.json", sides: [0, 1, 2, 4, 5], delay: 3000, end: 5000 },
	{ track: "clips/6.mp3",	 anim: "drawings/bite.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/7.mp3",	 anim: "drawings/get_a_dog.json", sides: [0, 1, 4, 5], delay: 7000, end: 3000 },
	{ track: "clips/8.mp3",	 anim: "drawings/cat_hotdog_angel.json", sides: [0, 1, 3, 4, 5], delay: 3000, end: 4000 },
	{ track: "clips/9.mp3",	 anim: "drawings/big_dogs.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/10.mp3", anim: "drawings/spinning.json", sides: [0, 1, 2, 3, 4, 5], delay: 3000, end: 3000 },
	{ track: "clips/11.mp3", anim: "drawings/cat_adam_and_eve.json", sides: [0, 1, 4, 5], delay: 5000, end: 3000 },
	{ track: "clips/12.mp3", anim: "drawings/hell_hotdog.json", sides: [0, 1, 4, 5], delay: 3000, end: 7000 },
	{ track: "clips/13.mp3", anim: "drawings/cracks_2.json", sides: [0, 1, 4, 5], delay: 3000, end: 5000 }
];


let currentDialog = 0;
let time;
let nextClip = true;

var lines = document.getElementById('lines');
let width = window.innerWidth, height = window.innerHeight;
let linesPlayer = new LinesPlayer(lines);
let planes = [];

let phoneLines = new LinesPlayer(document.getElementById('phone'));
phoneLines.loadAnimation('drawings/rotate_phone_256.json');

let camera, scene, renderer, controls;
let effect, stEffect, composer;
let linesTexture; /* texture gets updated */
let clock, mixer;
let listener, voiceSound, voiceSource, audioLoader;
let element, container;
let char, char2, pointLight;

// better than mobile check, includes ipad
// if this is a phone allow user to start
function onMotion(ev) {
	window.removeEventListener('devicemotion', onMotion, false);
	if (ev.acceleration.x != null || ev.accelerationIncludingGravity.x != null) {
		instructions.style.display = "block";
		instructions.textContent = "Rotate to begin VR mode.  Headphones recommended.";
		init();
		document.addEventListener('visibilitychange', () => {
			location.reload(); // hacky for now
		});
	}
}
window.addEventListener('devicemotion', onMotion, false);

function setOrientationControls(e) {
	if (!e.alpha) {
		return;
	}
	controls = new THREE.DeviceOrientationControls(camera, true);
	controls.connect();
	controls.update();

	if (window.innerWidth > window.innerHeight) {
		instructions.style.display = 'none';
		startButton.style.display = 'block';
		window.removeEventListener('deviceorientation', setOrientationControls, true);
	}
}

function init() {

	clock = new THREE.Clock();
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer();
	element = renderer.domElement;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
	document.body.appendChild(renderer.domElement);
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	effect = new THREE.OutlineEffect( renderer, {
		defaultThickNess: 1,
		defaultColor: new THREE.Color( 0xffffff )
	} );

	stEffect = new THREE.StereoEffect(renderer);

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
	camera.position.z = 5;
	camera.ySpeed = 0;
	scene.add(camera);

	var light = new THREE.AmbientLight( 0xffffff );
	scene.add( light );
	
	// set up device orientation controls
	window.addEventListener('deviceorientation', setOrientationControls, true);

	/* outside lines */
	lines.width =  1024;
	lines.height = 1024;
	linesTexture = new THREE.Texture(lines);
	const linesMaterial = new THREE.MeshBasicMaterial({map:linesTexture, side: THREE.DoubleSide});
	const sz = 40;
	const sides = [ /* relative x,y,z pos, rotation*/
		[0, 0,-1, 0, 0, 0], /* front face */
		[0, 0, 1, 0, Math.PI, 0], /* back face */
		[0, 1, 0, Math.PI/2, 0, 0], /* top face */
		[0,-1, 0, -Math.PI/2, 0, 0], /*  bottom face */
		[1, 0, 0, 0, -Math.PI/2, 0], /* right face */
		[-1,0, 0, 0, Math.PI/2, 0] /* left face */
	];

	for (let i = 0; i < sides.length; i++) {
		const side = sides[i];
		const planeGeo = new THREE.PlaneGeometry( sz*4, sz*4, i + 1 );
		const planeMesh = new THREE.Mesh( planeGeo, linesMaterial );
		planeMesh.position.set( side[0] * sz * 2, side[1] * sz * 2, side[2] * sz * 2 );
		planeMesh.rotation.set( side[3], side[4], side[5] );
		scene.add( planeMesh );
		planes.push(planeMesh);
	}

	/* audio */
	listener = new THREE.AudioListener();
	camera.add(listener);
	audioLoader = new THREE.AudioLoader();
	voiceSound = new THREE.PositionalAudio( listener );
	bkgLoader = new THREE.AudioLoader();
	bkgMusic = new THREE.Audio( listener );

	/* blender */
	mixer = new THREE.AnimationMixer( scene );
	let loader = new THREE.JSONLoader();

	// load outline version
	loader.load("models/char_toon.json", function(geometry, materials) {
		var charMat = materials[0];
		charMat.side = THREE.BackSide;
		charMat.morphTargets = true;
		charMat.skinning = true;
		charMat.color.setHex(0xffffff);
		char2 = new THREE.SkinnedMesh(geometry, charMat);
		char2.position.set(0, -3, -2);
		char2.scale.set(0.5,0.5,0.5);
		char2.scale.multiplyScalar(1.025);
		mixer.clipAction(char2.geometry.animations[1], char2).play();
		scene.add(char2);
	});

	// load black version
	loader.load("models/char_toon.json", function(geometry, materials) {
		var charMat = materials[0];
		charMat.color.setHex(0x000000);
		charMat.morphTargets = true;
		charMat.skinning = true;

		// var toonMat = new THREE.MeshToonMaterial({
		// 	color: 0x000000,
		// 	specular: 0xffffff,
		// 	reflectivity: 100,
		// 	shininess: 0
		// });
		// var gradientTexture = new THREE.TextureLoader().load( "/textures/gradient_3.png" );
		// toonMat.gradientMap = gradientTexture;
		// toonMat.morphTargets = true;
		// toonMat.skinning = true;

		char = new THREE.SkinnedMesh(geometry, charMat);
		char.position.set(0, -3, -2);
		char.scale.set(0.5,0.5,0.5);
		char.xSpeed = 0;
		char.zSpeed = 0;
		char.add(voiceSound);
		mixer.clipAction(char.geometry.animations[1], char).play();
		scene.add(char);

		// pointLight = new THREE.PointLight( 0xffffff, 50, 800, 1 );
		// pointLight.position.set(char.position.x, char.position.y, char.position.z);
		// pointLight.position.y += 100;
		// pointLight.lookAt(char.position);
		// scene.add( pointLight );

		// when char is loaded
		startButton.textContent = "Tap to play";
		startButton.addEventListener( 'touchend', start, false );
		startButton.addEventListener( 'click', start, false );
	});
}

function start() {
	fullscreen();
	if (document.getElementById('phone'))
		document.getElementById('phone').remove();

	if (restart) {
		currentDialog = 0;
		dialogs.map((d) => d.start = 0);
		nextClip = true;
		bkgLoader.load("clips/theme_7_80_12.mp3", function(buffer) {
			bkgMusic.stop();
			bkgMusic.isPlaying = false;		
			bkgMusic.setBuffer( buffer );
			bkgMusic.setLoop( true );
			bkgMusic.play();
		});
	} else {
		animate();
		bkgMusic.loop = true;
	}

	bkgLoader.load("clips/theme_7_80_12.mp3", function(buffer) {
		bkgMusic.setBuffer( buffer );
		bkgMusic.setLoop( true );
		bkgMusic.play();
	});

	blocker.style.display = 'none';
	
	time = performance.now() + 4000; /* beginning delay */

	linesPlayer.loadAnimation("drawings/empty.json", function() {
		// turn on dialog.sides, off others
		planes.map((p, i) => [0,1,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
	});

	/* for mobile to work  */
	const source = listener.context.createBufferSource();
	source.connect(listener.context.destination);
	source.start();
}

function talk(dialog) {
	nextClip = false; // waiting for end of current dialog
	char.xSpeed = 0;
	char.zSpeed = 0;
	camera.ySpeed = Cool.random(-0.001, 0.001);
	linesPlayer.loadAnimation(dialog.anim, function() {
		// turn on dialog.sides, off others
		planes.map((p, i) => dialog.sides.indexOf(i) != -1 ? p.visible = true : p.visible = false);
	});
	audioLoader.load( dialog.track, function(buffer) {
		voiceSound.setBuffer(buffer);
		voiceSound.setRefDistance(20);
		voiceSound.play();
	});

	mixer.stopAllAction();
	const talk = talks[Math.floor(Math.random() * talks.length)];
	mixer.clipAction(char.geometry.animations[talk], char).play();
	mixer.clipAction(char2.geometry.animations[talk], char2).play();

	voiceSound.onEnded = function() {
		voiceSound.isPlaying = false;
		time = performance.now() + dialog.end;
		nextClip = true;
		const nextIndex = dialogs.indexOf(dialog) + 1;
		if (nextIndex < dialogs.length)
			currentDialog = nextIndex;
		else 
			end();
	};
}

function walk() {
	mixer.stopAllAction();
	if (Math.random() > 0.3) {
		const walk = walks[Math.floor(Math.random() * walks.length)];
		mixer.clipAction(char.geometry.animations[walk], char).play();
		mixer.clipAction(char2.geometry.animations[walk], char2).play();
		if (char.position.distanceTo(camera.position) > 10) {
			char.xSpeed = char.position.x > camera.position.x ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
			char.zSpeed = char.position.z > camera.position.z ? Cool.random(-0.02, 0) : Cool.random(0, 0.02);
		} else {
			char.xSpeed = Cool.random(-0.02, 0.02);
			char.zSpeed = Cool.random(-0.02, 0.03);
		}
		
		camera.ySpeed = 0;
		const vec = new THREE.Vector3(
			char.position.x + char.xSpeed, 
			char.position.y,
			char.position.z + char.zSpeed
		);
		char.lookAt(vec);
		char2.lookAt(vec);
	} else {
		const idle = idles[Math.floor(Math.random() * idles.length)];
		mixer.clipAction(char.geometry.animations[idle], char).play();
		mixer.clipAction(char2.geometry.animations[idle], char2).play();
	}
}

function end() {
	bkgLoader.load("clips/end.mp3", function(buffer) {
		bkgMusic.stop();
		bkgMusic.isPlaying = false;
		bkgMusic.setBuffer( buffer );
		bkgMusic.setLoop( false );
		bkgMusic.play();
	});
	setTimeout(function() { 
		exitFullscreen();
		restart = true;
		nextClip = false;
		blocker.style.display = 'block';
		startButton.textContent = "Tap to play again";
		instructions.textContent = "End of part 1";
		instructions.style.display = 'block';
		// document.getElementById("tramp").style.display = "block";
		mixer.stopAllAction();
		const endAnim = [1,2,3,4][Cool.randomInt(0,3)];
		mixer.clipAction(char.geometry.animations[endAnim], char).play();
		mixer.clipAction(char2.geometry.animations[endAnim], char2).play();
		char.xSpeed = 0;
		char.zSpeed = 0;
		linesPlayer.loadAnimation("drawings/big_dogs.json", function() {
			// turn on dialog.sides, off others
			planes.map((p, i) => [0,1,2,3,4,5].indexOf(i) != -1 ? p.visible = true : p.visible = false);
		});
	}, 2000);
}

/* 0: delay, 1: play, 2: end */
function animate() {
	/* audio clips */
	if (performance.now() > time && nextClip) {
		let dialog = dialogs[currentDialog];
		if (dialog.started) {  // undefined at start
			talk(dialog);
		} else {
			dialog.started = true;
			time += dialog.delay;
			walk();
		}
	}

    requestAnimationFrame(animate);
    linesTexture.needsUpdate = true;
    mixer.update( clock.getDelta() );
    char.position.x += char.xSpeed;
    char.position.z += char.zSpeed;
    char2.position.x = char.position.x;
    char2.position.z = char.position.z;
    // pointLight.position.x = char.position.x;
    // pointLight.position.z = char.position.z;
    camera.position.y += camera.ySpeed;
    controls.update();
   	// renderer.render(scene, camera);
   	// effect.render( scene, camera );
   	stEffect.render( scene, camera );
}

function onWindowResize() { 
	width =  document.documentElement.clientWidth;
	height =  document.documentElement.clientHeight;

	// var width = container.offsetWidth;
	// var height = container.offsetHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix(); // https://stackoverflow.com/questions/30453549/three-js-canvas-not-resizing-to-mobile-device-window-width
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(width, height);
	stEffect.setSize(width, height);
}
window.addEventListener( 'resize', onWindowResize, false );

function fullscreen() {
	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	}
}

function exitFullscreen() {
	document.exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
	if (document.exitFullscreen)
		document.exitFullscreen();
}

// https://stackoverflow.com/questions/28402100/wrong-value-for-window-innerwidth-during-onload-event-in-firefox-for-android
// https://stackoverflow.com/questions/35323062/detect-sound-is-ended-in-three-positionalaudio