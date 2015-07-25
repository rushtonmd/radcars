// let's try jobs!
var carSearchJobs = JobCollection('carSearchJobQueue');



// TEST TEST TEST


var setupCarSearchJobsCL = function() {

	var searches = Searches.find({});
	var frequency = 3600000; //3600000
	var job = {};

	// Loop through all the searches and create jobs
	searches.forEach(function(search) {
		job = carSearchJobs.createJob('carSearchCL', {
			"searchText": search.headingSearchText
		});

		job.repeat({
			repeats: Job.forever,
			wait: frequency
		});

		job.priority('normal');

		job.save();

		//console.log("job saved");

	});

};

var searchWorkersCL = Job.processJobs('carSearchJobQueue', 'carSearchCL', {
		concurrency: 1,
		cargo: 1,
		pollInterval: 15000, // TODO change back to 15 second polling for new jobs
		prefetch: 0
	},
	function(job, cb) {
		console.log("SearchWorkerCL");

		var baseSearchUrl = "http://sfbay.craigslist.org/search/cta?srchType=T&hasPic=1&sort=date&searchNearby=1&nearbyArea=373&nearbyArea=285&nearbyArea=96&nearbyArea=102&nearbyArea=12&nearbyArea=97&format=rss&query=";

		//1968&charger|1969&charger
		// Convert search string in database to craigsliststring
		var sText = job.data.searchText;
		//var finalSearchText = replaceAll("|", "%7C", sText);//.replaceAll(" ", "+", sText).replaceAll("(", "%28",sText).replaceAll(")", "%29", sText);


		var finalSearchText = sText.split(" ").join("+");
		finalSearchText = finalSearchText.split("|").join("%7C");
		finalSearchText = finalSearchText.split("(").join("%28");
		finalSearchText = finalSearchText.split(")").join("%29");

		// Get the initial search results
		var websiteDataXML = Scrape.feed(baseSearchUrl + finalSearchText);

		//console.log("Search: " + finalSearchText);

		// items is a list of found cars
		var searchResults = websiteDataXML.items;

		console.log("CL Search: " + finalSearchText + " : Found: " + searchResults.length);

		var updatedResults = searchResults.map(function(obj) {

			var itemDataURL = Scrape.url(obj.link);
			var itemDeets = {};

			//console.log(obj.link);

			itemDeets.title = itemDataURL.match(/<title>([^<]*)<\/title>/i);
			itemDeets.price = itemDataURL.match(/<span class="price">([^<]*)<\/span>/i);
			itemDeets.body = itemDataURL.substring(itemDataURL.indexOf('<section id="postingbody">') + '<section id="postingbody">'.length);
			itemDeets.body = itemDeets.body.substring(0, itemDeets.body.indexOf("</section>"));

			itemDeets.imageLink = itemDataURL.substring(itemDataURL.indexOf('<div id="1_image_'));
			itemDeets.imageLink = itemDeets.imageLink.substring(itemDeets.imageLink.indexOf('<img src="') + '<img src="'.length);
			itemDeets.imageLink = itemDeets.imageLink.substring(0, itemDeets.imageLink.indexOf('"'));

			itemDeets.city = itemDataURL.substring(itemDataURL.indexOf('<span class="postingtitletext">'));
			if (itemDeets.city.indexOf('<small> (') < 0) itemDeets.city = "SF Bay Area";
			else {
				itemDeets.city = itemDeets.city.substring(itemDeets.city.indexOf('<small> (') + '<small> ('.length);
				itemDeets.city = itemDeets.city.substring(0, itemDeets.city.indexOf(')'));
			}

			if (itemDataURL.indexOf('"updated: "') >= 0) itemDeets.lastupdated = "";
			else {
				itemDeets.lastupdated = itemDataURL.substring(itemDataURL.indexOf('"updated: "'));
				itemDeets.lastupdated = itemDeets.lastupdated.substring(itemDeets.lastupdated.indexOf('datetime="') + 10);
				itemDeets.lastupdated = itemDeets.lastupdated.substring(0, itemDeets.lastupdated.indexOf('"'));
				itemDeets.lastupdated = Date.parse(itemDeets.lastupdated);
			}

			//console.log(itemDeets.lastupdated);

			//itemDeets.imageLink = itemDataURL.match(/<div id="thumbs">([^<]*)<\/div>/i);

			if (!itemDeets.title || !itemDeets.price || !itemDeets.body || !itemDeets.imageLink || !itemDeets.lastupdated) return null;

			itemDeets.title = itemDeets.title[1];
			itemDeets.price = itemDeets.price[1];

			return {
				id: new Date().getTime(),
				external_id: obj.link,
				external_url: obj.link,
				heading: itemDeets.title,
				body: itemDeets.body,
				imageLink: itemDeets.imageLink,
				price: itemDeets.price,
				city: itemDeets.city,
				lastupdated: itemDeets.lastupdated
			};

		});

		// // Loop through each of the found cars
		_.each(updatedResults, function(post) {

			if (!post) return;

			//console.log(post);

			//var imageUrl = post;
			var iList = [post.imageLink];
			var lastupdated = new Date();

			// Try to remove duplicate postings (with the same exact heading)
			if (Cars.find({heading: post.heading}).count() > 0) return;

			//console.log(iList);
			var newCar = Cars.upsert({
				external_id: post.external_id
			}, {
				$set: {
					external_id: post.external_id,
					external_url: post.external_url,
					heading: post.heading,
					headingSearchable: post.heading.toLowerCase(),
					id: post.id,
					cityname: post.city,
					price: post.price,
					source: post.source,
					timestamp: post.lastupdated,
					lastupdated: post.lastupdated,
					body: post.body
				},
				$setOnInsert: {
					imageList: [],
					short_url: new Date().getTime().toString(36)
				}
			});
			//console.log(newCar);
			createImageList(newCar.insertedId, iList);

		});

		job.done();
		cb();

		//};
	});


