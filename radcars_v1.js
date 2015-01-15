Cars = new Mongo.Collection("cars");
Searches = new Mongo.Collection("searches");

CarPages = new Meteor.Pagination(Cars, {
	router: "iron-router",
	//homeRoute: ["/", "/curation/"],
	homeRoute: "/",
	route: "/",
	routerTemplate: "car",
	routerLayout: "cars",
	//routeSettings: function(route){
		//AccountsEntry.signInRequired(route);
	//},
	availableSettings: {
		sort: true,
		filters: true
	},
	itemTemplate: 'car',
	infinite: true,
	infiniteRateLimit: 1.5,
	infiniteTrigger: 20,
	perPage: 7,
	sort: {
		timestamp: -1
	}
});

CarSearchPages = new Meteor.Pagination(Searches, {
	router: "iron-router",
	homeRoute: ["/searches/"],
	route: "/searches/",
	routerTemplate: "search",
	routerLayout: "searches",
	routeSettings: function(route){
		AccountsEntry.signInRequired(route);
	},
	//availableSettings: {
		//sort: true
	//},
	itemTemplate: 'search',
	infinite: true,
	perPage: 20,
	sort: {
		headingSearchText: 1
	}
});

var masterStore = new FS.Store.FileSystem("master", {
    //path: MASTER_STORE_IMAGE_PATH,

    //Create the thumbnail as we save to the store.
    transformWrite: function(fileObj, readStream, writeStream) {
        readStream.pipe(writeStream);
    }
});

//Create globally scoped Images collection.
Images = new FS.Collection("images", {
    stores: [masterStore],
    chunkSize: 1024 * 1024, // Set chunk size to 1MB
    filter: {
        maxSize: 52428800, //50mb in bytes
        allow: {
            contentTypes: ['image/*'],
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'tif', 'tiff']
        },
        onInvalid: function(message) {
            if (Meteor.isClient) {
                alert(message);
            } else {
                console.warn(message);
            }
        }

    }
});

// Only allow inserting of images from a logged in user
Images.allow({
    insert: function(userId, file) {
    	return false;
    },
    update: function(userId, file, fields, modifier) {
    		return false;
    },
    remove: function(userId, file) {
        return false;
    },
    download: function() {
        return true;
    }
});

Searches.allow({
    insert: function(userId, file) {
    	return userId;
    },
    update: function(userId, file, fields, modifier) {
    		return false;
    },
    remove: function(userId, file) {
        return userId;
    }
});

// Example:http://search.3taps.com/?auth_token=468f64bb897eeec9d62eefacab12738d&region=USA-SFO&heading=audi&category=VAUT&anchor=1706462924&page=1&tier=0

// Need to specify retvals to get the specific return values
// Heading, location, price, images
// id 
// source 
// category 
// location 
// external_id 
// external_url 
// heading 
// timestamp

// var apiDataFactory = function apiDataFactory(heading, tier){

// 	var apiRetVals = "id,source,category,location,external_id,external_url,heading,timestamp,price,images";

// 	return {
// 		url: "http://search.3taps.com",

// 		params: { 
// 	        "auth_token": "468f64bb897eeec9d62eefacab12738d",
// 	        "retvals": apiRetVals,
// 	        "rpp": "50",
// 	        "lat": "37.7833",
// 	        "long":"122.4167",
// 	        //"radius":"1500mi",
// 	        "source": "CRAIG|AUTOC|AUTOD|EBAYM",
// 	        //"sort":"distance",
// 	        "location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
// 	        //"location.state":"USA-CA",
// 	        //"location.county": "USA-CA-SAF|USA-CA-STL|USA-OR-WAH",
// 	        "category": 'VAUT',
// 	        "status": "for_sale",
// 	        //"has_image": "1",
// 	        "tier":tier,
// 	        "heading":heading
//     }
//   };
// };
//var apiRetVals = "id,source,category,location,external_id,external_url,heading,timestamp,price,images";

// var apiData = {
// 	url: "http://search.3taps.com",

// 	params: { 
//         "auth_token": "468f64bb897eeec9d62eefacab12738d",
//         "retvals": apiRetVals,
//         "rpp": "50",
//         "lat": "37.7833",
//         "long":"122.4167",
//         //"radius":"1500mi",
//         "source": "CRAIG|AUTOC|AUTOD|EBAYM",
//         //"sort":"distance",
//         "location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
//         //"location.state":"USA-CA",
//         //"location.county": "USA-CA-SAF|USA-CA-STL|USA-OR-WAH",
//         "category": 'VAUT',
//         "status": "for_sale",
//         //"has_image": "1",
//         "tier":"0"
//         //"heading":'audi a3 quattro'
//     }
// };


