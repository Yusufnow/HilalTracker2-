let scene, camera, renderer, moonMesh;

function init3DSky(){

    const canvas = document.getElementById("sky3d");

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth/canvas.clientHeight,0.1,1000);
    renderer = new THREE.WebGLRenderer({canvas,alpha:true});

    const geometry = new THREE.SphereGeometry(2,32,32);
    const material = new THREE.MeshBasicMaterial({color:0xffffff});
    moonMesh = new THREE.Mesh(geometry,material);

    scene.add(moonMesh);

    camera.position.z=5;

    animate();
}

function animate(){
    requestAnimationFrame(animate);
    moonMesh.rotation.y+=0.002;
    renderer.render(scene,camera);
}
