/*
	Colorhunt - Product Hunt Color visualizer - colorhunt.js
    by 2014 Sergio Majluf

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

*/

var express = require('express');
var http = require('http');
var https = require('http');
var path = require('path');
var app = express();




module.exports = function(app) {
	var twitter = require('twitter');
	/*twitter verification*/
	var OAuth = require('oauth').OAuth
		, otw = new OAuth(
		"https://api.twitter.com/oauth/request_token",
		"https://api.twitter.com/oauth/access_token",
		"ugxFQRHNA9HUbzUYiqIsgsld2",
		"UHr0J7i9zfnaJPKTWJ1U2dropFagCmH0yxO8qTmvWVBFQbojBF",
		"1.0",
		"http://localhost:3030/auth/twitter/callback",
		"HMAC-SHA1"
		);

	app.get('/auth/twitter', function(req, res) {
   
		otw.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
	   
		  req.session.oauthtw = {
			token: oauth_token,
			token_secret: oauth_token_secret
		  };
		  res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
		}
	  );

	});

	app.get('/auth/twitter/callback', function(req, res) {
	  if (req.session.oauthtw) {
		req.session.oauthtw.verifier = req.query.oauth_verifier;
		var oauth_data = req.session.oauthtw;

		otw.getOAuthAccessToken(
		  oauth_data.token,
		  oauth_data.token_secret,
		  oauth_data.verifier,
		  function(error, oauth_access_token, oauth_access_token_secret, results) {
			if (error) {
			  console.log(error);
			  res.send("Authentication Failure!");
			}
			else {
			  req.session.ottw = oauth_access_token;
			  req.session.ottws = oauth_access_token_secret;
				res.redirect('/');
			}
		  }
		);
	  }
	  else {
		res.redirect('/'); // Redirect to login page
	  }
	});
	
	app.get('/', function(req, res) {
		res.render('index', {oauth:req.session.ottw, oauths:req.session.ottws});
		//res.render('index');
	});
	
	app.get('/p/:lid', function(req, res) {
		var lid = req.params.lid
		res.render('index', {oauth:req.session.ottw, oauths:req.session.ottws, lid:lid});
	});
	
	

	
	var getproduct = function(id, cb){
		var request = require('request');

		var options = {
			url: 'https://api.producthunt.com/v1/posts/' + id,
			headers: {
				'Authorization': 'Bearer 26c84627703443779d7d78e4a57f4224ec4ce6b1b879ff015c1539f2be0f660a'
			}
		};

		function callback(error, response, body) {
				if (!error && response.statusCode == 200) {
					var info = JSON.parse(body);
					cb(info);
				}
		}

		request(options, callback);
	}
	
	var getvotes = function(id, older, cb){
		if(older != 'none'){
			var request = require('request');
			var options = {
				url: 'https://api.producthunt.com/v1/posts/' + id + '/votes?per_page=50' + older,
				headers: {
					'Authorization': 'Bearer 06426305dfb503b3fe21f348220f4dc9657869bc3811c1359d52a926e75fe5d0'
				}
			};
			
			function callback(error, response, body) {
					if (!error && response.statusCode == 200) {
						var info = JSON.parse(body);
						info = info.votes;
						cb(info);
					}
			}

			request(options, callback);
		} else {
			cb();
		}
	}

	
	
	app.get('/hunt/all', function(req, res) {
		getproduct('', function(data){
			data = data.posts;
			res.send(data);
		});
	});
	
	var freq = function(arr) {
		var array = arr;
		var a = [], c = [], prev;

		arr.sort();
		for ( var i = 0; i < arr.length; i++ ) {
			if ( arr[i] !== prev ) {
				a.push(arr[i]);
				c.push(1);
			} else {
				c[c.length-1]++;
			}
			prev = arr[i];
		}
		var frequency = {}, value;

		// compute frequencies of each value
		for(var i = 0; i < array.length; i++) {
			value = array[i];
			if(value in frequency) {
				frequency[value]++;
			}
			else {
				frequency[value] = 1;
			}
		}

		// make array from the frequency object to de-duplicate
		var uniques = [];
		for(value in frequency) {
			uniques.push(value);
		}

		// sort the uniques array in descending order by frequency
		function compareFrequency(a, b) {
			return frequency[b] - frequency[a];
		}

		return [uniques.sort(compareFrequency), c.sort(function(a, b) {return b - a})];
	}
	
	var convert = function(data) {
		var re = data;
		if(data >= 1000){
		
			re = Math.round(10*(data/1000))/10 + 'K'
		}
		if(data >= 1000000){
			re = Math.round(10*(data/1000000))/10 +'M'
		}
		return re;
	}
	
	app.get('/stats/posts', function(req, res) {
		if(req.param('term') != undefined && req.param('term') != '' ){
			term = req.param('term');
		} else {
			term = 'producthunt';
		}
		var twit = new twitter({
			consumer_key: 'KEY',
			consumer_secret: 'KEY_S',
			access_token_key: req.session.ottw,
			access_token_secret: req.session.ottws
		});
		
		twit.get('https://api.twitter.com/1.1/search/tweets.json', {include_entities:true, q:term, count:100}, function(twe) {
			var treach = 0;
			var rts = 0;
			twe = twe.statuses;
			for(var i = 0; i < twe.length; i++){
				treach = treach + twe[i].user.followers_count
				rts = rts + twe[i].retweet_count;
			}
			res.send({reach:convert(treach), retweets:convert(rts), status:twe});
		});
	});
	
	var gender = require('node-gender');
	var stripCommon = require('strip-common-words');

	app.get('/stats/vote', function(req, res) {
			var older = collor = '';
			var total = 0;
			if(req.param('next') != undefined && req.param('next') != '' ){
				older = '&older=' +req.param('next');
			} else {
				older = '';
			}
			if(req.param('total') != undefined && req.param('total') != '' ){
				total = parseFloat(req.param('total'));
			}
			if(req.param('id') != undefined && req.param('id') != '' ){
				id = req.param('id');
			} else {
				id = 5496;
			}
			var followers = [];
			var descriptions = []
			var locations = [];
			var info = [];
			var sex = {male:0, female:0, other:0};
			var i = 0;
			var interests = [];
			
			(function loop() {
				if (i < total) {
					getvotes(id, older, function(data){
						if(data != undefined){
						if(data.length === 50){
							older = '&older=' +data[49].id;
						} else{
							older = 'none';
						}
						info = info.concat(data);
						}
						i++;
						if(i === total){
							data = info;					
							for(var j = 0; j < data.length; j++){
								name = data[j].user.name;
								var firstWord = name.split(' ');
								if(gender.find(firstWord[0]) === 'male'){
									sex.male = sex.male + 1;
								} else if(gender.find(firstWord[0]) === 'female') {
									sex.female = sex.female + 1;
								} else {
									sex.other = sex.other + 1;
								}
								
								if(data[j].user.headline != undefined || data[j].user.headline != null){
								 if(data[j].user.headline.toLowerCase().indexOf('entrepreneur') != -1){
									descriptions.push('Entrepreneur');
								 } else if(data[j].user.headline.toLowerCase().indexOf('vc') != -1 || data[j].user.headline.toLowerCase().indexOf('venture capital') != -1){
									descriptions.push('Venture Capitalist');
								 } else if(data[j].user.headline.toLowerCase().indexOf('ceo') != -1){
									descriptions.push('CEO');
								 } else if(data[j].user.headline.toLowerCase().indexOf('cofounder') != -1 ||  data[j].user.headline.toLowerCase().indexOf('founder') != -1){
									descriptions.push('Founder');
								 } else if(data[j].user.headline.toLowerCase().indexOf('sales') != -1   || data[j].user.headline.toLowerCase().indexOf('marketer') != -1 ||  data[j].user.headline.toLowerCase().indexOf('market') != -1 || data[j].user.headline.toLowerCase().indexOf('growth') != -1){
									descriptions.push('Sales/Marketing');
								 } else if(data[j].user.headline.toLowerCase().indexOf('cto') != -1){
									descriptions.push('CTO');
								 }  else if(data[j].user.headline.toLowerCase().indexOf('product') != -1){
									descriptions.push('Product Manager');
								 } else if(data[j].user.headline.toLowerCase().indexOf('developer') != -1|| data[j].user.headline.toLowerCase().indexOf('engineer') != -1){
									descriptions.push('Engineer');
								 } else if(data[j].user.headline.toLowerCase().indexOf('art') != -1 || data[j].user.headline.toLowerCase().indexOf('design') != -1 || data[j].user.headline.toLowerCase().indexOf('designer') != -1){
									descriptions.push('Designer');
								 } else if(data[j].user.headline.toLowerCase().indexOf('consultant') != -1){
									descriptions.push('Consultant');
								 } else if(data[j].user.headline.toLowerCase().indexOf('investor') != -1){
									descriptions.push('Investor');
								 } else if(data[j].user.headline.toLowerCase().indexOf('Head') != -1 || data[j].user.headline.toLowerCase().indexOf('operations') != -1 || data[j].user.headline.toLowerCase().indexOf('manager') != -1){
									descriptions.push('Management');
								 } else if(data[j].user.headline.toLowerCase().indexOf('writer') != -1  || data[j].user.headline.toLowerCase().indexOf('journalist') != -1 || data[j].user.headline.toLowerCase().indexOf('blogger') != -1){
									descriptions.push('Writer/Media');
								 } else if(data[j].user.headline.toLowerCase().indexOf('professor') != -1 || data[j].user.headline.toLowerCase().indexOf('teacher') != -1){
									descriptions.push('Educator');
								 } else{
									descriptions.push('Other');
								 }
								 } else {
									descriptions.push('Other');
								 }
								
								if(j < 99){
									collor += data[j].user.username
									collor += ','
								}
							}
							if(data.length != 0){
								
								var twit = new twitter({
											consumer_key: 'ugxFQRHNA9HUbzUYiqIsgsld2',
											consumer_secret: 'UHr0J7i9zfnaJPKTWJ1U2dropFagCmH0yxO8qTmvWVBFQbojBF',
											access_token_key: req.session.ottw,
											access_token_secret: req.session.ottws
										});
									
								
								  twit.get('https://api.twitter.com/1.1/users/lookup.json', {include_entities:true, screen_name:collor}, function(twe) {
									if(twe != undefined && twe[0] != undefined){
									for(var i = 0; i < twe.length; i++){
										if(twe[i].location != undefined && twe[i].location != ''){
											mardo = twe[i].location;
												
											 if(twe[i].location.toLowerCase().indexOf('sf') != -1 || twe[i].location.toLowerCase().indexOf('san fran') != -1 || twe[i].location.toLowerCase().indexOf('san francisco, ca') != -1){
												mardo = 'San Francisco, CA'
											 } else if(twe[i].location.toLowerCase().indexOf('nyc') != -1 || twe[i].location.toLowerCase().indexOf('new york, ny') != -1 || twe[i].location.toLowerCase().indexOf('new york city') != -1){
												mardo = 'New York City, NY'
											 } else if(twe[i].location.toLowerCase().indexOf('angeles') != -1 || twe[i].location.toLowerCase().indexOf('los angeles') != -1){
												mardo = 'Los Angeles, CA'
											 } else if(twe[i].location.toLowerCase().indexOf('london') != -1 || twe[i].location.toLowerCase().indexOf('lhr') != -1){
												mardo = 'London'
											 }

											locations = (locations + '~' + mardo);
										}
										// interests
										if(twe[i].description != undefined){
											interests = interests.concat((stripCommon(twe[i].description).toLowerCase().replace(/[^\w\s]|_'"/g, "").replace(' a ', "").replace('the', "")).split(' ')); //for some reason the and a didn't get deleted
											
										}
										 followers.push([twe[i].screen_name, twe[i].name, twe[i].followers_count, twe[i].followers_count, twe[i].profile_image_url, data[i].user.votes_count, data[i].user.posts_count, data[i].user.maker_of_count]);
										 
										 
									}
									followers.sort(function(a, b) {return b[2] - a[2]})
									for(var i = 0; i < followers.length; i++){
										followers[i][2] = convert(followers[i][2]);
									}
									location = freq(interests);
									location[0].splice(0, 1) // removes the '' element, will change later
									location[1].splice(0, 1) // removes the '' element, will change later
									res.send({locations:freq(locations.split('~')), interests:location, descriptions:freq(descriptions), followers:followers, sex:sex});
									} else {
										res.send({error:true});
									}
								  });
							} else {
								res.send('none');
							} 
						}
						loop();
					});
				}
			}());
			
			
	});
	
	
	//database
	var crypto 		= require('crypto');
	var MongoDB 	= require('mongodb').Db;
	var Server 		= require('mongodb').Server;
	var moment 		= require('moment');
	var ObjectID = require('mongodb').ObjectID

	var connection_string = 'cs';

	

		var mongojs = require('mongojs');
		var db = mongojs(connection_string, ['products']);
	
	/*
		getproduct('', function(data){
			data = data.posts;
			res.send(data);
		});
		graph.find().toArray(
			function(e, res) {
			if (e){ 
				callback(e);
			} else { 
				}
		})
		graph.findOne({id:store.id}, function(e, o) {
			if (o){
				callback('full')
			}	else{
				graph.insert(store, {safe: true}, callback);
			}
		});
	*/
	
	var products = db.collection('products');

	var cronJob = require('cron').CronJob;
	
	
		
	var ampm = function(hour){
		if(hour <= 11){
			hour = hour + 'am'
		} else if(hour === 0){
			hour = '12am'
		} else if(hour === 12){
			hour = '12pm'
		} else {
			hour = (hour - 12) + 'pm'
		}
		return hour;
	}
   
	
	//update tracker + create tracker
	var job2 = new cronJob({
	  cronTime: '5 * * * *',
	  onTick: function() {	
		getproduct('', function(data){
			
			data = data.posts;
			var i = 0;
			
			(function loope() {
				
				if (i < data.length) {
					products.findOne({id:data[i].id}, function(e, o) {
						console.log('cron');
						if (o){
							
							o.votes[o.votes.length] = data[i].votes_count;
							var hour = moment().valueOf();
							o.time[o.time.length] = hour;
							products.save(o, {safe: true}, function(err) {
								i++
								loope();
							});	
						} else {
							o = {};
							o.votes = [];
							o.time = [];
							o.votes[0] = data[i].votes_count;
							var hour = moment().valueOf();
							o.time[0] = hour;
							o.id = data[i].id;
							o.name = data[i].name;
							products.insert(o, {safe: true}, function(err) {
								
								i++
								loope();
							});
						}
					});
				}
			})();
			
		});
	  },
	  start: true,
	});
	job2.start();

	
	app.get('/hunt', function(req, res) {
		if(req.param('id') != undefined && req.param('id') != '' ){
			id = req.param('id');
		} else {
			id = 5496;
		}
		getproduct(id, function(data){
			products.findOne({id:parseFloat(id)}, function(e, o) {
					data = data.post;
					if (o){
						data.vote_historical = o.votes;
						data.times = o.time;
					}
					res.send(data);
				
			});
		});
	});
	
	app.get('/hunt/:id', function(req, res) {
		if(req.param('id') != undefined && req.param('id') != '' ){
			id = req.param('id');
		} else {
			id = 9501;
		}
		getproduct(id, function(data){
			products.findOne({id:parseFloat(id)}, function(e, o) {
					data = data.post;
					if (o){
						data.vote_historical = o.votes;
						data.times = o.time;
					}
					res.send(data);
				
			});
		});
	});
	
	app.get('/color', function(req, res) {
		var product_thumbnails = [];
		getproduct('', function(data){
			data = data.posts;
			//res.send(data);
			console.log(data);

			res.render('color',
	        {
		        products : data,
			});
		});
	});

		
}
