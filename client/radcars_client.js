Meteor.subscribe('images');
Meteor.subscribe('publication');


Handlebars.registerHelper("prettifyDate", function(timestamp) {
	return new Date(timestamp * 1000).toLocaleString();
});

Handlebars.registerHelper("prettifyMoney", function(money) {
	return accounting.formatMoney(money);
});

Handlebars.registerHelper("shortifyBody", function(body) {
	if (body.length > 500) return body.substring(0, 500) + "...";
	return body;
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
	isUserAnAdmin: function() {
		return Meteor.userId();
	},
	imagesCount: function() {
		return Counts.get('images-counter');
	},
	carsCount: function() {
		return Counts.get('cars-counter');
	}
});


Template.body.rendered = function() {
	if (!this._rendered) {
		this._rendered = true;
	}
};

var setFiltersOnCars = function setFiltersOnCars(filterText) {
	CarPages.set({
		filters: {
			headingSearchable: {
				$regex: filterText
			},
			curation: {
				$ne: "LAME"
			}
		},
		sort: {
			timestamp: -1
		}
	});
};

var setFiltersOnCarCuration = function setFiltersOnCars(filterText) {
	CarCurationPages.set({
		filters: {
			headingSearchable: {
				$regex: filterText
			}
		},
		sort: {
			timestamp: -1
		}
	});
};

Template.body.events({
		'click button.refresh-data': function() {
			//console.log("REPOPULATING!");
			Meteor.call('repopulateCars');
		},
		'keyup input.filter-cars-text': function() {
			var inputBox = $("input.filter-cars-text");
			var text = inputBox.val().toLowerCase();
			setFiltersOnCars(text);
			setFiltersOnCarCuration(text);
		},
		'click button.clear-search-button': function() {
			var inputBox = $("input.filter-cars-text");
			var text = inputBox.val("");
			setFiltersOnCars("");
			setFiltersOnCarCuration("");
		}
	})
	// counter starts at 0
	//Session.setDefault("counter", 0);

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
		return img && img.isUploaded() && img.hasStored("master") && img.url() || "/noimage.jpg";
	}
});

Template.carAdTemplate.helpers({
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
		return img && img.isUploaded() && img.hasStored("master") && img.url() || "/noimage.jpg";
	}
});

Template.car.events({
	'click .share-ad': function(event) {

		//window.open('https://twitter.com/share?url='+escape(window.location.href)+'&text='+document.title + ' via @' + twitterHandle, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');

		var mediaID = $(event.currentTarget).attr('car-ad-id');
		// console.log("MediaID: " + mediaID);
		// Find the car with that ID
		var selectedCar = Cars.findOne(mediaID);
		// var img = Images.findOne(selectedCar.imageID);
		// imageUrl = img && img.isUploaded() && img.hasStored("master") && img.url() || "/noimage.jpg";
		// console.log("Car: " + selectedCar.heading);
		// $('textarea.share-meta-data-title').val(selectedCar.heading);
		// $('textarea.share-meta-data-url').val(selectedCar.external_url);
		// $('textarea.share-meta-data-thumbnail').val(imageUrl);

		var hashtags = encodeURIComponent("tirekickus");
		var text = encodeURIComponent(selectedCar.heading);
		var via = encodeURIComponent("tirekickus");
		var twitterShareurl = encodeURIComponent((Meteor.absoluteUrl() || "http://tirekick.us/") + "tw/" + selectedCar.short_url);
		var url = encodeURIComponent(selectedCar.external_url);
		var href = 'https://twitter.com/intent/tweet?hashtags=' + hashtags + "&text=" + text + "&url=" + twitterShareurl + "&via=" + via;
		$('a.twitter-share-button').attr("href", href);


		//"https://twitter.com/intent/tweet?hashtags=example%2Cdemo&amp;original_referer=http%3A%2F%2Flocalhost%3A3000%2F&amp;related=twitterapi%2Ctwitter&amp;text=custom%20share%20text&amp;tw_p=tweetbutton&amp;url=https%3A%2F%2Fdev.twitter.com%2Fweb%2Ftweet-button&amp;via=twitterdev"

		// twitterShareButton = $('a.twitter-share-button');
		// twitterShareButton.attr('href', 'https://twitter.com/share');
		// //link.setAttribute('class', 'twitter-share-button');
		// //link.setAttribute('style', 'margin-top:5px;');
		// //link.setAttribute('id', 'twitterbutton');
		// twitterShareButton.attr("data-text", "" + selectedCar.heading + "");
		// twitterShareButton.attr("data-via", "@tirekickus");
		// twitterShareButton.attr("data-size", "large");
		// twitterShareButton.attr("data-url", "http://google.com");
		// twitterShareButton.attr("data-hashtags", "tirekickus");
		//link.setAttribute("url", "http://preview.netcarshow.com/Mazda-RX7-1999-hd.jpg");

		// Put it inside the twtbox div
		//tweetdiv  =  document.getElementById('twtbox');
		//tweetdiv.appendChild(link);

		//twttr.widgets.load(); //very important

		var directUrl = (Meteor.absoluteUrl() || "http://tirekick.us/") + "dl/" + selectedCar.short_url;
		$('input.direct-ad-link').val(directUrl);
		$('#shareModal').modal('show');

		// $("button.save-changes-to-media").attr('media-id', mediaID);
		// var newTitle = $("div.media-item[media-id='" + mediaID + "']").find(".media-heading").html();
		// $(".modal-header .media-title").val(newTitle);
		// var newBody = $("div.media-item[media-id='" + mediaID + "']").find(".media-body p").html();
		// $(".modal-body .media-description").val(newBody);
		// var thumbnailSource = $("div.media-item[media-id='" + mediaID + "']").find("div.thumbnail").attr('thumbnail_src');
		// $(".modal-body img.media-object").attr('src', thumbnailSource);
		// var masterSource = $("div.media-item[media-id='" + mediaID + "']").find("div.thumbnail").attr('full_size_src');
		// $(".modal-body a.media-object").attr('href', masterSource);
		// var metaWidth = $("div.media-item[media-id='" + mediaID + "']").find("div.thumbnail").attr('meta_width');
		// var metaHeight = $("div.media-item[media-id='" + mediaID + "']").find("div.thumbnail").attr('meta_height');
		// /* $(".modal-body span.height-width").html(metaWidth + " x " + metaHeight);*/
		// $("input.image-width").val(metaWidth);
		// $("input.image-height").val(metaHeight);

	}
});

