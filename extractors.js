var twitter_profile = require('twitter-profile')

var extractors = module.exports = {
	github:function(provider, packet, done){
		var data = packet.data;
		done(null, {
			name:data.name,
			id:data.login,
			image:data.avatar_url,
			email:data.email
		})
	},
	dropbox:function(provider, packet, done){
		var data = packet.data;
		done(null, {
			name:data.display_name,
			id:data.uid,
			email:data.email
		})
	},
	google:function(provider, packet, done){
		var data = packet.data;
		done(null, {
			name:data.name,
			id:data.id,
			image:data.picture
		})
	},
	facebook:function(provider, packet, done){
		var data = packet.data;
		done(null, {
			id:data.id,
			name:data.name,
			image:'http://graph.facebook.com/' + data.id + '/picture'
		})
	},
	twitter:function(provider, packet, done){

		var profile = packet.data;
		var options = {
			username:profile.screen_name,
			userid:profile.user_id,
			oauth_token:packet.token,
			oauth_secret:packet.secret,
			consumer_key:provider.id,
			consumer_secret:provider.secret
		}

		twitter_profile(options, function(error, twitteruser){

			if(error){
				return done(error);
			}
			
			done(null, {
				id:profile.user_id,
				image:twitteruser.profile_image_url,
				name:profile.screen_name
			});
		})
		
	}
}