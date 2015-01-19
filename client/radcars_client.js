Meteor.subscribe('images');

Handlebars.registerHelper("prettifyDate", function(timestamp) {
	return new Date(timestamp * 1000).toLocaleString();
	return new Date(timestamp * 1000).toString('yyyy-MM-dd')
});

Handlebars.registerHelper("prettifyMoney", function(money) {
	return accounting.formatMoney(money);
});

Handlebars.registerHelper("longifySource", function(source) {

	if (source === "AUTOD") return "AutoTrader";
	if (source === "AUTOC") return "AutoTrader";
	if (source === "CARSD") return "Cars.com";
	if (source === "EBAYM") return "Ebay";
	if (source === "CRAIG") return "Craigslist";
	return source;

});

Template.navigationBar.helpers({
	activeIfTemplateIs: function(template) {
		var currentRoute = Router.current();
		//console.log(currentRoute.lookupTemplate());
		return currentRoute &&
			template === currentRoute.lookupTemplate() ? 'active' : '';
	},
	isUserAnAdmin: function(){
		return Meteor.userId();
	},
	totalCarsInDB: function(){
		Meteor.call('totalCarsInDB', function(err, data){
			if (!err) Session.set('totalCarsInDB', data);
		});
		return Session.get('totalCarsInDB');
	}
});


Template.body.rendered = function() {
	if (!this._rendered) {
		this._rendered = true;
	}
};

Template.body.helpers({
	cars: function() {
		//return Cars.find({});
	}
});

Template.body.events({
		'click button.refresh-data': function() {
			console.log("REPOPULATING!");
			Meteor.call('repopulateCars');
		},
		'keyup input.filter-cars-text': function() {
			var inputBox = $("input.filter-cars-text");
			var text = inputBox.val().toLowerCase();
			CarPages.set({
				filters: {
					headingSearchable: {
						$regex: text
					},
					curation: {$ne: "LAME"}
				}
			});

			//Meteor.call('filterCars', {searchText: text});
		},
		'click button.clear-search-button': function() {
			var inputBox = $("input.filter-cars-text");
			var text = inputBox.val("");
			CarPages.set({
				filters: {
					headingSearchable: {
						$regex: ""
					},
					curation: {$ne: "LAME"}
				}
			});
		}
	})
	// counter starts at 0
Session.setDefault("counter", 0);

Template.car.helpers({
	// counter: function() {
	// 	return Session.get("counter");
	// },
	image: function() {
		//var tsturl = "http://images.craigslist.org/00b0b_5vNqTpyxLPb_600x450.jpg";
		//var file = new FS.File(tsturl); // This could be grapped from the url
		//file.attachData(tsturl, function(error) {console.log("ERR: " + error);});
		//Images.insert(file, function(){console.log(arguments);});
		//console.log("HEY!" + this.imageID);
		var img = Images.findOne(this.imageID);
		return img && img.url() || "/noimage.jpg";
	}
});

Template.car.events({
	'click button': function() {
		// increment the counter when button is clicked
		//Session.set("counter", Session.get("counter") + 1);
	}
});

Template.cars.rendered = function() {
	if (!this._rendered) {
		//Meteor.call('repopulateCars');
		console.log("REPOPULATING!");
		var inputBox = $("input.filter-cars-text");
		var text = inputBox.val("");
		this._rendered = true;
	}
};

Template.car.rendered = function() {
	//console.log("here!");
	this.$("div.thumbnail").fadeIn(1000);
};

Template.carCurationItem.rendered = function() {
	//console.log("here!");
	this.$("div.thumbnail").fadeIn(1000);
};

Template.carCurationItem.events({
	"click button.toggle-curation-lame": function(event) {
		var newValue = (this.curation === "LAME") ? "" : "LAME";
		Meteor.call('setCurationValue', {_id: this._id, curation: newValue});
	}
});

Template.carCurationItem.helpers({
	image: function() {
		//var tsturl = "http://images.craigslist.org/00b0b_5vNqTpyxLPb_600x450.jpg";
		//var file = new FS.File(tsturl); // This could be grapped from the url
		//file.attachData(tsturl, function(error) {console.log("ERR: " + error);});
		//Images.insert(file, function(){console.log(arguments);});
		//console.log("HEY!" + this.imageID);
		var img = Images.findOne(this.imageID);
		return img && img.url() || "/noimage.jpg";
	},
	lameCar: function(){
		return this.curation === "LAME";
	}
});

Template.searches.events({
	"click button.new-search": function(event) {
		// This function is called when the new task form is submitted

		//var text = event.target.text.value;
		var inputBox = $("input.search-term-text");
		var text = inputBox.val();

		if (text.length <= 0) return;

		Searches.insert({
			headingSearchText: text.toLowerCase(),
			rank: new Date().getTime()
		});

		// Clear form
		//event.target.text.value = "";
		inputBox.val("");

		// Prevent default form submit
		return false;
	},
	'click button.refresh-data': function() {
		console.log("REPOPULATING!");
		Meteor.call('blowAwayData');
	}
});
Template.search.events({
	"click .delete-search": function() {
		Meteor.call('deleteSearch', {
			searchID: this._id
		});
		alert("Search " + this.headingSearchText + " removed!");

	}
});


Meteor.startup(function() {
	AccountsEntry.config({
		//logo: 'logo.png', // if set displays logo above sign-in options
		//privacyUrl: '/privacy-policy', // if set adds link to privacy policy and 'you agree to ...' on sign-up page
		//termsUrl: '/terms-of-use', // if set adds link to terms  'you agree to ...' on sign-up page
		homeRoute: '/sign-in', // mandatory - path to redirect to after sign-out
		dashboardRoute: '/admin', // mandatory - path to redirect to after successful sign-in
		//profileRoute: 'profile',
		passwordSignupFields: 'EMAIL_ONLY',
		showSignupCode: true,
		showOtherLoginServices: false // Set to false to hide oauth login buttons on the signin/signup pages. Useful if you are using something like accounts-meld or want to oauth for api access
			// extraSignUpFields: [{ // Add extra signup fields on the signup page
			//     field: "name", // The database property you want to store the data in
			//     name: "This Will Be The Initial Value", // An initial value for the field, if you want one
			//     label: "Full Name", // The html lable for the field
			//     placeholder: "John Doe", // A placeholder for the field
			//     type: "text", // The type of field you want
			//     required: true // Adds html 5 required property if true
			// }]
	});
});