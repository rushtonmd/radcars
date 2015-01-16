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
	auth: function() {
		return Cars.findOne();
	},
	availableSettings: {
		sort: true,
		filters: true
	},
	itemTemplate: 'car',
	infinite: true,
	limit: 10,
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
	routeSettings: function(route) {
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