Template.shareModal.helpers({
	shareData: function() {
		var carTitle = $('textarea.share-meta-data-title').val();
		var carUrl = $('textarea.share-meta-data-url').val();
		var carThumb = $('textarea.share-meta-data-thumbnail').val();
		var returnData = {
			title: carTitle,
			url: carUrl,
			thumbnail: "http://tirekick.us/sm" + carThumb

		};
		console.log(returnData);
		return returnData;

	}
});

Template.shareModal.events({
	'click .popup': function(event) {
		//console.log($('a.twitter-share-button').attr("href"));
		var shareUrl = $('a.twitter-share-button').attr("href").toString();
		var randomnumber = Math.floor((Math.random() * 100) + 1);

		var width = 575,
			height = 445,
			left = ($(window).width() - width) / 2,
			top = ($(window).height() - height) / 2,
			url = shareUrl,
			opts = 'status=1' +
			',width=' + width +
			',height=' + height +
			',top=' + top +
			',left=' + left;

		window.open(url, 'twitter ' + randomnumber, opts);

		$('#shareModal').modal('hide');

		return false;
	},
	'click .direct-ad-link': function() {
		$('.direct-ad-link').select();

	}
});


Template.cars.rendered = function() {
	if (!this._rendered) {
		//Meteor.call('repopulateCars');
		//console.log("REPOPULATING!");
		var inputBox = $("input.filter-cars-text");
		var text = inputBox.val("");
		setFiltersOnCars("");
		this._rendered = true;
	}
};

Template.cars.helpers({
	moreCoolCars: function() {
		//console.log(Counts.get('cool-cars-counter') + " : " + Cars.find({curation: {$ne: "LAME"}}).count());
		return Counts.get('cool-cars-counter') > Cars.find({
			curation: {
				$ne: "LAME"
			}
		}).count();
	}
});

Template.car.rendered = function() {
	//console.log("here!");
	this.$("div.thumbnail").fadeIn(1000);
};

Template.carCuration.helpers({
	moreCoolCars: function() {
		//console.log(Counts.get('cool-cars-counter') + " : " + Cars.find().count());
		return Counts.get('cool-cars-counter') > Cars.find().count();
	}
});

Template.carCuration.rendered = function() {
	if (!this._rendered) {
		//Meteor.call('repopulateCars');
		//console.log("REPOPULATING!");
		var inputBox = $("input.filter-cars-text");
		var text = inputBox.val("");
		setFiltersOnCarCuration("");
		this._rendered = true;
	}
};


Template.carCurationItem.rendered = function() {
	//console.log("here!");
	this.$("div.thumbnail").fadeIn(1000);
};

Template.carCurationItem.events({
	"click button.toggle-curation-lame": function(event) {
		var newValue = (this.curation === "LAME") ? "" : "LAME";
		Meteor.call('setCurationValue', {
			_id: this._id,
			curation: newValue
		});
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
		return img && img.isUploaded() && img.hasStored("master") && img.url() || "/noimage.jpg";
	},
	lameCar: function() {
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

	SEO.config({
		title: 'TireKick.us',
		meta: {
			'description': 'TireKick - Rad cars for sale on the west coast.'
		},
		og: {
			'image': 'http://tirekick.us/images/images-k4Y6TFuMXP6X2NhGu-carImage.jpeg'
		},
		twitter: {
			'image': 'http://tirekick.us/images/images-k4Y6TFuMXP6X2NhGu-carImage.jpeg'
		},
		auto: {
			twitter: true,
			og: true,
			set: ['description', 'url', 'title']
		}
		//test this images-ZZ5GfgK4TczsLE86k-carImage.jpeg

	});

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