var MongoClient = require('mongodb').MongoClient;

module.exports = {
	helper: function (action) {
		var url = 'mongodb://im:aceimdbauser@ds054288.mongolab.com:54288/aceim';
		MongoClient.connect(url, function (err, db) {
			if(err){
				return action(null);
			}
			action(db, function(){
				db.close();
			});
		});
	}
}