// TEST TEST TEST


// var fetchImagesQueue = new PowerQueue({
// 	maxFailures: 1,
// 	debug: true,
// 	maxProcessing: 2
// });

// let's try jobs!
// var carSearchJobs = JobCollection('carSearchJobQueue');

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
		startAllSearches();
		carSearchJobs.startJobs();
	},
	imagesQueueLength: function() {
		return carSearchJobs.find().count();
	},
	numberOfCars: function() {
		return Cars.find().count();
	},
	numberOfImages: function() {
		return Images.find().count();
	},
	pruneCars: function() {
		pruneCars();
	}
});

var flushAllData = function flushAllData() {
	console.log("Flushing Data.")
		//fetchImagesQueue.reset();
	Cars.remove({});
	Images.remove({});

	startAllSearches();
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
				// TODO NEED TO COMMENT
				//console.log(res.data);
				var postings = res.data.postings;

				_.each(postings, function(post) {
					//console.log("POST: " + post);
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
		return i.full || i;
	});
	var pID = postID;
	var searchCounter = 1;

	console.log("Return: " + returnImages);

	returnImages = _.first(returnImages, 2);

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
			"url": image.full || image
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

	console.log("Pruning cars.");

	var expiresDate = new Date();
	expiresDate.setDate(expiresDate.getDate() - 1);

	console.log("Pruning cars not updated since " + expiresDate);
	//expiresDate.setSeconds(expiresDate.getSeconds() - 30);

	//var carsToDelete = Cars.find({lastupdated: {$lt : expiresDate}});

	//console.log("Cars to delete: " + carsToDelete.count() + " of " + Cars.find().count() + " at " + expiresDate.toLocaleTimeString());

	var deletedCars = Cars.remove({
		lastupdated: {
			$lt: expiresDate
		}
	});

	console.log("Cars left: " + Cars.find().count());

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
			console.log(err);
			console.log("Data returned!" + res.data.postings.length);
			console.log(res.data);
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

var startAllSearches = function startAllSearches() {

	// Blow away car and image jobs

	carSearchJobs.remove({
		'type': 'carSearchCL'
	});
	carSearchJobs.remove({
		'type': 'carSearch'
	});
	carSearchJobs.remove({
		'type': 'processImage'
	});

	setupCarSearchJobs(0, "AUTOC|AUTOD|EBAYM");

	setupCarSearchJobsCL();
};


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

	// Prune old cars and images every 4 hours ish to save memory
	var pruneCarsInterval = Meteor.setInterval(function() {
		var d = new Date().getHours();
		if (d % 4 === 0) pruneCars();
	}, 3600000); //check every hour

	//var job = new Job(carSearchJobs, 'carSearch'); 
	
	

	startAllSearches();


	carSearchJobs.startJobs();

});