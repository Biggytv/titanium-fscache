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

	Ti.API.info('[FSCACHE] Checking Files: [' + count + '] object(s) expired');
};

current_timestamp = function() {
	var value = Math.floor(new Date().getTime() / 1000);
	Ti.API.info("[FSCACHE] Timestamp Update " + value);
	return value;
};

get = function(key) {
	var db = Titanium.Database.open('cache');

	var rs = db.execute('SELECT value FROM cache WHERE key = ?', key);
	var result = null;
	if (rs.isValidRow()) {
		Ti.API.info('[FSCACHE] File Reference HIT, key[' + key + ']');
		result = JSON.parse(rs.fieldByName('value'));
	} else {
		Ti.API.info('[FSCACHE] File Reference MISS, key[' + key + ']');
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
	Ti.API.info('[FSCACHE] File Reference PUT: time=' + current_timestamp() + ', expires_in=' + expires_in);
	var query = 'INSERT OR REPLACE INTO cache (key, value, expiration) VALUES (?, ?, ?);';
	db.execute(query, key, JSON.stringify(value), expires_in);
	db.close();
};

exports.process = function(url, time, name, callback) {
	//Check if on Cache
	var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, name + '.txt');
	Ti.API.info("Called: url " + url + " time " + time + " name " + name);
	if (!get(url)) {
		if (f.exists()) {
			f.deleteFile();
		}
		Ti.API.info('[FSCACHE] REQUESTING ' + url);
		//Start Network Connection
		var xhr = Ti.Network.createHTTPClient();

		xhr.onload = function(e) {
			Ti.API.info("[FSCACHE] Pull from Web " + this.responseText);
			try {
				put(url, name + '.txt', time);
				var string = JSON.stringify(this.responseText);
				if (!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(string.replace(/"(\\.|[^"\\])*"/g, '')))) {
					Ti.API.info("[FSCACHE] JSON TEST: VALID");
					f.write(this.responseText);
					callback(JSON.parse(this.responseText));
				} else {
					Ti.API.info("[FSCACHE] JSON TEST: INVALID, KILLING RETRIEVAL OPERATION");
				}
			} catch(e) {
				//error happened
				Ti.API.info(e);
			}
		};
		xhr.open("GET", url);
		xhr.send();
	} else {
		Ti.API.info('[FSCACHE] Pull from FileSystem ' + name + ".txt");
		var contents = f.read();
		var contentsJSON = JSON.stringify(contents);
		if (!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(contentsJSON.replace(/"(\\.|[^"\\])*"/g, '')))) {
			Ti.API.info("[FSCACHE] JSON TEST: VALID");
			callback(JSON.parse(this.responseText));
		} else {
			Ti.API.info("[FSCACHE] JSON TEST: INVALID, KILLING RETRIEVAL OPERATION");
		}
		Ti.API.info("Inspecting Object: contents:" + contents);
		for (var thing in contents) {
			Ti.API.info("contents." + thing + " = " + contents[thing]);
		}
	}
};

//Starting Code
var db = Titanium.Database.open('cache');
db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT UNIQUE, value TEXT, expiration INTEGER)');
db.close();
setInterval(expire_cache, 60000); 