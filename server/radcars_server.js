var fetchImagesQueue = new PowerQueue({
	maxFailures: 1,
	debug: true,
	maxProcessing: 2
});

Meteor.publish('images', function() {
	return Images.find({}, {
		"fields": {
			"_id": 1,
			"copies.master.key": 1
		}
	});
});


Meteor.publish('publication', function() {
	Counts.publish(this, 'images-counter', Images.find());
	Counts.publish(this, 'cars-counter', Cars.find());
	Counts.publish(this, 'cool-cars-counter', Cars.find({
		curation: {
			$ne: "LAME"
		}
	}));
});

Meteor.publish('singleCarAd', function(url) {
	//console.log("URL: " + url);
	return Cars.find({
		short_url: url
	});
});

Meteor.methods({
	repopulateCars: function() {
		populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM");
	},
	blowAwayData: function() {
		flushAllData();
	},
	deleteSearch: function(options) {
		Searches.remove(options.searchID);
		//flushAllData();
	},
	filterCars: function(options) {
		if (options.searchText.length < 2) return;
		//console.log("Filtering by: " + options.searchText);
		//CarPages.set({filters: {heading : new RegExp(options.searchText)}});
	},
	setCurationValue: function(options) {
		if (!options._id) return;
		//console.log("Updating " + options._id + " to " + options.curation);
		Cars.update(options._id, {
			$set: {
				curation: options.curation
			}
		});
		//console.log(x);
		//console.log("Filtering by: " + options.searchText);
		//CarPages.set({filters: {heading : new RegExp(options.searchText)}});
	},
	serveImagesThroughNginx: function() {
		//console.log(ConfigSettings("serve_images_through_nginx"));
		return ConfigSettings("serve_images_through_nginx");
	},
	setSelectedImageOnCar: function(options) {
		if (!options._id) return;
		//console.log("Updating " + options._id + " to " + options.curation);

		Cars.update(options._id, {
			$set: {
				selectedImage: options.selectedImage
			}
		});
	},
	incrementImagesQueue: function(){
		fetchImagesQueue.next("Manual increment of queue.");
	},
	resetImagesQueue: function(){
		fetchImagesQueue.reset();
	},
	imagesQueueLength: function(){
		return fetchImagesQueue.length();
	}
});

var flushAllData = function flushAllData() {
	console.log("Flushing Data.")
	fetchImagesQueue.reset();
	Cars.remove({});
	Images.remove({});
	populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM");
};

var populateCars = function populateCars(tier, source) {
	console.log("Getting car data for tier " + tier + "and source " + source);

	var searches = Searches.find({});
	var searchCounter = 1;

	searches.forEach(function(search) {
		//apiData.params.heading = search.headingSearchText;
		//apiData.params.tier = 0;

		var apiData = apiDataFactory(search.headingSearchText, tier, source);

		var lastupdated = new Date();


		console.log("Searching for: " + apiData.params.heading + " in " + searchCounter);
		console.log("Images queue running: " + fetchImagesQueue.isRunning() + " : " + fetchImagesQueue.isPaused() + " : " + fetchImagesQueue.length());

		Meteor.setTimeout(function() {
			Meteor.http.get(apiData.url, apiData, function(err, res) {
				console.log("Data returned!" + res.data.postings.length);
				//console.log(res.data);
				var postings = res.data.postings;
				_.each(postings, function(post) {
					//console.log("POST: " + post.heading)
					//var newCar = Cars.insert(post);
					var imageUrl = post.images && post.images[0] && post.images[0].full || post.images[0].thumb;
					var imageList = post.images;
					var newCar = Cars.upsert({
						external_id: post.external_id
					}, {
						$set: {
							//category: post.category,
							external_id: post.external_id,
							external_url: post.external_url,
							heading: post.heading,
							headingSearchable: post.heading.toLowerCase(),
							id: post.id,
							//imageList: [],
							//images: imageList,
							//location: post.location,
							cityname: CityName(post.location.city),
							price: post.price,
							source: post.source,
							timestamp: post.timestamp,
							lastupdated: lastupdated,
							body: post.body
						},
						$setOnInsert: {
							imageList: [],
							short_url: new Date().getTime().toString(36)
						}
					});
					//console.log("CAR");
					createImageList(newCar.insertedId, imageList);
					//fetchImage(newCar.insertedId, imageUrl);
				});

			});
		}, (searchCounter++) * 15000); // Make a new api call every 15 seconds

	});
};

