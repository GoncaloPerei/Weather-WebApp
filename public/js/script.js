import App from './app.js';
try{
    const root = document.getElementById("app");
    const app = new App(root);
}
catch(e){
    console.log(e);
}