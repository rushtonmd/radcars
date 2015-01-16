var configSettings = {
	"site_signup_code": "testcode",
	"cars_authtoken": "authtoken"
};

ConfigSettings = function ConfigSettings(name){
	return configSettings[name];
}