var createImageList = function createImageList(postID, originalImageList) {

	if (!postID || !originalImageList) return;

	var returnImages = _.filter(originalImageList, function(i) {
		return i.full;
	});
	var pID = postID;
	var searchCounter = 1;

	returnImages = _.first(returnImages, 4);

	if (returnImages.length <= 0) return;

	Cars.update(pID, {
		$set: {
			selectedImage: 0
		}
	});

	_.each(returnImages, function(image) {
		//console.log(searchCounter);
		// Meteor.setTimeout(function() {

		// 	fetchImage(pID, image.full);
		// }, (searchCounter++) * 3000); // stagger these guys 5 seconds 

		fetchImagesQueue.add(function(done) {
			fetchImage(pID, image.full, done);
		});
	});


};



var fetchImage = function fetchImage(postID, imgUrl, done) {

	console.log("Fetching: " + imgUrl + " : " + fetchImagesQueue.length());
	
	//console.log("1");
	if (!postID || !imgUrl || imgUrl.length <= 0) {
		done();
		return;
	};

	var request = Meteor.npmRequire('request');
	var carObj = Cars.findOne(postID);

	if (!carObj){
		console.log("No car found!");
		done();
		return;
	};
	//console.log("2");
	request.get({
		url: imgUrl,
		encoding: null
	}, Meteor.bindEnvironment(function(e, r, buffer) {
		var newFile = new FS.File();
		//console.log("3");
		if (!buffer) {
			console.log("No buffer");
			done();
			return;
		}
		//console.log("4");
		newFile.attachData(buffer, {
			type: 'image/jpeg'
		}, function(error) {
			if (error) {
				done();
				throw error;
			};
			newFile.name('carImage.jpeg');
			//console.log("6");
			var newImage = Images.insert(newFile);
			//console.log("7");
			Cars.update(carObj._id, {
				//$set: {
				//imageID: newImage._id,
				//imageDirectUrl: "images-" + newImage._id + "-carImage.jpeg"
				//}
				$push: {
					imageList: {
						url: "images-" + newImage._id + "-carImage.jpeg",
						id: newImage._id
					}
				}
			});
			//console.log("8");
			done();

		});
	}));


};

var pruneCars = function pruneCars() {

	var expiresDate = new Date();
	expiresDate.setDate(expiresDate.getDate() - 1);
	//expiresDate.setSeconds(expiresDate.getSeconds() - 30);

	//var carsToDelete = Cars.find({lastupdated: {$lt : expiresDate}});

	//console.log("Cars to delete: " + carsToDelete.count() + " of " + Cars.find().count() + " at " + expiresDate.toLocaleTimeString());

	var deletedCars = Cars.remove({
		lastupdated: {
			$lt: expiresDate
		}
	});

	// console.log("Cars left: " + Cars.find().count());

	Meteor.setTimeout(pruneImages, 1000);
};

var pruneImages = function pruneImages() {

	// Get all the used images from the Cars collection
	var usedImagesSearch = Cars.find({}, {
		fields: {
			imageID: 1,
			_id: 0
		}
	}).fetch();
	var usedImages = [];

	usedImagesSearch.forEach(function(car) {
		if (car.imageID) usedImages.push(car.imageID);
	});

	// console.log("Pruning Images");


	// var imagesToDelete = Images.find({_id: {$nin : usedImages}});

	// console.log(imagesToDelete.count());

	Images.remove({
		_id: {
			$nin: usedImages
		}
	});


};

var apiDataFactory = function apiDataFactory(heading, tier, source) {

	var apiRetVals = "id,source,category,location,external_id,external_url,heading,timestamp,price,images,body";

	return {
		url: "http://search.3taps.com",

		params: {
			"auth_token": ConfigSettings("cars_authtoken"),
			"retvals": apiRetVals,
			"rpp": "25",
			"lat": "37.7833",
			"long": "122.4167",
			//"radius":"250mi",
			"source": source,
			//"sort":"distance",
			//"location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
			"location.state": "USA-CA|USA-OR|USA-WA",
			//"location.county": "USA-CA-SAF|USA-CA-STL|USA-OR-WAH",
			"category": 'VAUT',
			"status": "for_sale",
			"has_image": "1",
			"tier": tier,
			"heading": heading
		}
	};
};

Meteor.startup(function() {

	AccountsEntry.config({
		signupCode: ConfigSettings("site_signup_code") //, // only restricts username+password users, not OAuth
			//defaultProfile: someDefault: 'default'
	});

	// Update tier 0 every 1 hour
	var populateTier0Interval = Meteor.setInterval(function() {
		populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM")
	}, 3600000);

	// Update tier 1 every hour
	// REMOVED THIS SEARCH FOR NOW, TOO MANY OLD RESULTS
	// var populateTier1Interval = Meteor.setInterval(function() {
	// 	populateCars(1, "CRAIG|AUTOC|AUTOD|EBAYM")
	// }, 3600000);

	// Prune old cars and images every night at midnight-ish
	var pruneCarsInterval = Meteor.setInterval(function() {
		if (new Date().getHours() === 0) pruneCars();
	}, 3600000); //check every hour

});