if (Meteor.isClient) {

	Meteor.subscribe('images');

	Handlebars.registerHelper("prettifyDate", function(timestamp) {
		return new Date(timestamp*1000).toLocaleString();
    return new Date(timestamp*1000).toString('yyyy-MM-dd')
	});

	Handlebars.registerHelper("prettifyMoney", function(money){
		return accounting.formatMoney(money);
	});

	Handlebars.registerHelper("longifySource", function(source){

		if (source === "AUTOD") return "AutoTrader";
		if (source === "AUTOC") return "AutoTrader";
		if (source === "CARSD") return "Cars.com";
		if (source === "EBAYM") return "Ebay";
		if (source === "CRAIG") return "Craigslist";
		return source;

	});

	Template.navigationBar.helpers({
    activeIfTemplateIs: function (template) {
      var currentRoute = Router.current();
      //console.log(currentRoute.lookupTemplate());
      return currentRoute &&
        template === currentRoute.lookupTemplate() ? 'active' : '';
    }
  });


	Template.body.rendered = function(){
		  if(!this._rendered) {
      	this._rendered = true;
				//var $container = $('#car-container');
				// initialize
				// $container.masonry({
				//   columnWidth: 200,
				//   itemSelector: '.item'
				// });
				//console.log("masonry!");
    	}
	};

	Template.body.helpers({
		cars: function(){
			return Cars.find({});
		}
	});

	Template.body.events({
		'click button.refresh-data': function(){
			console.log("REPOPULATING!");
			Meteor.call('repopulateCars');
		},
		'keyup input.filter-cars-text': function(){
			var inputBox = $("input.filter-cars-text");
	    var text = inputBox.val().toLowerCase();
	    CarPages.set({filters: {headingSearchable : {$regex: text}}});

	    //Meteor.call('filterCars', {searchText: text});
		}
	})
	// counter starts at 0
	Session.setDefault("counter", 0);

	Template.car.helpers({
		counter: function () {
			return Session.get("counter");
		},
		image: function(){
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
		'click button': function () {
			// increment the counter when button is clicked
			//Session.set("counter", Session.get("counter") + 1);
		}
	});

	Template.cars.rendered = function(){
		  if(!this._rendered) {
		  	//Meteor.call('repopulateCars');
		  	//console.log("REPOPULATING!");
      	this._rendered = true;
    	}
	};

	Template.car.created = function(){
		//$("div.thumbnail").css({ opacity: 0 });
		//console.log("CREATED!");
	};

	Template.car.rendered = function(){
		//console.log("here!");
		this.$("div.thumbnail").fadeIn(1000);
	};

	Template.searches.events({
	  "click button.new-search": function (event) {
	    // This function is called when the new task form is submitted

	    //var text = event.target.text.value;
	    var inputBox = $("input.search-term-text");
	    var text = inputBox.val();

	    if (text.length <= 0 ) return;

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
  	'click button.refresh-data': function(){
			console.log("REPOPULATING!");
			Meteor.call('blowAwayData');
		}
	});
	Template.search.events({
		"click .delete-search": function(){
			Meteor.call('deleteSearch', {searchID: this._id});
			alert("Search " + this.headingSearchText + " removed!");

		}
	});


	Meteor.startup(function() {
     AccountsEntry.config({
         //logo: 'logo.png', // if set displays logo above sign-in options
         //privacyUrl: '/privacy-policy', // if set adds link to privacy policy and 'you agree to ...' on sign-up page
         //termsUrl: '/terms-of-use', // if set adds link to terms  'you agree to ...' on sign-up page
         homeRoute: '/sign-in', // mandatory - path to redirect to after sign-out
         dashboardRoute: '/searches', // mandatory - path to redirect to after successful sign-in
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
}

if (Meteor.isServer) {


	Meteor.publish('images', function() {
        return Images.find();
    });

	Meteor.methods({
		repopulateCars: function(){
			populateCars();
		},
		blowAwayData: function(){
			flushAllData();
		},
		deleteSearch: function(options){
			Searches.remove(options.searchID);
			//flushAllData();
		},
		filterCars: function(options){
			if (options.searchText.length < 2) return;
			//console.log("Filtering by: " + options.searchText);
			//CarPages.set({filters: {heading : new RegExp(options.searchText)}});
		}
	});

	var flushAllData = function flushAllData(){
		console.log("Flushing Data.")
		Cars.remove({});
		Images.remove({});
		populateCars(0);
	};

	var populateCars = function populateCars(tier){
		console.log("Getting car data for tier " + tier);

		var searches = Searches.find({});

		searches.forEach(function (search) {
		  //apiData.params.heading = search.headingSearchText;
		  //apiData.params.tier = 0;

		  var apiData = apiDataFactory(search.headingSearchText, tier);
		  //console.log("Searching for: " + apiData.params.heading);
			Meteor.http.get(apiData.url, apiData, function( err, res ){
				//console.log("Data returned!" + res.data.postings.length);
				//console.log(res.data);
				var postings = res.data.postings;
				_.each(postings, function(post){
					//console.log("POST: " + post.heading)
					//var newCar = Cars.insert(post);
					var newCar = Cars.upsert(
						{
							external_id: post.external_id
						},
						{ 
							$set: {
								category: post.category,
								external_id: post.external_id,
								external_url: post.external_url,
								heading: post.heading,
								headingSearchable: post.heading.toLowerCase(),
								id: post.id,
								images: post.images,
								location: post.location,
								price: post.price,
								source: post.source,
								timestamp: post.timestamp
								}
						});
					//console.log(newCar);
					fetchImage(newCar.insertedId);
				});

			});

		});
	};

	var fetchImage = function fetchImage(postID){
		if (!postID) return;
		var request = Meteor.npmRequire('request');
		var carObj = Cars.findOne(postID);
		//console.log(carObj.heading + " : " + carObj.images[0].full);
		if (!carObj || !carObj.images || carObj.images.length <= 0) return;

		var imgUrl = carObj.images[0].full || carObj.images[0].thumb;

		request.get({url: imgUrl, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
		  var newFile = new FS.File();
		  newFile.attachData(buffer, {type: 'image/jpeg'}, function(error){
		      if(error) throw error;
		      newFile.name('carImage.jpeg');

		      var newImage = Images.insert(newFile);

		      Cars.update(carObj._id, {$set: {imageID: newImage._id}})

		  });
		}));



	};


	// var fetchImages = function fetchImages(){
	// 	var request = Meteor.npmRequire('request');
	// 	// Go through each car and get the URL
	// 	var allCars = Cars.find();

	// 	allCars.forEach(function(car){
	// 		var url = car.external_url;
	// 		//console.log("Fetching " + url);
	// 		// use $(".carousel.multiimage img:first").attr("src");
	// 		Meteor.http.get(url, function(err, res){
	// 			var $ = cheerio.load(res.content);
	// 			var imgUrl = $(".userbody").find('img').attr("src");
	// 			//console.log("Updating " + car._id + " with " + imgUrl);

	// 			request.get({url: imgUrl, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
	// 			  var newFile = new FS.File();
	// 			  newFile.attachData(buffer, {type: 'image/jpeg'}, function(error){
	// 			      if(error) throw error;
	// 			      newFile.name('carImage.jpeg');

	// 			      var newImage = Images.insert(newFile);

	// 			      Cars.update(car._id, {$set: {imageID: newImage._id}})

	// 			  });
	// 			}));
	// 		});
	// 	});

		//console.log("DONE!");

	// };

	// var saveImageLocally = function saveImageLocally(){
	// 	var url = "http://images.craigslist.org/00b0b_5vNqTpyxLPb_600x450.jpg";
	// 	var request = Meteor.npmRequire('request');

	// 	request.get({url: url, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
	// 	  var newFile = new FS.File();
	// 	  newFile.attachData(buffer, {type: 'image/jpeg'}, function(error){
	// 	      if(error) throw error;
	// 	      newFile.name('myGraphic.jpeg');

	// 	      Images.insert(newFile, function(err, fileObj){
	// 	      	//console.log("WE MADE IT!" + fileObj._id);
	// 	      });
	// 	  });
	// 	}));


	// };

	var apiDataFactory = function apiDataFactory(heading, tier){

	var apiRetVals = "id,source,category,location,external_id,external_url,heading,timestamp,price,images";

		return {
			url: "http://search.3taps.com",

			params: { 
		        "auth_token": "468f64bb897eeec9d62eefacab12738d",
		        "retvals": apiRetVals,
		        "rpp": "50",
		        "lat": "37.7833",
		        "long":"122.4167",
		        //"radius":"1500mi",
		        "source": "CRAIG|AUTOC|AUTOD|EBAYM",
		        //"sort":"distance",
		        "location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
		        //"location.state":"USA-CA",
		        //"location.county": "USA-CA-SAF|USA-CA-STL|USA-OR-WAH",
		        "category": 'VAUT',
		        "status": "for_sale",
		        "has_image": "1",
		        "tier":tier,
		        "heading":heading
		    }
		  };
	};

	Meteor.startup(function () {

		var SITE_SIGNUP_CODE = typeof Meteor.settings != 'undefined' && Meteor.settings["site_signup_code"] || '12345';

		console.log("Accounts configured with signup code: " + SITE_SIGNUP_CODE);

    AccountsEntry.config({
        signupCode: SITE_SIGNUP_CODE //, // only restricts username+password users, not OAuth
        //defaultProfile: someDefault: 'default'
    });

		// Update tier 0 every minute
		var populateTier0Interval = Meteor.setInterval(function(){populateCars(0)}, 300000);

		// Update tier 1 every 15 minutes
		var populateTier1Interval = Meteor.setInterval(function(){populateCars(1)}, 900000); 

		//saveImageLocally();

	});
}


//TODO
//
// Call the api to get the results
//
// Put all of the results into the database without duplicates
//
// Call all the craigslist URLs to get the URL of the images
//
// Save image locally to server to app