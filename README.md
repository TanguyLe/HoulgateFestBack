# HoulgateFest - Back

This repository hosts the code for the backend of the HoulgateFest website. It is a full Javascript application
written in node.js + express, with
authentication/logging and whose main feature is to be able to "shotgun" (reserve) a room in a house.

It is meant to work alongside its frontend : https://github.com/TanguyLe/HoulgateFestFront.

## Installation
### Prerequisites
1. Node and npm installed, recommended versions are node 12.13.1 and npm 6.12.1.
2. Repo cloned.
3. MongoDB installed and started, recommended version is 3.6.17. You can also use a remote mongodb.
4. Get the credential files from the project's owner. (those are secret files not hosted on git)

### Packages
Just use `npm install` within the project directory and you're good to go !

## Usage
If you use a local mongodb, make sure the service for the db runs by using `sudo service mongod start`.

By default, all the operations are performed to `mongodb://localhost/Userdb`. However, you can change the
target db by two ways :
1. Dev setup : just change the `package.json` commands to put your
mongo connection string instead of `mongodb://localhost/Userdb`. Does not work if `NODE_ENV=production`.
2. Prod setup : With `NODE_END=production` the connection must
be set in `MONGO_CONNECTION` env variable, regardless of what is in th command line.

You may want to perform the DB operations 1 to 3 before starting (see below).
The following commands are all defined using npm scripts from the package.json.

All the backend servers are served by default at http://localhost:3000/.

### Database operations
1. `npm run initDB`: Fills the db with the data of the house (rooms) and the editions.
To be executed only once (static data).
2. `npm run createTestRecords`: Fills the db with some test records
(users & trips) whose data is [here](./scripts/scriptsUtils.js).
3. `npm run removeTestRecords`: Cleans the db by removing eventual
test records (users, shotguns & trips from test users).
4. `npm run removeTestShotguns`: Removes only test shotguns.

A developer would usually do 1 only once, sometimes 2-3 and often 4 to retry new shotgun combinations.

### Development
1. `npm run dev`: Hot-reloading web server for development.
2. `npm run devStartShotgun`: The same as 1, but modified so that shotguns are possible even
if the shotgun date is not reached.

#### Prod
1. `npm run start` Starts a production server.
