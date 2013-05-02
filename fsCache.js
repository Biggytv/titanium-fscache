//Functions
expire_cache = function() {
	var db = Titanium.Database.open('cache');
	var timestamp = current_timestamp();

	// count how many objects will be deleted
	var count = 0;
	var rs = db.execute('SELECT COUNT(*) FROM cache WHERE expiration <= ?', timestamp);
	while (rs.isValidRow()) {
		count = rs.field(0);
		rs.next();
	}
	rs.close();

	// deletes everything older than timestamp
	db.execute('DELETE FROM cache WHERE expiration <= ?', timestamp);
	db.close();

	Ti.API.debug('[CACHE] EXPIRATION: [' + count + '] object(s) expired');
};

current_timestamp = function() {
	var value = Math.floor(new Date().getTime() / 1000);
	Ti.API.debug("[CACHE] current_timestamp=" + value);
	return value;
};

get = function(key) {
	var db = Titanium.Database.open('cache');

	var rs = db.execute('SELECT value FROM cache WHERE key = ?', key);
	var result = null;
	if (rs.isValidRow()) {
		Ti.API.info('[CACHE] HIT, key[' + key + ']');
		result = JSON.parse(rs.fieldByName('value'));
	} else {
		Ti.API.info('[CACHE] MISS, key[' + key + ']');
	}
	rs.close();
	db.close();

	return result;
};

put = function(key, value, expiration_seconds) {
	if (!expiration_seconds) {
		expiration_seconds = 300;
	}
	var expires_in = current_timestamp() + expiration_seconds;
	var db = Titanium.Database.open('cache');
	Ti.API.info('[CACHE] PUT: time=' + current_timestamp() + ', expires_in=' + expires_in);
	var query = 'INSERT OR REPLACE INTO cache (key, value, expiration) VALUES (?, ?, ?);';
	db.execute(query, key, JSON.stringify(value), expires_in);
	db.close();
};

exports.process = function(url, time, name, callback) {
	//Check if on Cache
	var f = Ti.Filesystem.getFile(Ti.Filesystem.tempDirectory, name + '.txt');
	Ti.API.info("Called: url " + url + " time " + time + " name " + name);
	if (!get(url)) {
		if (f.exists()) {
			f.deleteFile();
			f.createFile();
		}
		Ti.API.info('[API PULL] REQUESTING ' + url);
		//Start Network Connection
		var xhr = Ti.Network.createHTTPClient();

		xhr.onload = function(e) {
			Ti.API.info("[API PULL] HTTP " + this.responseText);
			try {
				put(url, name + '.txt', time);
				f.write(this.responseText);
				callback(JSON.parse(this.responseText));
				//return JSON.parse(this.responseText);
			} catch(e) {
				//error happened
				Ti.API.info(e);
			}
		};
		xhr.open("GET", url);
		xhr.send();
	} else {
		Ti.API.info('[API PULL] FileSystem ' + url);
		var contents = f.read();
		Ti.API.info("Inspecting Object: contents:" + contents);
		for (var thing in contents) {
			Ti.API.info("contents." + thing + " = " + contents[thing]);
		}
		callback(JSON.parse(contents.text));
	}
};


//Starting Code
var cache_expiration_interval = 60;
var db = Titanium.Database.open('cache');
db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT UNIQUE, value TEXT, expiration INTEGER)');
db.close();
Ti.API.info('[CACHE] INITIALIZED');
Ti.API.info('[CACHE] Will expire objects each ' + cache_expiration_interval + ' seconds');