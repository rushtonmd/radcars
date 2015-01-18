Meteor.publish('images', function() {
	return Images.find();
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
		if (!options._id || !options.curation) return;
		//console.log("Updating " + options._id + " to " + options.curation);
		Cars.update(options._id, {$set: {curation: options.curation}});
		//console.log(x);
		//console.log("Filtering by: " + options.searchText);
		//CarPages.set({filters: {heading : new RegExp(options.searchText)}});
	}
});

var flushAllData = function flushAllData() {
	console.log("Flushing Data.")
	Cars.remove({});
	Images.remove({});
	populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM");
};

var populateCars = function populateCars(tier, source) {
	//console.log("Getting car data for tier " + tier + "and source " + source);

	var searches = Searches.find({});
	var searchCounter = 1;

	searches.forEach(function(search) {
		//apiData.params.heading = search.headingSearchText;
		//apiData.params.tier = 0;

		var apiData = apiDataFactory(search.headingSearchText, tier, source);
		
		console.log("Searching for: " + apiData.params.heading);

		Meteor.setTimeout(function() {
			Meteor.http.get(apiData.url, apiData, function(err, res) {
				console.log("Data returned!" + res.data.postings.length);
				//console.log(res.data);
				var postings = res.data.postings;
				_.each(postings, function(post) {
					//console.log("POST: " + post.heading)
					//var newCar = Cars.insert(post);
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
							images: post.images,
							//location: post.location,
							cityname: CityName(post.location.city),
							price: post.price,
							source: post.source,
							timestamp: post.timestamp,
							lastupdated: new Date()
						}
					});
					//console.log(newCar);
					fetchImage(newCar.insertedId);
				});

			});
		}, (searchCounter++) * 5000);

	});
};

var fetchImage = function fetchImage(postID) {
	if (!postID) return;
	var request = Meteor.npmRequire('request');
	var carObj = Cars.findOne(postID);
	//console.log(carObj.heading + " : " + carObj.images[0].full);
	if (!carObj || !carObj.images || carObj.images.length <= 0) return;

	var imgUrl = carObj.images[0].full || carObj.images[0].thumb;

	request.get({
		url: imgUrl,
		encoding: null
	}, Meteor.bindEnvironment(function(e, r, buffer) {
		var newFile = new FS.File();
		newFile.attachData(buffer, {
			type: 'image/jpeg'
		}, function(error) {
			if (error) throw error;
			newFile.name('carImage.jpeg');

			var newImage = Images.insert(newFile);

			Cars.update(carObj._id, {
				$set: {
					imageID: newImage._id
				}
			})

		});
	}));



};

var apiDataFactory = function apiDataFactory(heading, tier, source) {

	var apiRetVals = "id,source,category,location,external_id,external_url,heading,timestamp,price,images";

	return {
		url: "http://search.3taps.com",

		params: {
			"auth_token": ConfigSettings("cars_authtoken"),
			"retvals": apiRetVals,
			"rpp": "50",
			"lat": "37.7833",
			"long": "122.4167",
			//"radius":"250mi",
			"source": source,
			//"sort":"distance",
			"location.region": "USA-SFO-EAS|USA-SFO-NOR|USA-SFO-PEN|USA-SFO-SAF|USA-SFO-SOU",
			//"location.state":"USA-CA",
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

	// Update tier 0 every minute
	var populateTier0Interval = Meteor.setInterval(function() {
		populateCars(0, "CRAIG|AUTOC|AUTOD|EBAYM")
	}, 300000);

	// Update tier 1 every 15 minutes
	var populateTier1Interval = Meteor.setInterval(function() {
		populateCars(1, "CRAIG|AUTOC|AUTOD|EBAYM")
	}, 900000);

});