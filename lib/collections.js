Cars = new Mongo.Collection("cars");
Searches = new Mongo.Collection("searches");

Router.configure({
	notFoundTemplate: 'four-oh-four'
});



this.adminRouteController = RouteController.extend({
	onBeforeAction: function() {
		Router.go('/admin/curation');
		return this.next();
	}
});

this.shortUrlRouteControler = RouteController.extend({
	onBeforeAction: function() {
		Router.go('/admin/curation');
		return this.next();
	}
});


Router.route('/admin', {
	template: 'admin',
	layoutTemplate: 'layout',
	controller: 'adminRouteController'
});


CarPages = new Meteor.Pagination(Cars, {
	router: "iron-router",
	//homeRoute: ["/", "/curation/"],
	homeRoute: "/",
	route: "/",
	//routerTemplate: "car",
	routerLayout: "cars",
	routeSettings: function(route) {
		//AccountsEntry.signInRequired(route);
		return this.set("filters", route.route._path === "/" ? {
			curation: {
				$ne: "LAME"
			}
		} : {});
		//console.log(route.route._path);
	},
	// auth: function() {
	// 	return this.Collection.find({
	// 		curation: {
	// 			$ne: "LAME"
	// 		}

	// 	});
	// },
	templateName: "cars",
	availableSettings: {
		sort: true,
		filters: true
	},
	itemTemplate: 'car',
	infinite: true,
	limit: 10,
	infiniteRateLimit: 1.5,
	infiniteTrigger: 50,
	perPage: 5,
	sort: {
		timestamp: -1
	}
});



CarCurationPages = new Meteor.Pagination(Cars, {
	router: "iron-router",
	//homeRoute: ["/", "/curation/"],
	homeRoute: ["/admin/curation/"],
	route: "/admin/curation/",
	routerTemplate: "carCuration",
	routerLayout: "carCuration",
	//routeSettings: function(route) {
	//return AccountsEntry.signInRequired(route);
	//},
	// auth: function() {
	// 	return Cars.find({
	// 		headingSearchable: {
	// 			$regex: "q5"
	// 		}

	// 	});
	// },
	availableSettings: {
		sort: true,
		filters: true
	},
	templateName: "carCuration",
	itemTemplate: 'carCurationItem',
	infinite: true,
	limit: 10,
	infiniteRateLimit: 1.5,
	infiniteTrigger: 50,
	perPage: 5,
	sort: {
		timestamp: -1
	}
});

CarSearchPages = new Meteor.Pagination(Searches, {
	router: "iron-router",
	homeRoute: ["/admin/searches/"],
	route: "/admin/searches/",
	routerTemplate: "searches",
	routerLayout: "searches",
	//routeSettings: function(route) {
	//AccountsEntry.signInRequired(route);
	//},
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

var IR_BeforeHooks = {
	onBeforeAction: function() {
		//console.log("HERE!");
		AccountsEntry.signInRequired(this);
	},
	isLoggedIn: function(pause) {
		if (!(Meteor.loggingIn() || Meteor.user())) {
			Notify.setError(__('Please login.'));
			this.render('sign-in');
			pause();
		}
	}

};

Router.onBeforeAction(IR_BeforeHooks.onBeforeAction, {
	only: ['cars2_home0', 'searches_home0']
});

// Router.route('four-oh-four', function(){
// 	this.response.writeHead(404, {
// 		'Content-Type': 'text/html'
// 	});
// 	this.response.end();
// }//,
// 	//{path: '/404'}//, 
// 	//layoutTemplate: '404'}
// 	);

Router.route('/:source/:_id', function() {

	//console.log("ID: " + this.params._id + " : " + this.params.source);

	if (Cars.find({
			short_url: this.params._id
		}).count() <= 0) {
		this.redirect('/nothing-found');
		this.next();
		return 0;
	}


	this.render('carAdTemplate');

}, {

	onBeforeAction: function() {

		CarPages.unsubscribe();
		CarCurationPages.unsubscribe();
		CarSearchPages.unsubscribe();
		return this.next();
	},
	waitOn: function() {
		if (Meteor.isClient) {
			return Meteor.subscribe('singleCarAd', this.params._id);
		}
	},
	data: function() {
		return Cars.findOne();
	},
	onAfterAction: function() {
			//console.log("HERY");
			//var post;
			// The SEO object is only available on the client.
			// Return if you define your routes on the server, too.
			if (!Meteor.isClient) {
				return;
			}
			//post = this.data().post;
			var car = this.data();
			if (!car) return;


			var image = "/noimage.jpg";

			var img = Images.findOne(car.imageID);

			if (img && img.isUploaded() && img.hasStored("master") && img.url() && img.copies.master.key){
				image = "http://tirekick.us/images/" + img.copies.master.key;
			}

			var currentRouter = Router.current();
			var url = Router.url(currentRouter.route.getName(), currentRouter.params);
			SEO.set({
				meta: {
					'description': "TireKick For Sale: " + car.heading
				},
				og: {
					'description': "TireKick For Sale: " + car.heading,
					'image': image
				},
				twitter: {
					'card': 'summary',
					'site': '@tirekickUS',
					'title': "TireKick For Sale: " + car.heading,
					'image': image
						//'image': "http://tirekick.us" + image
						//'image:src': "http://tirekick.us" + image
				}
			});
		}
		//});
		// var source = this.params.source;
		// var _id = this.params._id;

	// if (source != "tw" && source != "dl") {
	// 	this.next();
	// 	return 0;
	// };

	// var c = Cars.findOne({short_url: this.params._id});
	// console.log("Car: " + c.heading);
	// var redirectUrl = c.external_url;

	// this.response.writeHead(302, {
	//   'Location': redirectUrl
	// });

	// this.response.end();
	//this.next();
});

Router.route("/(.*)", function() {
	this.next();
});

// Router.route('/s/(.*)', function() {
// 	//this.response.writeHead(404, {
// 		//'Content-Type': 'text/html'
// 	//});
// 	console.log("TEST");
// 	//this.render('sign-in');
// 	var req = this.request;
//   	var res = this.response;
//   	res.end('hello from the server\n');
// 	//this.response.end();
// }, {
// 	where: "server"
// });

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
		return userId;
	},
	remove: function(userId, file) {
		return userId;
	}
});