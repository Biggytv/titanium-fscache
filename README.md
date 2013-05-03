titanium-fscache
================
By Anthony Jesmok with contributions from Quinn Madson.

This library allows for caching and storage of remote JSON data. It uses a combination of an SQLite database, the device filesystem, and the remote data source for efficient caching.

titanium-fscache is perfect for interacting with large amounts of remote data. We tested this function with a remote JSON source of over 25,000 characters, and performance was outstanding.

How to Use
================
If you don't already have a lib folder in your app directory, create one. Then, place fscache.js inside of it.

On pages where you want to use, include 