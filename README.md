titanium-fscache
================
By Anthony Jesmok with contributions from Quinn Madson.

This library allows for caching and storage of textual remote data. It uses a combination of a local SQLite database, the device filesystem, and your remote data source for efficient caching.

fsCache is perfect for interacting with large amounts of remote data. We tested this function with a remote JSON source of over 25,000 characters, and performance was outstanding.

How to Use
================
If you don't already have a lib folder in your app directory, create one. Then, place fscache.js inside of it.

On pages where you want to use fscache, include it using a statement like this.

var fscache = require('fscache');

Then, you can call fscache to start returning your data using its process function in the following fashion:

var yourVariableNameHere = fsCache.process(url, time, fileName, callback);

What is each variable that is passed in?
url = The URL of the remote data source.
time = The amount of time (in seconds) to keep the data stored on the device.
fileName = The name of the file that will be saved on the file system.
callback = A function to be called after data retrieval is complete. The retrieved data will be passed into this function.

What Does It Return?
================
If you are retrieving a JSON array, fsCache will automatically parse this array for you and return it.

If you are not retrieving a JSON array, or if there is an error parsing JSON, the data source's remote text will be returned unformatted. Therefore, fsCache is perfect for storing any type of text data.