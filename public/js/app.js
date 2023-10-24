import WeatherView from "./WeatherView.js";

let auth0Client = null;

export default class App{
  constructor(root){
    
    
    this.apiKey = "f56970ab699f0d99418689e18d1ddb66";
    this.apiURL = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
    
    this.view = new WeatherView(root, this._handlers());
    this._load();

  }

  async _load(){
    try{
      await this._configureClient();
    
      const isAuthenticated = await auth0Client.isAuthenticated();
    
      if (isAuthenticated) {
        console.log("-> User is authenticated");
        this._setActiveButton(isAuthenticated);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    
      console.log("-> User not authenticated");
    
      const query = window.location.search;
      const shouldParseResult = query.includes("code=") && query.includes("state=");
    
      if (shouldParseResult) {
        console.log("-> Parsing redirect");

        const result = await auth0Client.handleRedirectCallback();

        try{
          if (result.appState && result.appState.targetUrl) {
            showContentFromUrl(result.appState.targetUrl);
          }
    
          console.log("Logged in!");
        } catch (err) {
          console.log("Error parsing redirect:", err);
        }
    
        window.history.replaceState({}, document.title, "/");
      }
    }
    catch(e){
      console.log(e);
    }
    this._setActiveButton();
  }

  async _fetchAuthConfig(){
    return fetch("/auth_config.json")
  }

  async _configureClient(){
    const response = await this._fetchAuthConfig();
    const config = await response.json();

    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId
    });
  }

  async requireAuth(){
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (isAuthenticated) {
      return true;
    }
    
    return false;
  }

  async _login(targetUrl){
    try {
      console.log("Logging in", targetUrl);

      const options = {
        authorizationParams: {
          redirect_uri: window.location.origin
        }
      };

      if (targetUrl) {
        options.appState = { targetUrl };
      }

      await auth0Client.loginWithRedirect(options);

    } catch (err) {
      console.log("Log in failed", err);
    }
  }

  async _logout(){
    try {
      console.log("Logging out");
      await auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } catch (err) {
      console.log("Log out failed", err);
    }
  }

  async _getWeather(city){
      const response = await fetch(this.apiURL + city.value + `&appid=${this.apiKey}`);
      if(response.status === 400){
        this._error('error');
      }
      else if(response.status === 404){
        this._error('warning');
      }
      let data = await response.json();
      this._setWeather(data);
  }

  _setWeather(data){
    this.view.updateWeatherSec(data);
  }

  _error(id){
    this.view.updateToast(id);
  }

  _setActiveButton(){
    this.view.setActiveButton();
  }

  _handlers(){
    return {
      onWeatherSearch: city => {
        this._getWeather(city);
      },
      onLogin: targetUrl => {
        this._login(targetUrl);
      },
      onLogout: () => {
        this._logout();
      },
      onAuthVerification: () => {
        return this.requireAuth();
      },
      onError: id => {
        this._error(id);
      }
    };
  }
}