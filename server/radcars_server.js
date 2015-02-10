// var fetchImagesQueue = new PowerQueue({
// 	maxFailures: 1,
// 	debug: true,
// 	maxProcessing: 2
// });

// let's try jobs!
var carSearchJobs = JobCollection('carSearchJobQueue');

// Meteor.publish('allSearchJobs', function() {
// 	return carSearchJobs.find({});
// });

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
	incrementImagesQueue: function() {
		//fetchImagesQueue.next("Manual increment of queue.");
	},
	resetImagesQueue: function() {
		console.log("Resetting cars and images queues.")
		setupCarSearchJobs(0, "CRAIG|AUTOC|AUTOD|EBAYM");
		carSearchJobs.startJobs();
		//fetchImagesQueue.reset();
	},
	imagesQueueLength: function() {
		return carSearchJobs.find().count();
	}
});

var flushAllData = function flushAllData() {
	console.log("Flushing Data.")
		//fetchImagesQueue.reset();
	Cars.remove({});
	Images.remove({});

	setupCarSearchJobs(0, "CRAIG|AUTOC|AUTOD|EBAYM");
	//populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM");
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

		var job = carSearchJobs.createJob('carSearch', {
			"searchText": search.headingSearchText,
			"tier": tier,
			"source": source
		});

		job.repeat({
			repeats: Job.forever,
			wait: 1000
		});

		job.priority('normal');

		job.save();

		return;

		//console.log("Searching for: " + apiData.params.heading + " in " + searchCounter);
		//console.log("Images queue running: " + fetchImagesQueue.isRunning() + " : " + fetchImagesQueue.isPaused() + " : " + fetchImagesQueue.length());


		//Change this to a QUEUE instead


		Meteor.setTimeout(function() {
			Meteor.http.get(apiData.url, apiData, function(err, res) {
				//console.log("Data returned!" + res.data.postings.length);
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

		// fetchImagesQueue.add(function(done) {
		// 	fetchImage(pID, image.full, done);
		// });

		job = carSearchJobs.createJob('processImage', {
			"postID": pID,
			"url": image.full
		});

		job.retry({
			retries: 3, // Retry 3 times,
			wait: 20000, // waiting 20 seconds between attempts
			backoff: 'constant' // wait constant amount of time between each retry
		});

		job.priority('high');

		job.save();
	});


};



var fetchImage = function fetchImage(postID, imgUrl, done) {

	//console.log("Fetching: " + imgUrl + " : " + fetchImagesQueue.length());

	//console.log("1");
	if (!postID || !imgUrl || imgUrl.length <= 0) {
		done();
		return;
	};

	var request = Meteor.npmRequire('request');
	var carObj = Cars.findOne(postID);

	if (!carObj) {
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
			imageList: 1,
			_id: 0
		}
	}).fetch();
	var usedImages = [];

	usedImagesSearch.forEach(function(car) {
		if (car.imageList && car.imageList.length > 0) {
			_.each(car.imageList, function(image) {
				usedImages.push(image.id);
			});
		};
	});

	// console.log("Pruning Images");


	// var imagesToDelete = Images.find({_id: {$nin : usedImages}});

	//console.log(usedImages.length + " : " + Images.find().count());

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

var setupCarSearchJobs = function(tier, source) {

	//console.log(carSearchJobs.find({}).count());
	//console.log(carSearchJobs.findOne());
	carSearchJobs.remove({
		'type': 'carSearch'
	});
	carSearchJobs.remove({
		'type': 'processImage'
	});
	//console.log(carSearchJobs.find({}).count());



	var searches = Searches.find({});
	var frequency = 3600000;
	var job = {};

	// Loop through all the searches and create jobs
	searches.forEach(function(search) {
		job = carSearchJobs.createJob('carSearch', {
			"searchText": search.headingSearchText,
			"tier": tier,
			"source": source
		});

		job.repeat({
			repeats: Job.forever,
			wait: frequency
		});

		job.priority('normal');

		job.save();

	});

	//console.log(carSearchJobs.find({}).count());

	// .retry({
	// 	retries: 5,
	// 	wait: 15 * 60 * 1000
	// }) // 15 minutes between attempts
	//.repeat({repeats: Job.forever})
	//.delay(60 * 60 * 1000) // Wait an hour before first try
	//.save(); // Commit it to the server

};

var searchWorkers = Job.processJobs('carSearchJobQueue', 'carSearch', {
		concurrency: 1,
		cargo: 1,
		pollInterval: 15000, // 15 second polling for new jobs
		prefetch: 0
	},
	function(job, cb) {

		console.log("Search: " + job.data.searchText);
		//console.log(job.data);

		var tier = job.data.tier;
		var source = job.data.source;
		var searchText = job.data.searchText;

		var apiData = apiDataFactory(searchText, tier, source);

		var lastupdated = new Date();

		Meteor.http.get(apiData.url, apiData, function(err, res) {
			//console.log(err);
			//console.log("Data returned!" + res.data.postings.length);
			//console.log(res.data);
			if (res && res.data) {
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
					//console.log(newCar);
					createImageList(newCar.insertedId, imageList);
				});
			};

			job.done();
			cb();

		});



	});

var imageWorkers = Job.processJobs('carSearchJobQueue', 'processImage', {
		concurrency: 1,
		cargo: 1,
		pollInterval: 2000,
		prefetch: 0
	},

	function(job, cb) {

		var postID = job.data.postID;
		var url = job.data.url;

		//console.log("Processing Image " + url);

		fetchImage(postID, url, function() {
			job.done();
			cb();
		});

	});

Meteor.startup(function() {

	// Ensure MongoDB Indexes
	carSearchJobs._ensureIndex({
		_id: 1,
		type: 1,
		status: 1
	});
	Cars._ensureIndex({
		_id: 1,
		external_id: 1,
		lastupdated: 1,
		id: 1
	});


	AccountsEntry.config({
		signupCode: ConfigSettings("site_signup_code") //, // only restricts username+password users, not OAuth
			//defaultProfile: someDefault: 'default'
	});

	// Update tier 0 every 1 hour
	// var populateTier0Interval = Meteor.setInterval(function() {
	// 	populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM")
	// }, 3600000);

	// Update tier 1 every hour
	// REMOVED THIS SEARCH FOR NOW, TOO MANY OLD RESULTS
	// var populateTier1Interval = Meteor.setInterval(function() {
	// 	populateCars(1, "CRAIG|AUTOC|AUTOD|EBAYM")
	// }, 3600000);

	// Prune old cars and images every night at midnight-ish
	var pruneCarsInterval = Meteor.setInterval(function() {
		if (new Date().getHours() === 0) pruneCars();
	}, 3600000); //check every hour

	carSearchJobs.startJobs();

	setupCarSearchJobs(0, "CRAIG|AUTOC|AUTOD|EBAYM");

});