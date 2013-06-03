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

//Export Functons
exports.process = function(url, time, name, callback2) {
	//Error Checking
	if (url == undefined) {
		throw "fsCache did not receive a URL. Please specify one in your call.";
	} else if (time == undefined) {
		throw "fsCache did not receive a time. Please specify one in your call.";
	} else if (isNaN(time)) {
		throw "fsCache received a non-numeric time. Time needs a number of seconds, such as 60 or 180.";
	} else if (time < 0) {
		throw "fsCache received a negative time. Time must be positive.";
	} else if (name == undefined) {
		throw "fsCache did not receive a file name. Please specify one in your call.";
	} else if (callback2 == undefined) {
		throw "fsCache did not receive a callback function. Please specify one in your call.";
	} else {
		Ti.API.info("[FSCACHE] Initial Error Detection Complete, No Errors Found");
	}
	//End of Error Checking
	//Check if on Cache
	var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, name + '.txt');
	var contents = f.read();
	if (!get(url)) {
		if (f.exists()) {
			Ti.API.info("[FSCACHE] Outdated " + name + ".txt Exists, Deleting");
			f.deleteFile();
		}
		Ti.API.info('[FSCACHE] REQUESTING ' + url);
		//Start Network Connection
		var xhr = Ti.Network.createHTTPClient();

		xhr.onload = function(e) {
			Ti.API.info("[FSCACHE] Pulled from Remote Source: " + this.responseText);
			try {
				put(url, name + '.txt', time);
				var string = JSON.stringify(this.responseText);
				if (!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(string.replace(/"(\\.|[^"\\])*"/g, '')))) {
					Ti.API.info("[FSCACHE] JSON TEST: VALID");
					f.write(this.responseText);
					callback2(JSON.parse(this.responseText));
				} else {
					Ti.API.info("[FSCACHE] JSON test failed, going to try and return raw text.");
				}
			} catch(e) {
				try {
					Ti.API.info("[FSCACHE] Error, Possibly With Parsing JSON, Attempting to Return Raw Text");
					Ti.API.info(e);
					try {
					callback2(this.responseText);
					}
					catch(e) {
						Ti.API.info(e);
						throw "fsCache is unable to return data.";
					}
				} catch(f) {
					Ti.API.info("[FSCACHE] Error Returning Response Text, Retrieval Failed");
					Ti.API.info(f);
				}
			}
		};
		xhr.open("GET", url);
		xhr.send();
	} else {
		Ti.API.info('[FSCACHE] Pull from FileSystem ' + name + ".txt");
		Ti.API.info("[FSCACHE] Inspecting Object: contents:" + contents);
		for (var thing in contents) {
			Ti.API.info("contents." + thing + " = " + contents[thing]);
		}
		var contentsJSON = JSON.stringify(contents);
		if (!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(contentsJSON.replace(/"(\\.|[^"\\])*"/g, '')))) {
			try {
				Ti.API.info("[FSCACHE] Attempting to Return JSON");
				callback2(JSON.parse(contents.text));
			} catch(e) {
				Ti.API.info("[FSCACHE] Failed, Returning Raw Text");
				Ti.API.info(e);
				try {
					callback2(contents.text);
				} catch(e) {
					throw "fsCache is unable to return data."
				}
			}
		} else {
			Ti.API.info("[FSCACHE] JSON TEST: INVALID, KILLING RETRIEVAL OPERATION");
		}
	}
};

//Starting Code
var db = Titanium.Database.open('cache');
db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT UNIQUE, value TEXT, expiration INTEGER)');
db.close();
expire_cache();
setInterval(expire_cache, 10000);
