Cars = new Mongo.Collection("cars");
Searches = new Mongo.Collection("searches");

CarPages = new Meteor.Pagination(Cars, {
	router: "iron-router",
	//homeRoute: ["/", "/admin/"],
	homeRoute: "/curation/",
	route: "/curation/",
	routerTemplate: "car",
	routerLayout: "cars",
	//routeSettings: function(route){
		//AccountsEntry.signInRequired(route);
	//},
	//availableSettings: {
		//sort: true
	//},
	itemTemplate: 'car',
	infinite: true,
	perPage: 5,
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
	//routeSettings: function(route){
		//AccountsEntry.signInRequired(route);
	//},
	//availableSettings: {
		//sort: true
	//},
	itemTemplate: 'search',
	infinite: true,
	perPage: 20,
	sort: {
		rank: -1
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

var apiData = {
	url: "http://search.3taps.com",
	params: { 
        "auth_token": "468f64bb897eeec9d62eefacab12738d",
        "rpp": "100",
        "lat": "37.7833",
        "long":"122.4167",
        //"radius":"10000mi",
        "source": "CRAIG",
        //"sort":"distance",
        "location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
        //"location.state":"USA-CA",
        "category": 'VAUT',
        //"heading":'audi a3 quattro'
    }
};


if (Meteor.isClient) {

	Handlebars.registerHelper("prettifyDate", function(timestamp) {
		return new Date(timestamp*1000).toLocaleString();
    return new Date(timestamp*1000).toString('yyyy-MM-dd')
	});


	Template.body.rendered = function(){
		  if(!this._rendered) {
      	this._rendered = true;
				//var $container = $('#car-container');
				// initialize
				$container.masonry({
				  columnWidth: 200,
				  itemSelector: '.item'
				});
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

			return Images.findOne(this.imageID) || {url:"/noimage.jpg"};
		}
	});

	Template.car.events({
		'click button': function () {
			// increment the counter when button is clicked
			Session.set("counter", Session.get("counter") + 1);
		}
	});

	Template.cars.rendered = function(){
		  if(!this._rendered) {
		  	//Meteor.call('repopulateCars');
		  	//console.log("REPOPULATING!");
      	this._rendered = true;
    	}
	};

	Template.searches.events({
	  "click button.new-search": function (event) {
	    // This function is called when the new task form is submitted

	    //var text = event.target.text.value;
	    var inputBox = $("input.search-term-text");
	    var text = inputBox.val();

	    if (text.length <= 0 ) return;

	    Searches.insert({
	      headingSearchText: text,
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
			Meteor.call('repopulateCars');
		}
	});
	Template.search.events({
		"click .delete-search": function(){
			Searches.remove(this._id);
			alert("Search " + this.headingSearchText + " removed!");

		}
	});
}

if (Meteor.isServer) {

	Meteor.methods({
		repopulateCars: function(){
			populateCars();
		}
	});

	var populateCars = function populateCars(){
		//console.log("Getting car data...");

		// Clear all items from database
		Cars.remove({});
		Images.remove({});

		var searches = Searches.find({});

		searches.forEach(function (search) {
		  apiData.params.heading = search.headingSearchText;
		  console.log("Searching for: " + apiData.params.heading);
			Meteor.http.get(apiData.url, apiData, function( err, res ){
				//console.log("Data returned!");

				var postings = res.data.postings;
				_.each(postings, function(post){
					Cars.insert(post, function(){
						//fetchImages();
					});
				});

				fetchImages();
			});
		});
	};

	var fetchImages = function fetchImages(){
		var request = Meteor.npmRequire('request');
		// Go through each car and get the URL
		var allCars = Cars.find();

		allCars.forEach(function(car){
			var url = car.external_url;
			//console.log("Fetching " + url);
			// use $(".carousel.multiimage img:first").attr("src");
			Meteor.http.get(url, function(err, res){
				var $ = cheerio.load(res.content);
				var imgUrl = $(".userbody").find('img').attr("src");
				//console.log("Updating " + car._id + " with " + imgUrl);

				request.get({url: imgUrl, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
				  var newFile = new FS.File();
				  newFile.attachData(buffer, {type: 'image/jpeg'}, function(error){
				      if(error) throw error;
				      newFile.name('carImage.jpeg');

				      var newImage = Images.insert(newFile);

				      Cars.update(car._id, {$set: {imageID: newImage._id}})

				  });
				}));
			});
		});

		//console.log("DONE!");

	};

	var saveImageLocally = function saveImageLocally(){
		var url = "http://images.craigslist.org/00b0b_5vNqTpyxLPb_600x450.jpg";
		var request = Meteor.npmRequire('request');

		request.get({url: url, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
		  var newFile = new FS.File();
		  newFile.attachData(buffer, {type: 'image/jpeg'}, function(error){
		      if(error) throw error;
		      newFile.name('myGraphic.jpeg');

		      Images.insert(newFile, function(err, fileObj){
		      	//console.log("WE MADE IT!" + fileObj._id);
		      });
		  });
		}));


	};

	Meteor.startup(function () {
		// code to run on server at startup
		populateCars();
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